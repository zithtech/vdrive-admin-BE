import { extractDocumentData } from './src/services/ocrService';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const result = await extractDocumentData('{"front": "https://zithtech-s3-bucket-431451850777-eu-north-1-an.s3.eu-north-1.amazonaws.com/drivers/fb1ec989-933b-46d8-b5b7-671b79f20290/aadhaar_card_1779169106037"}', 'aadhaar_card');
  console.log('Result:', result);
}
test().catch(console.error);
