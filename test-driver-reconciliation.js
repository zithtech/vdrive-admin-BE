// Test script for Driver Reconciliation Module
const axios = require('axios');

const BASE_URL = 'http://localhost:5005'; // vdrive-admin-BE server
const JWT_TOKEN = 'your-admin-jwt-token-here'; // Replace with actual admin JWT token

async function testDriverReconciliation() {
  console.log('🧪 Testing Driver Reconciliation Module...\n');

  // Sample driver data payload (as specified by user - no Excel file)
  const samplePayload = {
    filename: 'driver_reconciliation_batch_001.csv', // Virtual filename since no Excel
    data: [
      {
        driver_name: 'Rajesh Kumar',
        phone: '+919876543210',
        mail: 'rajesh.kumar@example.com',
        pincode: '110001',
        dob: '1990-05-15',
        area: 'Connaught Place',
        street: 'Rajiv Chowk',
        district: 'New Delhi',
        state: 'Delhi',
        country: 'India',
      },
      {
        driver_name: 'Priya Sharma',
        phone: '+919876543211',
        mail: 'priya.sharma@example.com',
        pincode: '400001',
        dob: '1988-12-03',
        area: 'Colaba',
        street: 'Marine Drive',
        district: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      },
      {
        driver_name: 'Amit Singh',
        phone: '+919876543212',
        mail: 'amit.singh@example.com',
        pincode: '560001',
        dob: '1992-08-20',
        area: 'MG Road',
        street: 'Brigade Road',
        district: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
      },
      // Driver without email (should still be processed)
      {
        driver_name: 'Vijay Patel',
        phone: '+919876543213',
        pincode: '380001',
        dob: '1985-03-10',
        area: 'Navrangpura',
        street: 'CG Road',
        district: 'Ahmedabad',
        state: 'Gujarat',
        country: 'India',
      },
      // Invalid data (missing required fields)
      {
        driver_name: 'Invalid Driver',
        area: 'Some Area',
        district: 'Some District',
      },
    ],
  };

  try {
    // Test 1: Process reconciliation data
    console.log('📤 Processing reconciliation data...');
    const processResponse = await axios.post(
      `${BASE_URL}/api/driver-reconciliation/process`,
      samplePayload,
      {
        headers: {
          Authorization: `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Process Response:', {
      success: processResponse.data.success,
      message: processResponse.data.message,
      upload_id: processResponse.data.upload_id,
      processed_rows: processResponse.data.processed_rows,
      errors_count: processResponse.data.errors?.length || 0,
    });

    if (processResponse.data.errors && processResponse.data.errors.length > 0) {
      console.log('⚠️  Processing Errors:');
      processResponse.data.errors.forEach((error) => {
        console.log(`   Row ${error.row_index}: ${error.error_message}`);
      });
    }

    const uploadId = processResponse.data.upload_id;
    console.log('');

    // Test 2: Get upload details
    if (uploadId) {
      console.log(`📊 Getting upload details for ID: ${uploadId}...`);
      const detailsResponse = await axios.get(
        `${BASE_URL}/api/driver-reconciliation/uploads/${uploadId}`,
        {
          headers: {
            Authorization: `Bearer ${JWT_TOKEN}`,
          },
        }
      );

      console.log('✅ Upload Details:', {
        upload: {
          id: detailsResponse.data.data.upload.id,
          filename: detailsResponse.data.data.upload.filename,
          status: detailsResponse.data.data.upload.status,
          total_rows: detailsResponse.data.data.upload.total_rows,
          processed_rows: detailsResponse.data.data.upload.processed_rows,
        },
        stats: detailsResponse.data.data.stats,
      });
      console.log('');

      // Test 3: Get reconciliation rows
      console.log(`📋 Getting reconciliation rows for upload ID: ${uploadId}...`);
      const rowsResponse = await axios.get(
        `${BASE_URL}/api/driver-reconciliation/uploads/${uploadId}/rows?page=1&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${JWT_TOKEN}`,
          },
        }
      );

      console.log('✅ Reconciliation Rows:', {
        count: rowsResponse.data.data.rows.length,
        pagination: rowsResponse.data.data.pagination,
      });

      // Show sample rows
      rowsResponse.data.data.rows.slice(0, 2).forEach((row, index) => {
        console.log(`   Row ${index + 1}:`, {
          driver_name: row.driver_name,
          phone: row.phone,
          mail: row.mail,
          has_account: row.has_account,
          is_onboarded: row.is_onboarded,
          match_confidence: row.match_confidence,
          error_message: row.error_message,
        });
      });
      console.log('');

      // Test 3.5: Get all reconciliation rows (without upload ID filter)
      console.log('📋 Getting all reconciliation rows (no upload ID filter)...');
      const allRowsResponse = await axios.get(
        `${BASE_URL}/api/driver-reconciliation/rows?page=1&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${JWT_TOKEN}`,
          },
        }
      );

      console.log('✅ All Reconciliation Rows:', {
        count: allRowsResponse.data.data.rows.length,
        pagination: allRowsResponse.data.data.pagination,
      });

      // Show sample rows
      allRowsResponse.data.data.rows.slice(0, 2).forEach((row, index) => {
        console.log(`   Row ${index + 1}:`, {
          driver_name: row.driver_name,
          phone: row.phone,
          mail: row.mail,
          has_account: row.has_account,
          is_onboarded: row.is_onboarded,
          match_confidence: row.match_confidence,
          upload_id: row.upload_id,
        });
      });
      console.log('');
    }

    // Test 4: Get all uploads
    console.log('📁 Getting all uploads...');
    const uploadsResponse = await axios.get(
      `${BASE_URL}/api/driver-reconciliation/uploads?page=1&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${JWT_TOKEN}`,
        },
      }
    );

    console.log('✅ All Uploads:', {
      count: uploadsResponse.data.data.uploads.length,
      pagination: uploadsResponse.data.data.pagination,
    });
    console.log('');

    // Test 5: Get reconciliation summary
    console.log('📈 Getting reconciliation summary...');
    const summaryResponse = await axios.get(`${BASE_URL}/api/driver-reconciliation/summary`, {
      headers: {
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
    });

    console.log('✅ Reconciliation Summary:', summaryResponse.data.data);
    console.log('');

    // Test 6: Update WhatsApp campaign (if there are processed rows)
    if (uploadId && uploadsResponse.data.data.uploads.length > 0) {
      const firstUpload = uploadsResponse.data.data.uploads[0];

      // Get some row IDs to test WhatsApp campaign update
      const rowsResponse = await axios.get(
        `${BASE_URL}/api/driver-reconciliation/uploads/${firstUpload.id}/rows?page=1&limit=5`,
        {
          headers: {
            Authorization: `Bearer ${JWT_TOKEN}`,
          },
        }
      );

      const rowIds = rowsResponse.data.data.rows
        .filter((row) => row.has_account)
        .map((row) => row.id)
        .slice(0, 2); // Take first 2 matching rows

      if (rowIds.length > 0) {
        console.log(`📱 Updating WhatsApp campaign for rows: ${rowIds.join(', ')}...`);
        const whatsappResponse = await axios.post(
          `${BASE_URL}/api/driver-reconciliation/whatsapp-campaign`,
          { rowIds },
          {
            headers: {
              Authorization: `Bearer ${JWT_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('✅ WhatsApp Campaign Update:', {
          success: whatsappResponse.data.success,
          message: whatsappResponse.data.message,
          updated_rows: whatsappResponse.data.updated_rows,
        });
        console.log('');
      }
    }

    console.log('🎉 All Driver Reconciliation tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    } else if (error.request) {
      console.error('Network Error - Server not running or unreachable');
    } else {
      console.error('Error:', error.message);
    }
  }
}

// API Endpoints Summary
function showAPIEndpoints() {
  console.log('\n📚 Driver Reconciliation API Endpoints:');
  console.log('========================================');
  console.log('POST   /api/driver-reconciliation/process           - Process reconciliation data');
  console.log('GET    /api/driver-reconciliation/uploads           - Get all uploads (paginated)');
  console.log('GET    /api/driver-reconciliation/uploads/:id       - Get upload details');
  console.log('GET    /api/driver-reconciliation/uploads/:id/rows  - Get reconciliation rows');
  console.log('GET    /api/driver-reconciliation/rows              - Get all reconciliation rows');
  console.log(
    'POST   /api/driver-reconciliation/whatsapp-campaign - Update WhatsApp campaign status'
  );
  console.log('GET    /api/driver-reconciliation/summary           - Get reconciliation summary');
  console.log('');
  console.log('🔐 All endpoints require JWT authentication');
  console.log('📊 Supports pagination with ?page=1&limit=50');
  console.log('🎯 Processes driver data payload (no Excel file needed)');
}

// Run tests
async function runAllTests() {
  showAPIEndpoints();
  await testDriverReconciliation();
}

runAllTests();
