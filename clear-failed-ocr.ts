import { connectDatabase, query } from './src/shared/database';
import * as dotenv from 'dotenv';
dotenv.config();

async function clearFailedOcr() {
  await connectDatabase();
  const result = await query(`
    UPDATE driver_documents 
    SET extracted_data = NULL 
    WHERE extracted_data->>'ocr_status' = 'FAILED'
  `);
  console.log(`Cleared OCR data for ${result.rowCount} documents`);
  process.exit(0);
}
clearFailedOcr().catch(console.error);
