// src/modules/driver-reconciliation/driverReconciliation.service.ts
import { DriverReconciliationRepository } from './driverReconciliation.repository';
import {
  DriverReconciliationPayload,
  ProcessingResult,
  DriverReconciliationRow,
  MatchResult,
} from './driverReconciliation.model';

export class DriverReconciliationService {
  // Sync all reconciliation records
  static async syncReconciliationData(): Promise<{ success: boolean; message: string; rows_synced: number }> {
    try {
      const rowsSynced = await DriverReconciliationRepository.syncAllRows();
      return {
        success: true,
        message: `Successfully synced ${rowsSynced} driver records`,
        rows_synced: rowsSynced
      };
    } catch (error: any) {
      console.error('❌ Error syncing reconciliation data:', error);
      throw new Error(`Failed to sync reconciliation data: ${error.message}`);
    }
  }

  // Process driver reconciliation payload
  static async processReconciliationData(
    adminId: string | undefined,
    payload: DriverReconciliationPayload
  ): Promise<ProcessingResult> {
    try {
      console.log(
        `🧪 Processing reconciliation data: ${payload.filename} with ${payload.data.length} rows`
      );

      // Create upload record
      const uploadId = await DriverReconciliationRepository.createUpload(
        adminId,
        payload.filename,
        payload.data.length
      );

      await DriverReconciliationRepository.updateUploadStatus(uploadId, 'processing');

      const errors: Array<{ row_index: number; error_message: string }> = [];
      const rowsToInsert: Partial<DriverReconciliationRow>[] = [];

      // Process each row
      for (let i = 0; i < payload.data.length; i++) {
        const rawRow = payload.data[i];
        const row = this.normalizeRow(rawRow);

        try {
          // Validate row data
          const validationError = this.validateRowData(row);
          if (validationError) {
            errors.push({ row_index: i + 1, error_message: validationError });
            continue;
          }

          // Check for existing driver
          const matchResult = await DriverReconciliationRepository.findExistingDriver(
            row.phone,
            row.mail
          );

          // Parse date of birth if provided
          let dob: Date | undefined;
          if (row.dob) {
            try {
              dob = new Date(row.dob);
              if (isNaN(dob.getTime())) {
                dob = undefined;
              }
            } catch {
              dob = undefined;
            }
          }

          // Parse joined date if provided
          let joinedDate: Date | undefined;
          if (row.joined_date) {
            try {
              joinedDate = new Date(row.joined_date);
              if (isNaN(joinedDate.getTime())) {
                joinedDate = undefined;
              }
            } catch {
              joinedDate = undefined;
            }
          }

          // Prepare row for insertion
          const reconciliationRow: Partial<DriverReconciliationRow> = {
            upload_id: uploadId,
            driver_name: row.driver_name,
            phone: row.phone,
            mail: row.mail,
            pincode: row.pincode,
            dob: dob,
            area: row.area,
            street: row.street,
            address: row.address,
            district: row.district,
            state: row.state,
            country: row.country,
            status: row.status,
            has_account: matchResult.has_account,
            is_onboarded: matchResult.is_onboarded,
            onboarding_status: matchResult.onboarding_status,
            match_confidence: matchResult.match_confidence,
            error_message: undefined,
            whatsapp_sent: false,
            joined_date: joinedDate,
          };

          rowsToInsert.push(reconciliationRow);
        } catch (rowError: any) {
          console.error(`Error processing row ${i + 1}:`, rowError);
          errors.push({
            row_index: i + 1,
            error_message: `Processing error: ${rowError.message}`,
          });
        }
      }

      // Deduplicate rows by phone number before batch insertion
      // This prevents the "ON CONFLICT DO UPDATE command cannot affect row a second time" error
      const uniqueRowsMap = new Map<string, Partial<DriverReconciliationRow>>();
      rowsToInsert.forEach((row) => {
        if (row.phone) {
          uniqueRowsMap.set(row.phone, row);
        }
      });
      const uniqueRowsToInsert = Array.from(uniqueRowsMap.values());

      // Insert all valid rows in batch
      if (uniqueRowsToInsert.length > 0) {
        await DriverReconciliationRepository.insertReconciliationRows(uniqueRowsToInsert);
      }

      // Update upload status
      const finalStatus = errors.length === 0 ? 'completed' : 'completed'; // Still mark as completed even with errors
      await DriverReconciliationRepository.updateUploadStatus(
        uploadId,
        finalStatus,
        payload.data.length - errors.length
      );

      console.log(`✅ Processed ${payload.data.length - errors.length} rows successfully`);

      // Fetch the created rows for the response
      const savedRows = await DriverReconciliationRepository.getRowsByUploadId(uploadId);

      return {
        success: true,
        message: `Successfully processed ${payload.data.length - errors.length} out of ${payload.data.length} rows`,
        upload_id: uploadId,
        processed_rows: payload.data.length - errors.length,
        data: savedRows,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      console.error('❌ Error processing reconciliation data:', error);
      return {
        success: false,
        message: `Failed to process reconciliation data: ${error.message}`,
      };
    }
  }

  // Validate individual row data
  private static validateRowData(row: any): string | null {
    // Check if at least one identifier is provided
    if (!row.phone && !row.mail) {
      return 'At least phone number or email must be provided';
    }

    // Validate phone format (basic check)
    if (row.phone && !this.isValidPhone(row.phone)) {
      return 'Invalid phone number format';
    }

    // Validate email format (basic check)
    if (row.mail && !this.isValidEmail(row.mail)) {
      return 'Invalid email format';
    }

    // Validate pincode if provided
    if (row.pincode && !this.isValidPincode(row.pincode)) {
      return 'Invalid pincode format';
    }

    return null; // No validation errors
  }

  // Basic phone validation
  private static isValidPhone(phone: string | number): boolean {
    if (!phone) return false;
    // Convert to string and remove all non-digit characters
    const cleanPhone = String(phone).replace(/\D/g, '');
    // Check if it's between 10-15 digits
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }

  // Basic email validation
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Basic pincode validation
  private static isValidPincode(pincode: string | number): boolean {
    if (!pincode) return false;
    // Indian pincode format: 6 digits
    return /^\d{6}$/.test(String(pincode));
  }

  // Normalize row keys to formal internal names
  private static normalizeRow(rawRow: any): any {
    const normalized: any = {};
    const keyMap: { [key: string]: string } = {
      // Driver Name mappings
      'driver name': 'driver_name',
      name: 'driver_name',
      'full name': 'driver_name',
      driver_name: 'driver_name',

      // Phone mappings
      'phone number': 'phone',
      phone: 'phone',
      contact: 'phone',
      mobile: 'phone',
      phone_number: 'phone',

      // Email mappings
      email: 'mail',
      mail: 'mail',
      'email id': 'mail',
      email_id: 'mail',

      // Address mappings
      address: 'address',
      addr: 'address',
      location: 'address',

      // Pincode mappings
      pincode: 'pincode',
      pin: 'pincode',
      zip: 'pincode',
      zipcode: 'pincode',

      // Other fields
      district: 'district',
      state: 'state',
      country: 'country',
      status: 'status',
      area: 'area',
      street: 'street',

      // Date mappings
      'joined date': 'joined_date',
      joined: 'joined_date',
      onboarding_date: 'joined_date',
      joined_date: 'joined_date',

      'date of birth': 'dob',
      dob: 'dob',
      birth_date: 'dob',
    };

    // Process each key in the raw row
    Object.keys(rawRow).forEach((key) => {
      const lowerKey = key.toLowerCase().trim();
      const normalizedKey = keyMap[lowerKey];

      if (normalizedKey) {
        // If multiple keys map to the same normalized key, prioritize the formal one or the first one found
        if (!normalized[normalizedKey]) {
          normalized[normalizedKey] = rawRow[key];
        }
      }
    });

    return normalized;
  }

  // Get upload details
  static async getUploadDetails(uploadId: number) {
    try {
      const upload = await DriverReconciliationRepository.getUploadById(uploadId);
      if (!upload) {
        throw new Error('Upload not found');
      }

      const stats = await DriverReconciliationRepository.getUploadStats(uploadId);

      return {
        upload,
        stats,
      };
    } catch (error: any) {
      throw new Error(`Failed to get upload details: ${error.message}`);
    }
  }

  // Get reconciliation rows with pagination
  static async getReconciliationRows(uploadId: number, page: number = 1, limit: number = 50) {
    try {
      const offset = (page - 1) * limit;
      const rows = await DriverReconciliationRepository.getRowsByUploadId(uploadId, limit, offset);

      return {
        rows,
        pagination: {
          page,
          limit,
          offset,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to get reconciliation rows: ${error.message}`);
    }
  }

  // Get all reconciliation rows without upload ID filter
  static async getAllReconciliationRows(page: number = 1, limit: number = 50) {
    try {
      const offset = (page - 1) * limit;
      const rows = await DriverReconciliationRepository.getAllReconciliationRows(limit, offset);

      return {
        rows,
        pagination: {
          page,
          limit,
          offset,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to get all reconciliation rows: ${error.message}`);
    }
  }

  // Get all uploads with pagination
  static async getUploads(page: number = 1, limit: number = 50) {
    try {
      const offset = (page - 1) * limit;
      const uploads = await DriverReconciliationRepository.getUploads(limit, offset);

      return {
        uploads,
        pagination: {
          page,
          limit,
          offset,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to get uploads: ${error.message}`);
    }
  }

  // Update WhatsApp campaign status
  static async updateWhatsAppCampaign(rowIds: number[]) {
    try {
      await DriverReconciliationRepository.updateWhatsAppSent(rowIds);
      return {
        success: true,
        message: `Updated WhatsApp status for ${rowIds.length} rows`,
        updated_rows: rowIds.length,
      };
    } catch (error: any) {
      throw new Error(`Failed to update WhatsApp campaign: ${error.message}`);
    }
  }

  // Get reconciliation statistics summary
  static async getReconciliationSummary() {
    try {
      // Get recent uploads (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // This would need a more complex query to get summary stats
      // For now, return basic upload count
      const uploads = await DriverReconciliationRepository.getUploads(1000, 0);

      const summary = {
        total_uploads: uploads.length,
        recent_uploads: uploads.filter((u) => new Date(u.created_at) > thirtyDaysAgo).length,
        completed_uploads: uploads.filter((u) => u.status === 'completed').length,
        failed_uploads: uploads.filter((u) => u.status === 'failed').length,
        total_processed_rows: uploads.reduce((sum, u) => sum + u.processed_rows, 0),
      };

      return summary;
    } catch (error: any) {
      throw new Error(`Failed to get reconciliation summary: ${error.message}`);
    }
  }
}
