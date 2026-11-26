export enum DrivingTestStatus {
  INITIATED = 'INITIATED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  TERMINATED = 'TERMINATED',
  FAILED = 'FAILED',
}

export enum AutoVerdict {
  RECOMMENDED_PASS = 'RECOMMENDED_PASS',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  RECOMMENDED_FAIL = 'RECOMMENDED_FAIL',
  PENDING = 'PENDING',
}

export enum AdminDecision {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  RETEST_REQUESTED = 'RETEST_REQUESTED',
  REJECTED = 'REJECTED',
}

export enum CameraType {
  FRONT_CABIN = 'FRONT_CABIN',
  REAR_ROAD = 'REAR_ROAD',
}

export enum InfractionType {
  NONE = 'NONE',
  HARSH_BRAKE = 'HARSH_BRAKE',
  RAPID_ACCEL = 'RAPID_ACCEL',
  SPEED_LIMIT_BREACH = 'SPEED_LIMIT_BREACH',
  SIGNAL_STOP_BREACH = 'SIGNAL_STOP_BREACH',
  ROUTE_DEVIATION = 'ROUTE_DEVIATION',
  PHONE_HANDLING = 'PHONE_HANDLING',
}

export interface ScoreBreakdown {
  braking: number;
  acceleration: number;
  turning: number;
  speed: number;
  route: number;
  parking: number;
  signal: number;
}

export interface InfractionsCount {
  harshBrakes: number;
  rapidAccels: number;
  overspeeds: number;
  signalViolations: number;
  routeDeviations?: number;
  phoneHandlingEvents?: number;
}

export interface RouteCheckpoint {
  sequenceOrder: number;
  checkpointType: 'START' | 'TURN_LEFT' | 'TURN_RIGHT' | 'TRAFFIC_SIGNAL' | 'REVERSE_PARKING' | 'DESTINATION';
  latitude: number;
  longitude: number;
  radiusMeters: number;
  speedLimitKmh?: number;
  voiceInstructionEn: string;
  voiceInstructionTa: string;
}

export interface DrivingTestRoute {
  id: string;
  title: string;
  city: string;
  totalDistanceMeters: number;
  estimatedDurationMinutes: number;
  polyline: Array<{ latitude: number; longitude: number }>;
  checkpoints: RouteCheckpoint[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DrivingTestSession {
  id: string;
  driverId: string;
  routeId?: string;
  status: DrivingTestStatus;
  startedAt: Date;
  completedAt?: Date;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  deviceModel?: string;
  simultaneousCameraSupported: boolean;
  driveScore?: number;
  scoreBreakdown?: ScoreBreakdown;
  autoVerdict: AutoVerdict;
  infractionsCount?: InfractionsCount;
  adminDecision: AdminDecision;
  adminReviewerId?: string;
  adminNotes?: string;
  reviewedAt?: Date;
  retentionExpiresAt?: Date;
  recordingsDeleted: boolean;
  legalHold: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DrivingTestRecording {
  id: string;
  sessionId: string;
  cameraType: CameraType;
  segmentIndex: number;
  durationMs: number;
  s3Bucket: string;
  s3Key: string;
  fileSizeBytes: number;
  checksumSha256?: string;
  isUploaded: boolean;
  isPurged: boolean;
  createdAt: Date;
  playbackUrl?: string;
}

export interface DrivingTelemetryPoint {
  id?: string;
  sessionId: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading?: number;
  accuracy?: number;
  flaggedEvent?: InfractionType;
  createdAt?: Date;
}

export interface AdminDecisionDto {
  decision: 'APPROVED' | 'RETEST_REQUESTED' | 'REJECTED';
  notes: string;
  scoreOverride?: number;
}
