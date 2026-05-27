import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { logger } from './shared/logger';
dotenv.config();

async function apply() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await client.connect();
    logger.info('Connected to database.');

    await client.query('BEGIN');

    // 1. Create sequence
    await client.query('CREATE SEQUENCE IF NOT EXISTS driver_vdid_seq');
    logger.info('Sequence created/verified.');

    // 2. Add column
    await client.query(`
      ALTER TABLE drivers 
      ADD COLUMN IF NOT EXISTS vdrive_id VARCHAR(20) UNIQUE
    `);
    logger.info('Column vdrive_id added/verified.');

    // 3. Set default
    await client.query(`
      ALTER TABLE drivers 
      ALTER COLUMN vdrive_id 
      SET DEFAULT 'VDD-' || LPAD(nextval('driver_vdid_seq')::text, 4, '0')
    `);
    logger.info('Default value set.');

    // 4. Populate existing
    const updateRes = await client.query(`
      UPDATE drivers 
      SET vdrive_id = 'VDD-' || LPAD(nextval('driver_vdid_seq')::text, 4, '0') 
      WHERE vdrive_id IS NULL
    `);
    logger.info(`Populated ${updateRes.rowCount} existing drivers.`);

    await client.query('COMMIT');
    logger.info('Changes committed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('ERROR_APPLYING:', err);
  } finally {
    await client.end();
  }
}

apply();
