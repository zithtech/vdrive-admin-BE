// src/modules/driver-reconciliation/driverReconciliation.model.ts

export interface DriverReconciliationUpload {
  id: number;
  admin_id: string;
  filename: string;
  total_rows: number;
  processed_rows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: Date;
  updated_at: Date;
}

export interface DriverReconciliationRow {
  id: number;
  upload_id: number;
  driver_name?: string;
  phone?: string;
  mail?: string;
  pincode?: string;
  dob?: Date;
  area?: string;
  street?: string;
  address?: string;
  district?: string;
  state?: string;
  country?: string;
  status: string;
  onboarding_status?: string;
  has_account: boolean;
  is_onboarded: boolean;
  match_confidence: number; // 0-3: 1=phone, 2=mail, 3=both
  error_message?: string;
  whatsapp_sent: boolean;
  created_at: Date;
  updated_at: Date;
  joined_date?: Date;
}

export interface DriverReconciliationPayload {
  filename: string;
  data: Array<{
    driver_name?: string;
    phone?: string;
    mail?: string;
    pincode?: string;
    dob?: string; // ISO date string
    area?: string;
    street?: string;
    address?: string;
    district?: string;
    state?: string;
    country?: string;
    status?: string;
    joined_date?: string;
  }>;
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  upload_id?: number;
  processed_rows?: number;
  data?: DriverReconciliationRow[];
  errors?: Array<{
    row_index: number;
    error_message: string;
  }>;
}

export interface MatchResult {
  has_account: boolean;
  is_onboarded: boolean;
  onboarding_status?: string;
  match_confidence: number; // 0-3
  existing_user_id?: string;
  existing_driver_id?: string;
}
