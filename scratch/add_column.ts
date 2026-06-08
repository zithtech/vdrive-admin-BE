import 'dotenv/config';
import { query, connectDatabase } from '../src/shared/database';

async function run() {
  try {
    await connectDatabase();
    console.log("Adding extracted_data column to driver_documents table...");
    await query(`ALTER TABLE driver_documents ADD COLUMN extracted_data JSONB;`);
    console.log("Column added successfully!");
  } catch (err: any) {
    if (err.code === '42701') {
      console.log("Column already exists.");
    } else {
      console.error("Error adding column:", err);
    }
  }
  process.exit(0);
}

run();
