import { DriverTimeSlotsPricing } from './driverTimeSlotsPricing.model';

// Per driver-type default rate card (used when no day/time slot matches)
export interface DriverRateCard {
  id: string;
  pricing_fare_rule_id: string;
  driver_types: string;
  per_hour_rate: number;
  per_km_rate: number;
  free_km: number;
  minimum_fare: number;
}

// Per driver-type duration slab ("from X hours → ₹/hr")
export interface TimeSlab {
  id: string;
  pricing_fare_rule_id: string;
  driver_types: string;
  from_hours: number;
  per_hour_rate: number;
  sort_order: number;
}

// Zone-wide pricing rule
export interface PricingFareRule {
  id: string;
  district_id: string;
  area_id: string | null;
  one_way_return_pct: number;
  night_charge_pct: number;
  night_start: string;
  night_end: string;
  outstation_allowance_per_day: number;
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
  one_way_return_pct: number;
  night_charge_pct: number;
  night_start: string;
  night_end: string;
  outstation_allowance_per_day: number;
  is_hotspot: boolean;
  hotspot_id: string | null;
  hotspot_name: string | null;
  multiplier: number | null;
  rate_cards?: DriverRateCard[];
  time_slabs?: TimeSlab[];
  time_slots?: DriverTimeSlotsPricing[];
}
