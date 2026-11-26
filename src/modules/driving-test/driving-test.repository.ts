import { query } from '../../shared/database';
import { logger } from '../../shared/logger';
import {
  DrivingTestRoute,
  DrivingTestSession,
  DrivingTestRecording,
  DrivingTelemetryPoint,
  AdminDecisionDto,
} from './driving-test.model';

export class DrivingTestRepository {
  private static tableInitialized = false;

  public static async ensureTables(): Promise<void> {
    if (this.tableInitialized) return;
    try {
      // 1. Driving Test Routes
      await query(`
        CREATE TABLE IF NOT EXISTS driving_test_routes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(150) NOT NULL,
          city VARCHAR(100) NOT NULL,
          total_distance_meters INT NOT NULL,
          estimated_duration_minutes INT DEFAULT 20,
          polyline JSONB DEFAULT '[]'::jsonb,
          checkpoints JSONB DEFAULT '[]'::jsonb,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_test_route_active ON driving_test_routes(is_active);

        -- 2. Driving Test Sessions
        CREATE TABLE IF NOT EXISTS driving_test_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          driver_id UUID NOT NULL,
          route_id UUID,
          status VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          total_duration_seconds INT DEFAULT 0,
          total_distance_meters INT DEFAULT 0,
          device_model VARCHAR(100),
          simultaneous_camera_supported BOOLEAN DEFAULT FALSE,
          drive_score INT,
          score_breakdown JSONB,
          auto_verdict VARCHAR(50) DEFAULT 'PENDING',
          infractions_count JSONB,
          admin_decision VARCHAR(50) DEFAULT 'PENDING',
          admin_reviewer_id UUID,
          admin_notes TEXT,
          reviewed_at TIMESTAMP WITH TIME ZONE,
          retention_expires_at TIMESTAMP WITH TIME ZONE,
          recordings_deleted BOOLEAN DEFAULT FALSE,
          legal_hold BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_test_session_driver ON driving_test_sessions(driver_id);
        CREATE INDEX IF NOT EXISTS idx_test_session_status ON driving_test_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_test_session_decision ON driving_test_sessions(admin_decision);
        CREATE INDEX IF NOT EXISTS idx_test_session_retention ON driving_test_sessions(retention_expires_at, recordings_deleted);

        -- 3. Segmented Video Recordings
        CREATE TABLE IF NOT EXISTS driving_test_recordings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL,
          camera_type VARCHAR(20) NOT NULL,
          segment_index INT NOT NULL,
          duration_ms INT DEFAULT 60000,
          s3_bucket VARCHAR(150) NOT NULL,
          s3_key VARCHAR(255) NOT NULL,
          file_size_bytes BIGINT DEFAULT 0,
          checksum_sha256 VARCHAR(64),
          is_uploaded BOOLEAN DEFAULT FALSE,
          is_purged BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_test_rec_session ON driving_test_recordings(session_id);

        -- 4. Driving Telemetry
        CREATE TABLE IF NOT EXISTS driving_test_telemetry (
          id BIGSERIAL PRIMARY KEY,
          session_id UUID NOT NULL,
          timestamp BIGINT NOT NULL,
          latitude NUMERIC(10, 7) NOT NULL,
          longitude NUMERIC(10, 7) NOT NULL,
          speed_kmh NUMERIC(5, 2) NOT NULL,
          heading NUMERIC(5, 2) DEFAULT 0,
          accuracy NUMERIC(5, 2) DEFAULT 5,
          flagged_event VARCHAR(50) DEFAULT 'NONE',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_test_telemetry_session ON driving_test_telemetry(session_id);

        -- 5. Retention Logs
        CREATE TABLE IF NOT EXISTS recording_retention_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL,
          driver_id UUID NOT NULL,
          total_files_purged INT DEFAULT 0,
          total_bytes_freed BIGINT DEFAULT 0,
          purged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          purged_by VARCHAR(100) DEFAULT 'AUTOMATED_RETENTION_WORKER'
        );
      `);

      // Seed standard test route if none exists
      const existing = await query(`SELECT id FROM driving_test_routes LIMIT 1`);
      if (existing.rows.length === 0) {
        const defaultCheckpoints = [
          {
            sequenceOrder: 1,
            checkpointType: 'START',
            latitude: 13.0827,
            longitude: 80.2707,
            radiusMeters: 30,
            voiceInstructionEn: 'Starting driving test session. Proceed straight safely.',
            voiceInstructionTa: 'ஓட்டுநர் சோதனை அமர்வு தொடங்குகிறது. கவனமாக நேராகச் செல்லவும்.',
          },
          {
            sequenceOrder: 2,
            checkpointType: 'TURN_LEFT',
            latitude: 13.0850,
            longitude: 80.2720,
            radiusMeters: 25,
            speedLimitKmh: 40,
            voiceInstructionEn: 'In 50 meters, take the next left turn safely.',
            voiceInstructionTa: '50 மீட்டரில் பாதுகாப்பாக இடதுபுறம் திரும்பவும்.',
          },
          {
            sequenceOrder: 3,
            checkpointType: 'TRAFFIC_SIGNAL',
            latitude: 13.0890,
            longitude: 80.2750,
            radiusMeters: 25,
            speedLimitKmh: 30,
            voiceInstructionEn: 'Approaching traffic signal. Stop completely before the white stop line.',
            voiceInstructionTa: 'போக்குவரத்து சிக்னல் வருகிறது. வெள்ளைக் கோட்டிற்கு முன் முழுமையாக நிறுத்தவும்.',
          },
          {
            sequenceOrder: 4,
            checkpointType: 'TURN_RIGHT',
            latitude: 13.0920,
            longitude: 80.2780,
            radiusMeters: 25,
            speedLimitKmh: 40,
            voiceInstructionEn: 'Take the next right turn with proper indicator signal.',
            voiceInstructionTa: 'சிக்னல் போட்டு அடுத்த வலதுபுறம் திரும்பவும்.',
          },
          {
            sequenceOrder: 5,
            checkpointType: 'REVERSE_PARKING',
            latitude: 13.0960,
            longitude: 80.2810,
            radiusMeters: 35,
            speedLimitKmh: 15,
            voiceInstructionEn: 'Perform reverse parking between marked boundaries.',
            voiceInstructionTa: 'குறிக்கப்பட்ட எல்லைகளுக்குள் வாகனத்தை பின்னோக்கி நிறுத்தவும்.',
          },
          {
            sequenceOrder: 6,
            checkpointType: 'DESTINATION',
            latitude: 13.0990,
            longitude: 80.2850,
            radiusMeters: 30,
            voiceInstructionEn: 'You have arrived at the final destination. Shift to park and apply handbrake.',
            voiceInstructionTa: 'இறுதி இலக்கை அடைந்துவிட்டீர்கள். ஹேண்ட்பிரேக் போடவும்.',
          },
        ];

        await query(
          `INSERT INTO driving_test_routes (title, city, total_distance_meters, estimated_duration_minutes, checkpoints)
           VALUES ($1, $2, $3, $4, $5)`,
          ['Chennai Urban Driving Assessment Loop', 'Chennai', 5200, 18, JSON.stringify(defaultCheckpoints)]
        );
        logger.info('✅ Seeded default Chennai Driving Assessment Route in Admin DB');
      }

      this.tableInitialized = true;
    } catch (err) {
      logger.error('❌ Failed to ensure driving test tables in Admin DB:', err);
    }
  }

