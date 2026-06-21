import { DriverTimeSlotsPricing } from './driverTimeSlotsPricing.model';

export interface ExtraKmCheckpoint {
  id: string;
  pricing_fare_rule_id: string;
  from_km: number;
  price: number;
  sort_order: number;
}

export interface PricingFareRule {
  id: string;
  district_id: string;
  area_id: string | null;
  per_km_price: number;
  per_hour_price: number;
  minimum_fare: number;
  one_way_return_pct: number;
  is_hotspot: boolean;
  hotspot_id: string | null;
  multiplier: number | null;
}

export interface FareSummary {
  id: string;
  country_name: string;
  country_id: string;
  state_name: string;
  state_id: string;
  district_name: string;
  district_id: string;
  area_name: string | null;
  area_id: string | null;
  pincode: string | null;
  per_km_price: number;
  per_hour_price: number;
  minimum_fare: number;
  one_way_return_pct: number;
  is_hotspot: boolean;
  hotspot_id: string | null;
  hotspot_name: string | null;
  multiplier: number | null;
  extra_km_checkpoints?: ExtraKmCheckpoint[];
  time_slots?: DriverTimeSlotsPricing[];
}
