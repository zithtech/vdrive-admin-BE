import { connectDatabase, query } from './src/shared/database';
import { extractDocumentData } from './src/services/ocrService';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  await connectDatabase();
  const docs = await query('SELECT document_url, document_type FROM driver_documents LIMIT 5');
  console.log('Docs to test:', docs.rows);
  
  for (const doc of docs.rows) {
    if (doc.document_url) {
       console.log('Testing:', doc.document_type, doc.document_url);
       const res = await extractDocumentData(doc.document_url, doc.document_type || 'Document');
       console.log('Result:', res);
    }
  }
  process.exit(0);
}
test().catch(console.error);
