
import { query } from '../../shared/database';
import config from '../../config';
import { logger } from '../../shared/logger';

const transformUrl = (url: string) => {
  if (url && typeof url === 'string' && url.includes('s3.eu-north-1.amazonaws.com')) {
    // Point to the User-Driver-API proxy
    return `${config.userDriverApiUrl}/api/media/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
};

const transformDriverUrls = (driver: any) => {
  // 1. Resolve raw profile URL from possible fields
  let rawProfile = driver.profile_pic_url || driver.profilePicUrl || driver.profile_picture;
  let resolvedUrl = null;

  if (rawProfile) {
    try {
      // Handle potential JSON string from database
      const parsed = typeof rawProfile === 'string' && rawProfile.startsWith('{') ? JSON.parse(rawProfile) : rawProfile;
      resolvedUrl = typeof parsed === 'object' && parsed !== null ? parsed.url || parsed.front : parsed;
    } catch (e) {
      resolvedUrl = rawProfile;
    }
  }

  // 2. Fallback to profile_selfie document if no direct profile photo
  if (!resolvedUrl && driver.documents && Array.isArray(driver.documents)) {
    const selfie = driver.documents.find((d: any) => 
      d.document_type?.toLowerCase().includes('profile_selfie') || 
      d.document_type?.toLowerCase().includes('profile selfie') ||
      d.document_type === 'PROFILE_SELFIE'
    );
    if (selfie && selfie.document_url) {
      const docUrl = selfie.document_url;
      resolvedUrl = typeof docUrl === 'object' && docUrl !== null ? docUrl.url || docUrl.front : docUrl;
    }
  }

  // 3. Transform and sync URL fields
  if (resolvedUrl) {
    const transformed = transformUrl(resolvedUrl);
    driver.profile_pic_url = transformed;
    driver.profilePicUrl = transformed;
    driver.profile_picture = transformed;
  }

  // 4. Transform individual documents
  if (driver.documents && Array.isArray(driver.documents)) {
    driver.documents = driver.documents.map((doc: any) => {
      if (doc.document_url) {
        if (typeof doc.document_url === 'object' && doc.document_url !== null) {
          if (doc.document_url.front) doc.document_url.front = transformUrl(doc.document_url.front);
          if (doc.document_url.back) doc.document_url.back = transformUrl(doc.document_url.back);
          if (doc.document_url.url) doc.document_url.url = transformUrl(doc.document_url.url);
        } else if (typeof doc.document_url === 'string') {
          doc.document_url = transformUrl(doc.document_url);
        }
      }
      return doc;
    });
  }

  // 5. Populate kyc_status for frontend backwards compatibility
  if (driver.kyc) {
    try {
      const parsedKyc = typeof driver.kyc === 'string' ? JSON.parse(driver.kyc) : driver.kyc;
      driver.kyc_status = parsedKyc.overallStatus || 'pending';
    } catch (e) {
      driver.kyc_status = 'pending';
    }
  } else {
    driver.kyc_status = 'pending';
  }

  return driver;
};


export class DriverManagementRepository {
  static async findAll(limit: number = 50, offset: number = 0) {
    const result = await query(
      `SELECT d.*, 
       (SELECT json_build_object(
           'plan_name', rp.plan_name,
           'expiry_date', ds.expiry_date,
           'status', ds.status,
           'billing_cycle', ds.billing_cycle,
           'start_date', ds.start_date
         )
         FROM driver_subscriptions ds
         JOIN recharge_plans rp ON ds.plan_id = rp.id
         WHERE ds.driver_id = d.id AND ds.status = 'active'
         LIMIT 1
       ) as active_subscription,
       (SELECT json_agg(json_build_object(
           'document_id', dd.id,
           'document_type', dd.document_type,
           'document_number', dd.document_number,
           'document_url', dd.document_url,
           'license_status', dd.status,
           'expiry_date', dd.expiry_date,
           'extracted_data', dd.extracted_data,
           'rejection_reason', dd.rejection_reason
         ))
         FROM driver_documents dd
         WHERE dd.driver_id = d.id
       ) as documents
       FROM drivers d
       WHERE d.is_deleted = false 
       ORDER BY d.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const countResult = await query('SELECT COUNT(*) FROM drivers WHERE is_deleted = false');
    
    return {
      drivers: result.rows.map((row: any) => {
        let documents = row.documents || [];
        documents = documents.map((doc: any) => {
          let urlObj = doc.document_url;
          try {
             if (typeof urlObj === 'string' && urlObj.startsWith('{')) {
               urlObj = JSON.parse(urlObj);
             }
          } catch(e) {}
          return { ...doc, document_url: urlObj };
        });

        return transformDriverUrls({
          ...row,
          documents,
          payments: {
            total_earnings: parseFloat(row.total_earnings || 0),
          },
        });
      }),
      total: parseInt(countResult.rows[0].count),
    };
  }

  static async findById(id: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(id);
    
    const result = await query(
      `SELECT * FROM drivers WHERE ${isUuid ? 'id' : 'vdrive_id'} = $1 AND is_deleted = false`,
      [id]
    );
    
    if (result.rows.length === 0) return null;
    const driver = result.rows[0];

    // Fetch documents for the driver
    const documentsResult = await query(
      `SELECT * FROM driver_documents WHERE driver_id = $1`,
      [driver.id]
    );

    driver.documents = documentsResult.rows.map(doc => {
      let urlObj = doc.document_url;
      try {
        if (typeof urlObj === 'string' && urlObj.startsWith('{')) {
          urlObj = JSON.parse(urlObj);
        }
      } catch (e) {}

      return {
        document_id: doc.id,
        document_type: doc.document_type,
        document_number: doc.document_number,
        document_url: urlObj, // Return the raw object (which might have .front and .back)
        license_status: doc.status || 'pending',
        expiry_date: doc.expiry_date,
        extracted_data: doc.extracted_data,
        rejection_reason: doc.rejection_reason
      };
    });

    return transformDriverUrls(driver);
  }

  static async updateDocumentStatus(documentId: string, status: string, reason?: string) {
    try {
      const result = await query(
        'UPDATE driver_documents SET status = $1, rejection_reason = $2, verified_at = NOW() WHERE id = $3 RETURNING *',
        [status, reason || null, documentId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const doc = result.rows[0];
      await query(
        'INSERT INTO driver_document_history (document_id, status, reason) VALUES ($1, $2, $3)',
        [documentId, status, reason || null]
      );
      
      // Sync overall driver KYC status
      await this.syncDriverKYCStatus(doc.driver_id);
      
      return doc;
    } catch (error) {
      throw error;
    }
  }

  static async updateDocumentOCRData(documentId: string, extractedData: any) {
    try {
      const result = await query(
        `UPDATE driver_documents SET extracted_data = $1 WHERE id = $2 RETURNING *`,
        [JSON.stringify(extractedData), documentId]
      );
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '42703') { // Column does not exist
        console.error('extracted_data column missing in driver_documents table.');
        return null;
      }
      throw error;
    }
  }

  static async syncDriverKYCStatus(driverId: string) {
    const documentsResult = await query(
      'SELECT document_type, status FROM driver_documents WHERE driver_id = $1',
      [driverId]
    );
    const docs = documentsResult.rows;

    const mandatoryTypes = ['aadhaar_card', 'driving_license', 'pan_card', 'profile_selfie'];
    const mandatoryDocs = docs.filter(d => mandatoryTypes.includes(d.document_type));

    let overallStatus = 'pending';
    let onboardingStatusUpdate = null;

    const allVerified = mandatoryDocs.length === mandatoryTypes.length && mandatoryDocs.every(d => d.status === 'verified');
    const anyRejected = mandatoryDocs.some(d => d.status === 'rejected');

    if (allVerified) {
      overallStatus = 'verified';
      onboardingStatusUpdate = 'DOCUMENTS_APPROVED';
    } else if (anyRejected) {
      overallStatus = 'rejected';
      onboardingStatusUpdate = 'DOCS_REJECTED';
    }

    const kycData = {
      overallStatus,
      verifiedAt: overallStatus === 'verified' ? new Date().toISOString() : null
    };

    let sql = 'UPDATE drivers SET kyc = COALESCE(kyc, \'{}\'::jsonb) || $1';
    const params: any[] = [JSON.stringify(kycData), driverId];

    if (onboardingStatusUpdate) {
      sql += `, onboarding_status = $3`;
      params.push(onboardingStatusUpdate);
    }

    sql += ', updated_at = NOW() WHERE id = $2';

    await query(sql, params);
    logger.info(`syncDriverKYCStatus for ${driverId}: overallStatus=${overallStatus}, onboardingStatus=${onboardingStatusUpdate}`);
  }

  static async bulkVerifyDocuments(driverId: string) {
    const result = await query(
      "UPDATE driver_documents SET status = 'verified', verified_at = NOW() WHERE driver_id = $1 AND status != 'verified' RETURNING *",
      [driverId]
    );

    // Record history for each document
    if (result.rows && result.rows.length > 0) {
      for (const doc of result.rows) {
        await query(
          "INSERT INTO driver_document_history (document_id, status, reason) VALUES ($1, 'verified', 'Bulk Verified')",
          [doc.id]
        );
      }
      
      // Sync overall driver KYC status
      await this.syncDriverKYCStatus(driverId);
    }

    return result.rows;
  }

  static async getDocumentHistory(documentId: string) {
    const result = await query(
      'SELECT * FROM driver_document_history WHERE document_id = $1 ORDER BY created_at DESC',
      [documentId]
    );
    return result.rows;
  }

  static async search(searchTerm: string, limit: number = 50, offset: number = 0) {
    const ilikeTerm = `%${searchTerm}%`;
    const result = await query(
      `SELECT d.*, 
       (SELECT json_build_object(
           'plan_name', rp.plan_name,
           'expiry_date', ds.expiry_date,
           'status', ds.status,
           'billing_cycle', ds.billing_cycle,
           'start_date', ds.start_date
         )
         FROM driver_subscriptions ds
         JOIN recharge_plans rp ON ds.plan_id = rp.id
         WHERE ds.driver_id = d.id AND ds.status = 'active'
         LIMIT 1
       ) as active_subscription,
       (SELECT json_agg(json_build_object(
           'document_id', dd.id,
           'document_type', dd.document_type,
           'document_number', dd.document_number,
           'document_url', dd.document_url,
           'license_status', dd.status,
           'expiry_date', dd.expiry_date,
           'extracted_data', dd.extracted_data,
           'rejection_reason', dd.rejection_reason
         ))
         FROM driver_documents dd
         WHERE dd.driver_id = d.id
       ) as documents
       FROM drivers d
       WHERE (d.first_name ILIKE $1 OR d.last_name ILIKE $1 OR d.phone_number ILIKE $1 OR d.email ILIKE $1 OR d.vdrive_id ILIKE $1 OR d.id::text ILIKE $1)
       AND d.is_deleted = false 
       ORDER BY d.created_at DESC LIMIT $2 OFFSET $3`,
      [ilikeTerm, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM drivers 
       WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR phone_number ILIKE $1 OR email ILIKE $1 OR vdrive_id ILIKE $1 OR id::text ILIKE $1)
       AND is_deleted = false`,
      [ilikeTerm]
    );

    return {
      drivers: result.rows.map((row: any) => {
        let documents = row.documents || [];
        documents = documents.map((doc: any) => {
          let urlObj = doc.document_url;
          try {
             if (typeof urlObj === 'string' && urlObj.startsWith('{')) {
               urlObj = JSON.parse(urlObj);
             }
          } catch(e) {}
          return { ...doc, document_url: urlObj };
        });

        return transformDriverUrls({
          ...row,
          documents,
          payments: {
            total_earnings: parseFloat(row.total_earnings || 0),
          },
        });
      }),
      total: parseInt(countResult.rows[0].count),
    };
  }

  static async updateStatus(id: string, status: string, reason?: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(id);
    const idColumn = isUuid ? 'id' : 'vdrive_id';

    const onboardingUpdate = status === 'active' ? ", onboarding_status = 'ONBOARDING_COMPLETED', documents_submitted = true" : "";
    
    await query(
      `UPDATE drivers SET status = $1, status_reason = $2, updated_at = NOW() ${onboardingUpdate} WHERE ${idColumn} = $3`,
      [status, reason || null, id]
    );
  }

  static async verifyDriver(id: string, kycStatus: string) {
    logger.info(`verifyDriver called for ID: ${id}, kycStatus: ${kycStatus}`);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(id);
    const idColumn = isUuid ? 'id' : 'vdrive_id';

    const kycData = JSON.stringify({
      overallStatus: kycStatus,
      verifiedAt: kycStatus === 'verified' ? new Date().toISOString() : null
    });

    if (kycStatus === 'verified') {
      await query(
        `UPDATE drivers SET kyc = COALESCE(kyc, '{}'::jsonb) || $1, status = 'active', documents_submitted = true, onboarding_status = 'ONBOARDING_COMPLETED', updated_at = NOW() WHERE ${idColumn} = $2`,
        [kycData, id]
      );
      
      // We need the internal UUID for the documents update if we don't have it
      let internalId = id;
      if (!isUuid) {
        const driver = await query('SELECT id FROM drivers WHERE vdrive_id = $1', [id]);
        if (driver.rows.length > 0) internalId = driver.rows[0].id;
      }

      // Auto-approve all documents when driver is verified
      await query(
        "UPDATE driver_documents SET status = 'verified', verified_at = NOW() WHERE driver_id = $1",
        [internalId]
      );
    } else {
      await query(
        `UPDATE drivers SET kyc = COALESCE(kyc, '{}'::jsonb) || $1, updated_at = NOW() WHERE ${idColumn} = $2`,
        [kycData, id]
      );
    }
  }

  static async updateProfile(id: string, data: any) {
    const fields: string[] = [];
    const values: any[] = [];
    let counter = 1;

    // Auto-compute full_name if first_name or last_name is being updated
    if (data.first_name !== undefined || data.last_name !== undefined) {
      // If only one is provided, we need to fetch the other from DB
      if (data.first_name === undefined || data.last_name === undefined) {
        const existing = await query('SELECT first_name, last_name FROM drivers WHERE id = $1', [id]);
        if (existing.rows.length > 0) {
          const firstName = data.first_name ?? existing.rows[0].first_name ?? '';
          const lastName = data.last_name ?? existing.rows[0].last_name ?? '';
          data.full_name = `${firstName} ${lastName}`.trim();
        }
      } else {
        data.full_name = `${data.first_name} ${data.last_name}`.trim();
      }
    }

    // Map 'dob' from frontend to 'date_of_birth' for database
    if (data.dob !== undefined && data.date_of_birth === undefined) {
      data.date_of_birth = data.dob;
    }

    const allowedFields = ['first_name', 'last_name', 'full_name', 'email', 'phone_number', 'date_of_birth', 'gender', 'role', 'address'];

    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        if (key === 'address') {
          fields.push(`address = $${counter}`);
          values.push(JSON.stringify(data[key]));
        } else {
          fields.push(`${key} = $${counter}`);
          values.push(data[key]);
        }
        counter++;
      }
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE drivers SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${counter} RETURNING *`;
    
    const result = await query(sql, values);
    return result.rows[0];
  }

  static async getDashboardStats() {
    const totalResult = await query(
      'SELECT COUNT(*) FROM drivers WHERE is_deleted = false'
    );
    const activeResult = await query(
      "SELECT COUNT(*) FROM drivers WHERE is_deleted = false AND status = 'active'"
    );

    // Today's boundaries
    const today = 'CURRENT_DATE';
    
    // Today's metrics
    const todayUsersResult = await query(
      `SELECT COUNT(*) FROM users WHERE created_at >= ${today}`
    );
    const todayDriversResult = await query(
      `SELECT COUNT(*) FROM drivers WHERE created_at >= ${today} AND is_deleted = false`
    );
    const todaySubscriptionsResult = await query(
      `SELECT COUNT(*) FROM driver_subscriptions WHERE created_at >= ${today} AND status = 'active'`
    );
    const todayTripsResult = await query(
      `SELECT COUNT(*) as total, 
              SUM(total_fare) FILTER (WHERE trip_status = 'COMPLETED') as revenue 
       FROM trips WHERE created_at >= ${today}`
    );

    // Total counts (Lifetime)
    const totalUsersResult = await query(
      "SELECT COUNT(*) FROM users"
    );
    const activeUsersResult = await query(
      "SELECT COUNT(*) FROM users WHERE status = 'active'"
    );
    const totalSubscriptionsResult = await query(
      "SELECT COUNT(*) FROM driver_subscriptions WHERE status = 'active'"
    );
    const totalEarningsResult = await query(
      "SELECT SUM(total_fare) as total FROM trips WHERE trip_status = 'COMPLETED'"
    );

    // Yesterday's metrics for trends
    const yesterday = "CURRENT_DATE - INTERVAL '1 day'";
    const yesterdayUsersResult = await query(
      `SELECT COUNT(*) FROM users WHERE created_at >= ${yesterday} AND created_at < ${today}`
    );
    const yesterdayDriversResult = await query(
      `SELECT COUNT(*) FROM drivers WHERE created_at >= ${yesterday} AND created_at < ${today} AND is_deleted = false`
    );
    const yesterdaySubscriptionsResult = await query(
      `SELECT COUNT(*) FROM driver_subscriptions WHERE created_at >= ${yesterday} AND created_at < ${today} AND status = 'active'`
    );
    const yesterdayTripsResult = await query(
      `SELECT COUNT(*) as total, 
              SUM(total_fare) FILTER (WHERE trip_status = 'COMPLETED') as revenue 
       FROM trips WHERE created_at >= ${yesterday} AND created_at < ${today}`
    );

    // Dynamic counts: Available (Online & no active trip) vs On Trip (Active trip)
    const onlineResult = await query(
      "SELECT COUNT(*) FROM drivers WHERE is_deleted = false AND (availability->>'online' = 'true' OR availability->>'status' = 'ONLINE')"
    );

    const onTripResult = await query(
      "SELECT COUNT(DISTINCT driver_id) FROM trips WHERE trip_status IN ('ACCEPTED', 'ARRIVING', 'ARRIVED', 'LIVE', 'DESTINATION_REACHED')"
    );

    // Scheduled Rides
    const totalScheduledResult = await query(
      "SELECT COUNT(*) FROM trips WHERE booking_type = 'SCHEDULED' AND trip_status NOT IN ('CANCELLED', 'COMPLETED', 'MID_CANCELLED')"
    );
    const acceptedScheduledResult = await query(
      "SELECT COUNT(*) FROM trips WHERE booking_type = 'SCHEDULED' AND trip_status = 'ACCEPTED'"
    );

    // Onboarding Pipeline
    const pendingVerificationsResult = await query(
      "SELECT COUNT(*) FROM drivers WHERE is_deleted = false AND (kyc->>'overallStatus' = 'pending' OR kyc IS NULL) AND (documents_submitted = true OR id IN (SELECT driver_id FROM driver_documents))"
    );
    const documentExpiryAlertsResult = await query(
      "SELECT COUNT(DISTINCT driver_id) FROM driver_documents WHERE expiry_date <= CURRENT_DATE + INTERVAL '7 days' AND expiry_date >= CURRENT_DATE"
    );

    // Compliance Health calculation
    const verifiedDriversResult = await query(
      "SELECT COUNT(*) FROM drivers WHERE is_deleted = false AND kyc->>'overallStatus' = 'verified'"
    );
    const verifiedDriversCount = parseInt(verifiedDriversResult.rows[0]?.count || '0');
    const totalDriversCount = parseInt(totalResult.rows[0]?.count || '0');
    const complianceHealth = totalDriversCount > 0 
      ? Math.round((verifiedDriversCount / totalDriversCount) * 100) 
      : 100;

    const activeTripsCount = parseInt(onTripResult.rows[0]?.count || '0');
    const onlineCount = parseInt(onlineResult.rows[0]?.count || '0');

    // Helper to calculate trend
    const calculateTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? '+100%' : '0%';
      const diff = ((curr - prev) / prev) * 100;
      return `${diff > 0 ? '+' : ''}${Math.round(diff)}%`;
    };

    const stats = {
      todayNewUsers: parseInt(todayUsersResult.rows[0]?.count || '0'),
      todayNewDrivers: parseInt(todayDriversResult.rows[0]?.count || '0'),
      todaySubscriptions: parseInt(todaySubscriptionsResult.rows[0]?.count || '0'),
      todayTrips: parseInt(todayTripsResult.rows[0]?.total || '0'),
      todayRevenue: parseFloat(todayTripsResult.rows[0]?.revenue || '0'),
      
      yesterdayUsers: parseInt(yesterdayUsersResult.rows[0]?.count || '0'),
      yesterdayDrivers: parseInt(yesterdayDriversResult.rows[0]?.count || '0'),
      yesterdaySubscriptions: parseInt(yesterdaySubscriptionsResult.rows[0]?.count || '0'),
      yesterdayTrips: parseInt(yesterdayTripsResult.rows[0]?.total || '0'),
      yesterdayRevenue: parseFloat(yesterdayTripsResult.rows[0]?.revenue || '0'),
    };

    return {
      totalDrivers: totalDriversCount,
      activeDrivers: parseInt(activeResult.rows[0]?.count || '0'),
      availableDrivers: Math.max(0, onlineCount - activeTripsCount),
      onTripDrivers: activeTripsCount,
      totalScheduledRides: parseInt(totalScheduledResult.rows[0]?.count || '0'),
      acceptedScheduledRides: parseInt(acceptedScheduledResult.rows[0]?.count || '0'),
      todayNewUsers: stats.todayNewUsers,
      todayNewDrivers: stats.todayNewDrivers,
      todaySubscriptions: stats.todaySubscriptions,
      totalUsers: parseInt(totalUsersResult.rows[0]?.count || '0'),
      activeUsers: parseInt(activeUsersResult.rows[0]?.count || '0'),
      totalSubscriptions: parseInt(totalSubscriptionsResult.rows[0]?.count || '0'),
      totalEarnings: parseFloat(totalEarningsResult.rows[0]?.total || '0'),
      todayTrips: stats.todayTrips,
      todayRevenue: stats.todayRevenue,
      pendingVerifications: parseInt(pendingVerificationsResult.rows[0]?.count || '0'),
      documentExpiryAlerts: parseInt(documentExpiryAlertsResult.rows[0]?.count || '0'),
      complianceHealth,
      lastSyncAt: new Date().toISOString(),
      trends: {
        users: calculateTrend(stats.todayNewUsers, stats.yesterdayUsers),
        drivers: calculateTrend(stats.todayNewDrivers, stats.yesterdayDrivers),
        subscriptions: calculateTrend(stats.todaySubscriptions, stats.yesterdaySubscriptions),
        trips: calculateTrend(stats.todayTrips, stats.yesterdayTrips),
        revenue: calculateTrend(stats.todayRevenue, stats.yesterdayRevenue),
      }
    };
  }


}
