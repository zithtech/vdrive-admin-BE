import dotenv from 'dotenv';
import path from 'path';
import ms from 'ms';

declare const jest: any;

// Set higher timeout for tests to accommodate Neon serverless DB scale-up time
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

// Load test environment variables
process.env.NODE_ENV = 'test';
const testEnvResult = dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });
const devEnvResult = dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('DEBUG: Dotenv .env.test loading result:', testEnvResult.error ? 'failed' : 'success');
console.log('DEBUG: Dotenv .env loading result:', devEnvResult.error ? 'failed' : 'success');
console.log('DEBUG: Loaded process.env.DB_HOST:', process.env.DB_HOST);
console.log('DEBUG: Loaded process.env.DB_NAME:', process.env.DB_NAME);

// Override production environment variables for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
process.env.DB_NAME = process.env.DB_NAME_TEST || process.env.DB_NAME || 'test_db';

console.log('DEBUG: Final process.env.DB_NAME used:', process.env.DB_NAME);

import { connectDatabase, pool } from '../shared/database';

// Global test setup
beforeAll(async () => {
  console.log('🎯 Setting up test environment...');
  try {
    await connectDatabase();
  } catch (error) {
    console.warn('⚠️ Warning: Database connection in tests setup failed:', error);
  }
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  if (pool) {
    await pool.end();
  }
});

beforeEach(async () => {
  // Clean up between tests
  // All mocks are already cleared by Jest
});
