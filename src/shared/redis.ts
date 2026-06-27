import Redis from 'ioredis';
import { logger } from './logger';
import config from '../config';

let client: Redis | null = null;
// Dedicated subscriber connection. A connection in subscriber mode cannot run
// normal commands, so pub/sub subscriptions must NOT share the main client.
let subClient: Redis | null = null;

const redisOptions = {
  lazyConnect: true,
  // Finite (not null): when Redis is unreachable a command REJECTS after a few
  // retries instead of queueing forever, so callers' try/catch actually fire.
  maxRetriesPerRequest: 3,
  // Hard ceiling so a single command can never hang a request indefinitely.
  commandTimeout: 5000,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 100, 3000); // exponential backoff: 100ms → 3s cap
    logger.warn(`Redis retry attempt ${times}, reconnecting in ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    // Reconnect on READONLY errors (occurs during Redis primary failover)
    return err.message.includes('READONLY');
  },
};

const attachListeners = (c: Redis, name: string) => {
  // Mandatory: unhandled 'error' events crash Node.js
  c.on('error', (err: Error) => logger.error(`Redis ${name} error:`, err.message));
  c.on('reconnecting', () => logger.warn(`Redis ${name} reconnecting...`));
  c.on('ready', () => logger.info(`Redis ${name} ready`));
};

export const connectRedis = async (): Promise<void> => {
  if (client && subClient) return;

  client = new Redis(config.redis.url, redisOptions);
  subClient = client.duplicate(); // dedicated subscriber for the event bus

  attachListeners(client, 'client');
  attachListeners(subClient, 'subClient');

  try {
    await client.connect(); // explicit connect (lazyConnect: true)
    await subClient.connect();
    await client.ping(); // health check — mirrors SELECT NOW() in database.ts
    logger.info('✅ Connected to Redis (client + subClient)');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Redis connection failed:', errorMessage);
    client = null;
    subClient = null;
    throw new Error('Redis connection failed');
  }
};

export const disconnectRedis = async (): Promise<void> => {
  const promises: Promise<unknown>[] = [];
  if (client) promises.push(client.quit()); // graceful: QUIT, waits for ACK
  if (subClient) promises.push(subClient.quit());
  await Promise.all(promises);
  client = null;
  subClient = null;
  logger.info('Redis disconnected');
};

export const getRedisClient = (): Redis => {
  if (!client) {
    throw new Error('Redis not connected. Call connectRedis first.');
  }
  return client;
};

export const getSubClient = (): Redis => {
  if (!subClient) {
    throw new Error('Redis subClient not connected. Call connectRedis first.');
  }
  return subClient;
};

/**
 * Acquire a distributed lock using Redis SET NX
 * @param key Lock key
 * @param ttlSeconds TTL in seconds
 * @returns true if lock acquired, false otherwise
 */
export const acquireLock = async (key: string, ttlSeconds: number): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    const result = await redis.set(`lock:${key}`, 'locked', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (error) {
    logger.error(`Error acquiring lock for ${key}:`, error);
    return false;
  }
};

/**
 * Release a distributed lock
 * @param key Lock key
 */
export const releaseLock = async (key: string): Promise<void> => {
  try {
    const redis = getRedisClient();
    await redis.del(`lock:${key}`);
  } catch (error) {
    logger.error(`Error releasing lock for ${key}:`, error);
  }
};

// Usage
// import { getRedisClient } from '../../shared/redis';

// const redis = getRedisClient();
// await redis.set('session:abc', JSON.stringify(data), 'EX', 3600);
// const value = await redis.get('session:abc');
