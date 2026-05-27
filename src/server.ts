// src/server.ts
import app from './app';
import { logger } from './shared/logger';
import { connectDatabase, query } from './shared/database';
import { connectRedis, disconnectRedis } from './shared/redis';
import config from './config';

const PORT = config.port || 3000;
const dbUser = config.db.user;

import { initSocket } from './services/socket';
import { initSubscriptionScheduler } from './services/subscriptionScheduler';

async function startServer() {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');

    await connectRedis();
    logger.info('Redis connected successfully');

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${PORT}`);
    });

    initSocket(server);
    initSubscriptionScheduler();

    const shutdown = (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        await disconnectRedis();
        logger.info('Process terminated');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
