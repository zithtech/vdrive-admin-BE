export interface Tax {
  id?: string;
  tax_name: string;
  tax_code: string;
  tax_type: string;
  percentage: number;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  indian_tax?: string;
  created_at?: Date;
  updated_at?: Date;
}
