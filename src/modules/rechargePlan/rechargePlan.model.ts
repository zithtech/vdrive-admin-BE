export interface RechargePlan {
  id?: number;
  plan_name: string;
  description?: string;
  ride_limit: number;
  validity_days: number;
  daily_price?: number;
  weekly_price?: number;
  monthly_price?: number;
  features?: any;
  is_active: boolean;
  created_at?: Date;
}
