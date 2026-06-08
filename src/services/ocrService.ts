import vision from '@google-cloud/vision';
import path from 'path';

// Initialize the Google Cloud Vision client
// The GOOGLE_APPLICATION_CREDENTIALS environment variable should point to the JSON key
const client = new vision.ImageAnnotatorClient();

export interface ExtractedData {
  extracted_number?: string;
  extracted_expiry?: string;
  extracted_name?: string;
  raw_text?: string;
  ocr_status: 'COMPLETED' | 'FAILED';
  error?: string;
}

export const extractDocumentData = async (imageUrl: string, documentType: string): Promise<ExtractedData> => {
  try {
    // Ensure imageUrl is a string
    let parsedUrl = imageUrl;
    if (typeof parsedUrl === 'string' && parsedUrl.trim().startsWith('{')) {
      try {
        parsedUrl = JSON.parse(parsedUrl);
      } catch (e) {
        // ignore
      }
    }
    
    if (typeof parsedUrl === 'object' && parsedUrl !== null) {
      imageUrl = (parsedUrl as any).front || (parsedUrl as any).url || (parsedUrl as any).back || '';
    }

    if (typeof imageUrl !== 'string' || !imageUrl) {
      return { ocr_status: 'FAILED', error: 'Invalid image URL format' };
    }

    console.log(`Starting OCR for ${documentType}: ${imageUrl}`);
    
    let fetchUrl = imageUrl;
    if (fetchUrl.startsWith('/')) {
      fetchUrl = `http://localhost:1234${fetchUrl}`;
    }

    let requestBody: any = fetchUrl;
    
    if (fetchUrl.startsWith('http')) {
      try {
        const axios = require('axios');
        const response = await axios.get(fetchUrl, { 
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
            'Referer': 'http://localhost:5173/',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          }
        });
        const buffer = Buffer.from(response.data, 'binary');
        requestBody = { image: { content: buffer } };
      } catch (err: any) {
        console.error('Failed to download image for OCR:', err.message);
        return { ocr_status: 'FAILED', error: err.message };
      }
    }

    // Perform text detection
    const [result] = await client.textDetection(requestBody);
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      console.log('No text detected in the image.');
      return { ocr_status: 'FAILED', error: 'No text detected' };
    }

    const rawText = detections[0].description || '';
    const extractedData: ExtractedData = {
      raw_text: rawText,
      ocr_status: 'COMPLETED'
    };

    // Replace newlines and extra spaces for easier regex parsing
    const normalizedText = rawText.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    // 1. AADHAR Extraction
    const docTypeLower = documentType.toLowerCase();
    if (docTypeLower.includes('aadhar') || docTypeLower.includes('aadhaar')) {
      // Look for 12 digits, possibly with spaces e.g., 1234 5678 9012 or 123456789012
      const aadharMatch = normalizedText.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
      if (aadharMatch) {
        extractedData.extracted_number = aadharMatch[0].replace(/\s/g, ''); // normalize to 12 digits
      }
    }

    // 2. PAN Extraction
    else if (documentType.toLowerCase().includes('pan')) {
      // Look for 5 letters, 4 numbers, 1 letter
      const panMatch = normalizedText.match(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/i);
      if (panMatch) {
        extractedData.extracted_number = panMatch[0].toUpperCase();
      }
    }

    // 3. DRIVING LICENSE Extraction (Indian format variations)
    else if (documentType.toLowerCase().includes('license') || documentType.toLowerCase().includes('dl')) {
      // e.g., TN01 20010000000 or TN0120010000000
      const dlMatch = normalizedText.match(/\b[A-Z]{2}[0-9]{2}[\s-]?[0-9]{11}\b/i);
      if (dlMatch) {
        extractedData.extracted_number = dlMatch[0].replace(/[\s-]/g, '').toUpperCase();
      }
    }

    // 4. VEHICLE RC Extraction
    else if (documentType.toLowerCase().includes('rc') || documentType.toLowerCase().includes('vehicle')) {
      // e.g., TN 01 AB 1234
      const rcMatch = normalizedText.match(/\b[A-Z]{2}\s?[0-9]{2}\s?[A-Z]{1,2}\s?[0-9]{4}\b/i);
      if (rcMatch) {
        extractedData.extracted_number = rcMatch[0].replace(/\s/g, '').toUpperCase();
      }
    }

    // Attempt to extract Expiry Date ONLY for driving licenses
    if (documentType.toLowerCase().includes('license') || documentType.toLowerCase().includes('dl')) {
      // Looks for DD/MM/YYYY or DD-MM-YYYY formats
      const dateMatches = normalizedText.match(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/g);
      if (dateMatches && dateMatches.length > 0) {
        // If multiple dates (like DOB and Expiry, expiry is usually later)
        // For simplicity, we just grab the last date found or a date after 2024
        // A more robust implementation would check for keywords like "Valid Till"
        let maxTime = 0;
        let maxDateStr = dateMatches[dateMatches.length - 1]; // fallback

        for (const d of dateMatches) {
          // Parse DD-MM-YYYY or DD/MM/YYYY
          const parts = d.split(/[\/\-]/);
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const time = new Date(year, month, day).getTime();
            if (time > maxTime) {
              maxTime = time;
              maxDateStr = d;
            }
          }
        }
        
        extractedData.extracted_expiry = maxDateStr;
      }
    }

    console.log('Extracted Data:', extractedData);
    return extractedData;
    
  } catch (error) {
    console.error('Error during Google Cloud Vision OCR:', error);
    return { ocr_status: 'FAILED' };
  }
};