  public static async findAllSessions(
    limit: number = 20,
    offset: number = 0,
    status?: string,
    adminDecision?: string,
    search?: string
  ): Promise<any[]> {
    await this.ensureTables();
    let whereClauses = ['1=1'];
    const params: any[] = [];
    let pIdx = 1;

    if (status) {
      whereClauses.push(`s.auto_verdict = $${pIdx++}`);
      params.push(status);
    }

    if (adminDecision) {
      whereClauses.push(`s.admin_decision = $${pIdx++}`);
      params.push(adminDecision);
    }

    if (search) {
      whereClauses.push(
        `(d.first_name ILIKE $${pIdx} OR d.last_name ILIKE $${pIdx} OR d.phone_number ILIKE $${pIdx} OR s.id::text ILIKE $${pIdx})`
      );
      params.push(`%${search}%`);
      pIdx++;
    }

    params.push(limit);
    params.push(offset);

    const sql = `
      SELECT 
        s.*,
        d.first_name,
        d.last_name,
        d.phone_number,
        d.email,
        d.profile_pic_url,
        d.onboarding_status as driver_onboarding_status,
        r.title as route_title,
        r.city as route_city
      FROM driving_test_sessions s
      LEFT JOIN drivers d ON d.id = s.driver_id
      LEFT JOIN driving_test_routes r ON r.id = s.route_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY s.started_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    const res = await query(sql, params);
    return res.rows;
  }

  public static async countSessions(
    status?: string,
    adminDecision?: string,
    search?: string
  ): Promise<number> {
    await this.ensureTables();
    let whereClauses = ['1=1'];
    const params: any[] = [];
    let pIdx = 1;

    if (status) {
      whereClauses.push(`s.auto_verdict = $${pIdx++}`);
      params.push(status);
    }

    if (adminDecision) {
      whereClauses.push(`s.admin_decision = $${pIdx++}`);
      params.push(adminDecision);
    }

    if (search) {
      whereClauses.push(
        `(d.first_name ILIKE $${pIdx} OR d.last_name ILIKE $${pIdx} OR d.phone_number ILIKE $${pIdx} OR s.id::text ILIKE $${pIdx})`
      );
      params.push(`%${search}%`);
      pIdx++;
    }

    const sql = `
      SELECT COUNT(*) as total
      FROM driving_test_sessions s
      LEFT JOIN drivers d ON d.id = s.driver_id
      WHERE ${whereClauses.join(' AND ')}
    `;

    const res = await query(sql, params);
    return parseInt(res.rows[0]?.total || '0', 10);
  }

  public static async findSessionById(sessionId: string): Promise<any | null> {
    await this.ensureTables();
    const res = await query(
      `SELECT 
         s.*,
         d.first_name,
         d.last_name,
         d.phone_number,
         d.email,
         d.profile_pic_url,
         d.onboarding_status as driver_onboarding_status,
         r.title as route_title,
         r.city as route_city,
         r.checkpoints as route_checkpoints
       FROM driving_test_sessions s
       JOIN drivers d ON d.id = s.driver_id
       LEFT JOIN driving_test_routes r ON r.id = s.route_id
       WHERE s.id = $1`,
      [sessionId]
    );
    return res.rows[0] || null;
  }

  public static async findRecordingsBySessionId(sessionId: string): Promise<DrivingTestRecording[]> {
    await this.ensureTables();
    const res = await query(
      `SELECT * FROM driving_test_recordings 
       WHERE session_id = $1 
       ORDER BY camera_type, segment_index ASC`,
      [sessionId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      cameraType: r.camera_type,
      camera_type: r.camera_type,
      segmentIndex: Number(r.segment_index),
      durationMs: Number(r.duration_ms),
      s3Bucket: r.s3_bucket,
      s3_bucket: r.s3_bucket,
      s3Key: r.s3_key,
      s3_key: r.s3_key,
      fileSizeBytes: Number(r.file_size_bytes),
      checksumSha256: r.checksum_sha256,
      isUploaded: r.is_uploaded,
      isPurged: r.is_purged,
      createdAt: r.created_at,
    })) as any;
  }

  public static async findTelemetryBySessionId(sessionId: string, limit: number = 400): Promise<DrivingTelemetryPoint[]> {
    await this.ensureTables();
    const res = await query(
      `SELECT * FROM driving_test_telemetry 
       WHERE session_id = $1 
       ORDER BY timestamp ASC 
       LIMIT $2`,
      [sessionId, limit]
    );
    return res.rows.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      timestamp: Number(r.timestamp),
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      speedKmh: Number(r.speed_kmh),
      heading: Number(r.heading),
      accuracy: Number(r.accuracy),
      flaggedEvent: r.flagged_event,
      createdAt: r.created_at,
    }));
  }

  public static async updateSessionDecision(
    sessionId: string,
    adminId: string,
    dto: AdminDecisionDto
  ): Promise<any> {
    await this.ensureTables();
    let scoreSql = '';
    const params: any[] = [dto.decision, adminId, dto.notes, sessionId];

    if (dto.scoreOverride !== undefined && dto.scoreOverride !== null) {
      scoreSql = ', drive_score = $5';
      params.push(dto.scoreOverride);
    }

    const res = await query(
      `UPDATE driving_test_sessions 
       SET admin_decision = $1,
           admin_reviewer_id = $2,
           admin_notes = $3,
           reviewed_at = NOW(),
           updated_at = NOW()
           ${scoreSql}
       WHERE id = $4
       RETURNING *`,
      params
    );
    return res.rows[0] || null;
  }

  public static async updateDriverStatus(driverId: string, decision: string): Promise<void> {
    if (decision === 'APPROVED') {
      await query(
        `UPDATE drivers 
         SET status = 'active',
             onboarding_status = 'ONBOARDING_COMPLETED',
             kyc_status = 'VERIFIED',
             updated_at = NOW()
         WHERE id = $1`,
        [driverId]
      );
    } else if (decision === 'RETEST_REQUESTED') {
      await query(
        `UPDATE drivers 
         SET onboarding_status = 'DRIVING_TEST_RETEST',
             updated_at = NOW()
         WHERE id = $1`,
        [driverId]
      );
    } else if (decision === 'REJECTED') {
      await query(
        `UPDATE drivers 
         SET status = 'inactive',
             status_reason = 'Driving assessment failed',
             onboarding_status = 'REJECTED',
             updated_at = NOW()
         WHERE id = $1`,
        [driverId]
      );
    }
  }

  public static async listRoutes(): Promise<DrivingTestRoute[]> {
    await this.ensureTables();
    const res = await query(`SELECT * FROM driving_test_routes ORDER BY created_at DESC`);
    return res.rows;
  }

  public static async createRoute(route: Partial<DrivingTestRoute>): Promise<DrivingTestRoute> {
    await this.ensureTables();
    const res = await query(
      `INSERT INTO driving_test_routes 
         (title, city, total_distance_meters, estimated_duration_minutes, polyline, checkpoints, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        route.title,
        route.city,
        route.totalDistanceMeters,
        route.estimatedDurationMinutes || 20,
        JSON.stringify(route.polyline || []),
        JSON.stringify(route.checkpoints || []),
        route.isActive !== undefined ? route.isActive : true,
      ]
    );
    return res.rows[0];
  }

  public static async updateRoute(id: string, updates: Partial<DrivingTestRoute>): Promise<DrivingTestRoute | null> {
    await this.ensureTables();
    const fields: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (updates.title) {
      fields.push(`title = $${pIdx++}`);
      params.push(updates.title);
    }
    if (updates.city) {
      fields.push(`city = $${pIdx++}`);
      params.push(updates.city);
    }
    if (updates.totalDistanceMeters) {
      fields.push(`total_distance_meters = $${pIdx++}`);
      params.push(updates.totalDistanceMeters);
    }
    if (updates.estimatedDurationMinutes) {
      fields.push(`estimated_duration_minutes = $${pIdx++}`);
      params.push(updates.estimatedDurationMinutes);
    }
    if (updates.checkpoints) {
      fields.push(`checkpoints = $${pIdx++}`);
      params.push(JSON.stringify(updates.checkpoints));
    }
    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${pIdx++}`);
      params.push(updates.isActive);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const res = await query(
      `UPDATE driving_test_routes SET ${fields.join(', ')} WHERE id = $${pIdx} RETURNING *`,
      params
    );
    return res.rows[0] || null;
  }
}
