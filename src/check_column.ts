import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database');

    await client.query(`
      CREATE TABLE IF NOT EXISTS trip_verification_history (
          id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
          verification_id UUID            NOT NULL,
          driver_id       UUID            NOT NULL,
          trip_id         UUID,
          selfie_url      TEXT,
          car_image_url   TEXT,
          car_images      JSONB,
          status          VARCHAR(50),
          selfie_status   VARCHAR(50),
          car_image_status VARCHAR(50),
          event_type      VARCHAR(50)     NOT NULL,
          admin_id        UUID,
          remarks         TEXT,
          selfie_remarks  TEXT,
          car_image_remarks TEXT,
          created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_tvh_verification_id ON trip_verification_history (verification_id);
      CREATE INDEX IF NOT EXISTS idx_tvh_driver_id       ON trip_verification_history (driver_id);
      CREATE INDEX IF NOT EXISTS idx_tvh_trip_id         ON trip_verification_history (trip_id);
      CREATE INDEX IF NOT EXISTS idx_tvh_created_at      ON trip_verification_history (created_at DESC);
    `);
    console.log('trip_verification_history table created!');

    const verify = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'trip_verification_history' ORDER BY ordinal_position"
    );
    console.log('Schema:', JSON.stringify(verify.rows, null, 2));
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}
runMigration();
