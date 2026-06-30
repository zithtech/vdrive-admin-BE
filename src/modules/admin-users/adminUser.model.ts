export interface AdminUser {
  id: string;
  name: string;
  password: string;
  email: string;
  contact: string | null;
  role: string;
  role_id: string | null;
  reset_token: string | null;
  reset_token_expiry: Date | null;
  email_verified: boolean;
  verification_token: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  is_deleted: boolean;
}

export type PublicAdminUser = Omit<AdminUser, 'password' | 'reset_token' | 'reset_token_expiry' | 'verification_token'>;
