import { S3, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DrivingTestRepository } from './driving-test.repository';
import { DrivingTestRecording, AdminDecisionDto } from './driving-test.model';
import { notifyUserBackend } from '../../shared/eventBus';
import { logger } from '../../shared/logger';

export class DrivingTestService {
  private static s3Client: S3 | null = null;
  private static bucketName = process.env.S3_BUCKET_NAME || '';

  private static getS3(): S3 {
    if (!this.s3Client) {
      this.s3Client = new S3({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
    }
    return this.s3Client;
  }

  public static async verifyObjectExists(
    bucket: string,
    key: string
  ): Promise<{ exists: boolean; contentLength: number; contentType?: string }> {
    try {
      const s3 = this.getS3();
      const head = await s3.send(
        new HeadObjectCommand({
          Bucket: bucket || this.bucketName,
          Key: key,
        })
      );
      const contentLength = Number(head.ContentLength || 0);
      return {
        exists: contentLength > 0,
        contentLength,
        contentType: head.ContentType,
      };
    } catch (err) {
      logger.warn(`S3 recording object missing or inaccessible for ${key}:`, (err as any)?.message || err);
      return { exists: false, contentLength: 0 };
    }
  }

  public static async generatePlaybackUrl(
    bucket: string,
    key: string,
    expiresInSec = 7200,
    responseContentType = 'video/mp4'
  ): Promise<string> {
    try {
      const s3 = this.getS3();
      const command = new GetObjectCommand({
        Bucket: bucket || this.bucketName,
        Key: key,
        ResponseContentType: responseContentType,
      });
      return await getSignedUrl(s3, command, { expiresIn: expiresInSec });
    } catch (err) {
      logger.warn(`Failed to generate signed S3 playback URL for ${key}:`, err);
      const region = process.env.AWS_REGION || 'ap-south-1';
      return `https://${bucket || this.bucketName}.s3.${region}.amazonaws.com/${key}`;
    }
  }

  public static async getSessionReviewReport(sessionId: string): Promise<any> {
    const session = await DrivingTestRepository.findSessionById(sessionId);
    if (!session) return null;

    const recordings = await DrivingTestRepository.findRecordingsBySessionId(sessionId);
    const telemetry = await DrivingTestRepository.findTelemetryBySessionId(sessionId, 400);

    const frontVideos: DrivingTestRecording[] = [];
    const rearVideos: DrivingTestRecording[] = [];

    for (const rec of recordings) {
      const bucket = (rec as any).s3Bucket || (rec as any).s3_bucket || this.bucketName;
      const key = (rec as any).s3Key || (rec as any).s3_key;
      const camType = String((rec as any).cameraType || (rec as any).camera_type || '').toUpperCase();

      if (rec.isPurged || !key || key === '[PURGED_BY_POLICY]') {
        const purgedEntry: any = {
          ...rec,
          available: false,
          playbackUrl: null,
          error: 'Recording purged per retention policy',
        };
        if (camType === 'FRONT_CABIN' || camType === 'FRONT') {
          frontVideos.push(purgedEntry);
        } else {
          rearVideos.push(purgedEntry);
        }
        continue;
      }

      const head = await this.verifyObjectExists(bucket, key);
      const playbackUrl = head.exists
        ? await this.generatePlaybackUrl(bucket, key, 7200, head.contentType || 'video/mp4')
        : null;

      const enriched: any = {
        ...rec,
        available: head.exists,
        actualFileSizeBytes: head.contentLength || rec.fileSizeBytes || 0,
        contentType: head.contentType || 'video/mp4',
        playbackUrl,
        ...(head.exists ? {} : { error: 'Recording file not found in S3 storage' }),
      };

      if (camType === 'FRONT_CABIN' || camType === 'FRONT') {
        frontVideos.push(enriched);
      } else {
        rearVideos.push(enriched);
      }
    }

    // Identify flagged events in telemetry for timeline scrubber bookmarking
    const flaggedEvents = telemetry
      .filter((t) => t.flaggedEvent && t.flaggedEvent !== 'NONE')
      .map((t) => ({
        timestamp: t.timestamp,
        event: t.flaggedEvent,
        speedKmh: t.speedKmh,
        latitude: t.latitude,
        longitude: t.longitude,
      }));

    return {
      session,
      media: {
        frontVideos,
        rearVideos,
        totalSegments: recordings.length,
      },
      scrubber: {
        telemetry,
        flaggedEvents,
        pointsCount: telemetry.length,
      },
    };
  }

  public static async submitAdminDecision(
    sessionId: string,
    adminId: string,
    dto: AdminDecisionDto
  ): Promise<any> {
    const session = await DrivingTestRepository.findSessionById(sessionId);
    if (!session) {
      throw new Error('Driving assessment session not found');
    }

    // 1. Update session record
    const updatedSession = await DrivingTestRepository.updateSessionDecision(sessionId, adminId, dto);

    // 2. Update driver onboarding and active status
    await DrivingTestRepository.updateDriverStatus(session.driver_id, dto.decision);

    // 3. Notify driver mobile app and User backend via event bus
    try {
      notifyUserBackend('DRIVER_ONBOARDING_STATUS_CHANGED', {
        driverId: session.driver_id,
        sessionId,
        decision: dto.decision,
        finalScore: dto.scoreOverride !== undefined ? dto.scoreOverride : session.drive_score,
        status: dto.decision === 'APPROVED' ? 'COMPLETED' : dto.decision,
        timestamp: new Date().toISOString(),
      });
      logger.info(`✅ Admin decision for session ${sessionId} dispatched to driver ${session.driver_id}`);
    } catch (e) {
      logger.warn('Failed to publish DRIVER_ONBOARDING_STATUS_CHANGED on event bus:', e);
    }

    return updatedSession;
  }
}
