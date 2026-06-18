const { query } = require('./src/shared/database');
require('dotenv').config();
query('SELECT id, document_type, license_status FROM driver_documents LIMIT 5').then(res => { console.log(res.rows); process.exit(0); });
