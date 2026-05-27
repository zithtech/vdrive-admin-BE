export interface Promo {
  id?: number;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  target_type: 'global' | 'specific_driver' | 'ride_count_based';
  target_driver_id?: string;
  min_rides_required?: number;
  max_uses?: number;
  max_uses_per_driver?: number;
  start_date: Date;
  expiry_date?: Date;
  is_active: boolean;
  promo_type: 'OFFER' | 'REFERRAL_REWARD';
  created_at?: Date;
  updated_at?: Date;
}

export interface PromoStats {
  promo_id: number;
  code: string;
  total_used: number;
  total_discount_given: number;
}
