// src/modules/driver-reconciliation/driverReconciliation.repository.ts
import { query } from '../../shared/database';
import {
  DriverReconciliationUpload,
  DriverReconciliationRow,
  DriverReconciliationPayload,
  MatchResult,
} from './driverReconciliation.model';

export class DriverReconciliationRepository {
  // Create a new upload record
  static async createUpload(
    adminId: string | undefined,
    filename: string,
    totalRows: number
  ): Promise<number> {
    const result = await query(
      `INSERT INTO driver_reconciliation_uploads (admin_id, filename, total_rows, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [adminId, filename, totalRows]
    );
    return result.rows[0].id;
  }

  // Update upload status and processed rows
  static async updateUploadStatus(
    uploadId: number,
    status: string,
    processedRows?: number
  ): Promise<void> {
    const queryText =
      processedRows !== undefined
        ? `UPDATE driver_reconciliation_uploads SET status = $2, processed_rows = $3, updated_at = NOW() WHERE id = $1`
        : `UPDATE driver_reconciliation_uploads SET status = $2, updated_at = NOW() WHERE id = $1`;

    const params =
      processedRows !== undefined ? [uploadId, status, processedRows] : [uploadId, status];

    await query(queryText, params);
  }

  // Insert multiple reconciliation rows
  static async insertReconciliationRows(rows: Partial<DriverReconciliationRow>[]): Promise<void> {
    if (rows.length === 0) return;

    const values = rows
      .map(
        (row) => `(
      ${row.upload_id},
      ${row.driver_name ? `'${String(row.driver_name).replace(/'/g, "''")}'` : 'NULL'},
      ${row.phone ? `'${row.phone}'` : 'NULL'},
      ${row.mail ? `'${row.mail}'` : 'NULL'},
      ${row.pincode ? `'${row.pincode}'` : 'NULL'},
      ${row.dob ? `'${row.dob.toISOString()}'` : 'NULL'},
      ${row.area ? `'${row.area.replace(/'/g, "''")}'` : 'NULL'},
      ${row.street ? `'${row.street.replace(/'/g, "''")}'` : 'NULL'},
      ${row.address ? `'${String(row.address).replace(/'/g, "''")}'` : 'NULL'},
      ${row.district ? `'${String(row.district).replace(/'/g, "''")}'` : 'NULL'},
      ${row.state ? `'${String(row.state).replace(/'/g, "''")}'` : 'NULL'},
      ${row.country ? `'${String(row.country).replace(/'/g, "''")}'` : 'NULL'},
      ${row.status ? `'${row.status}'` : 'NULL'},
      ${row.has_account || false},
      ${row.is_onboarded || false},
      ${row.match_confidence || 0},
      ${row.error_message ? `'${row.error_message.replace(/'/g, "''")}'` : 'NULL'},
      ${row.whatsapp_sent || false},
      ${row.joined_date ? `'${row.joined_date.toISOString()}'` : 'NULL'},
      ${row.onboarding_status ? `'${row.onboarding_status}'` : 'NULL'}
    )`
      )
      .join(', ');

    await query(`
      INSERT INTO driver_reconciliation_rows (
        upload_id, driver_name, phone, mail, pincode, dob, area, street, address,
        district, state, country, status, has_account, is_onboarded, match_confidence,
        error_message, whatsapp_sent, joined_date, onboarding_status
      ) VALUES ${values}
      ON CONFLICT (phone) DO UPDATE SET
        upload_id = EXCLUDED.upload_id,
        driver_name = COALESCE(EXCLUDED.driver_name, driver_reconciliation_rows.driver_name),
        mail = COALESCE(EXCLUDED.mail, driver_reconciliation_rows.mail),
        pincode = COALESCE(EXCLUDED.pincode, driver_reconciliation_rows.pincode),
        dob = COALESCE(EXCLUDED.dob, driver_reconciliation_rows.dob),
        area = COALESCE(EXCLUDED.area, driver_reconciliation_rows.area),
        street = COALESCE(EXCLUDED.street, driver_reconciliation_rows.street),
        address = COALESCE(EXCLUDED.address, driver_reconciliation_rows.address),
        district = COALESCE(EXCLUDED.district, driver_reconciliation_rows.district),
        state = COALESCE(EXCLUDED.state, driver_reconciliation_rows.state),
        country = COALESCE(EXCLUDED.country, driver_reconciliation_rows.country),
        status = COALESCE(EXCLUDED.status, driver_reconciliation_rows.status, 'pending'),
        has_account = EXCLUDED.has_account,
        is_onboarded = EXCLUDED.is_onboarded,
        match_confidence = EXCLUDED.match_confidence,
        error_message = EXCLUDED.error_message,
        whatsapp_sent = EXCLUDED.whatsapp_sent,
        joined_date = COALESCE(EXCLUDED.joined_date, driver_reconciliation_rows.joined_date),
        onboarding_status = COALESCE(EXCLUDED.onboarding_status, driver_reconciliation_rows.onboarding_status, 'NOT_REGISTERED'),
        updated_at = NOW()
    `);
  }

  // Check if driver exists by phone or email
  static async findExistingDriver(phone?: string, email?: string): Promise<MatchResult> {
    let queryText = '';
    let params: any[] = [];
    let matchConfidence = 0;

    if (phone && email) {
      // Check for both phone and email match
      queryText = `
        SELECT d.id as driver_id,
               d.onboarding_status,
               d.status,
               CASE WHEN dp.driver_id IS NOT NULL THEN true ELSE false END as is_onboarded
        FROM drivers d
        LEFT JOIN driver_profiles dp ON d.id = dp.driver_id
        WHERE d.phone_number = $1
        AND d.email = $2
        AND d.is_deleted = false
      `;
      params = [phone, email];
      matchConfidence = 3; // Both phone and email match
    } else if (phone) {
      // Check for phone match only
      queryText = `
        SELECT d.id as driver_id,
               d.onboarding_status,
               d.status,
               CASE WHEN dp.driver_id IS NOT NULL THEN true ELSE false END as is_onboarded
        FROM drivers d
        LEFT JOIN driver_profiles dp ON d.id = dp.driver_id
        WHERE d.phone_number = $1
        AND d.is_deleted = false
      `;
      params = [phone];
      matchConfidence = 1; // Phone match only
    } else if (email) {
      // Check for email match only
      queryText = `
        SELECT d.id as driver_id,
               d.onboarding_status,
               d.status,
               CASE WHEN dp.driver_id IS NOT NULL THEN true ELSE false END as is_onboarded
        FROM drivers d
        LEFT JOIN driver_profiles dp ON d.id = dp.driver_id
        WHERE d.email = $1
        AND d.is_deleted = false
      `;
      params = [email];
      matchConfidence = 2; // Email match only
    }
 else {
      return { has_account: false, is_onboarded: false, match_confidence: 0 };
    }

    const result = await query(queryText, params);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        has_account: true,
        is_onboarded: row.is_onboarded,
        onboarding_status: row.onboarding_status,
        match_confidence: matchConfidence,
        existing_user_id: row.driver_id, // Use driver_id as user_id for backward compatibility
        existing_driver_id: row.driver_id,
      };
    }

    return { has_account: false, is_onboarded: false, match_confidence: 0 };
  }

  // Get upload by ID
  static async getUploadById(uploadId: number): Promise<DriverReconciliationUpload | null> {
    const result = await query('SELECT * FROM driver_reconciliation_uploads WHERE id = $1', [
      uploadId,
    ]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Get reconciliation rows by upload ID
  static async getRowsByUploadId(
    uploadId: number,
    limit?: number,
    offset?: number
  ): Promise<DriverReconciliationRow[]> {
    let queryText = 'SELECT * FROM driver_reconciliation_rows WHERE upload_id = $1 ORDER BY id';
    const params: any[] = [uploadId];

    if (limit) {
      queryText += ' LIMIT $2';
      params.push(limit);
    }

    if (offset) {
      queryText += ' OFFSET $' + (params.length + 1);
      params.push(offset);
    }

    const result = await query(queryText, params);
    return result.rows;
  }

  // Get all reconciliation rows without upload ID filter
  static async getAllReconciliationRows(
    limit?: number,
    offset?: number
  ): Promise<DriverReconciliationRow[]> {
    let queryText = 'SELECT * FROM driver_reconciliation_rows ORDER BY id';
    const params: any[] = [];

    if (limit) {
      queryText += ' LIMIT $1';
      params.push(limit);
    }

    if (offset) {
      queryText += ' OFFSET $' + (params.length + 1);
      params.push(offset);
    }

    const result = await query(queryText, params);
    return result.rows;
  }

  // Get upload statistics
  static async getUploadStats(uploadId: number): Promise<{
    total_rows: number;
    processed_rows: number;
    matched_rows: number;
    onboarded_rows: number;
    error_rows: number;
  }> {
    const result = await query(
      `
      SELECT
        COUNT(*) as total_rows,
        COUNT(CASE WHEN has_account = true THEN 1 END) as matched_rows,
        COUNT(CASE WHEN is_onboarded = true THEN 1 END) as onboarded_rows,
        COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as error_rows
      FROM driver_reconciliation_rows
      WHERE upload_id = $1
    `,
      [uploadId]
    );

    const stats = result.rows[0];
    const processedRows = await query(
      'SELECT processed_rows FROM driver_reconciliation_uploads WHERE id = $1',
      [uploadId]
    );

    return {
      total_rows: parseInt(stats.total_rows),
      processed_rows: processedRows.rows[0]?.processed_rows || 0,
      matched_rows: parseInt(stats.matched_rows),
      onboarded_rows: parseInt(stats.onboarded_rows),
      error_rows: parseInt(stats.error_rows),
    };
  }

  // Update WhatsApp sent status
  static async updateWhatsAppSent(rowIds: number[]): Promise<void> {
    if (rowIds.length === 0) return;

    const placeholders = rowIds.map((_, index) => `$${index + 1}`).join(',');
    await query(
      `UPDATE driver_reconciliation_rows SET whatsapp_sent = true WHERE id IN (${placeholders})`,
      rowIds
    );
  }

  // Get all uploads with pagination
  static async getUploads(
    limit: number = 50,
    offset: number = 0
  ): Promise<DriverReconciliationUpload[]> {
    const result = await query(
      'SELECT * FROM driver_reconciliation_uploads ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }

  // Sync all reconciliation records against live driver database
  static async syncAllRows(): Promise<number> {
    // 1. Reset all match statuses for a fresh check (optional but cleaner)
    // 2. Perform bulk update by joining with drivers table
    const result = await query(`
      UPDATE driver_reconciliation_rows drr
      SET 
        driver_name = TRIM(CONCAT(d.first_name, ' ', d.last_name)),
        mail = d.email,
        address = d.address->>'street',
        district = d.address->>'city',
        state = d.address->>'state',
        country = d.address->>'country',
        pincode = d.address->>'pincode',
        joined_date = d.created_at,
        has_account = true,
        is_onboarded = CASE WHEN dp.driver_id IS NOT NULL THEN true ELSE false END,
        onboarding_status = d.onboarding_status,
        status = d.status,
        match_confidence = CASE 
          WHEN drr.phone = d.phone_number AND drr.mail = d.email THEN 3 
          WHEN drr.phone = d.phone_number THEN 1 
          WHEN drr.mail = d.email THEN 2 
          ELSE 0 
        END,
        updated_at = d.updated_at
      FROM drivers d
      LEFT JOIN driver_profiles dp ON d.id = dp.driver_id
      WHERE (drr.phone = d.phone_number OR drr.mail = d.email)
      AND d.is_deleted = false
      RETURNING drr.id
    `);
    
    return result.rowCount || 0;
  }
}
