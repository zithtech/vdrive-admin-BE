import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { logger } from './shared/logger';

dotenv.config();

async function check() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'drivers' AND column_name = 'vdrive_id'
    `);
    if (res.rows.length > 0) {
      logger.info('COLUMN_EXISTS:', res.rows[0]);
    } else {
      logger.info('COLUMN_MISSING');
    }
  } catch (err) {
    logger.error('ERROR_CHECKING:', err);
  } finally {
    await client.end();
  }
}
check();
