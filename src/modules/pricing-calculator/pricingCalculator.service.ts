import { query } from '../../shared/database';
import { TaxRepository } from '../tax-management/tax.repository';

type TripType = 'one_way' | 'round_trip';

// Hardcoded fallback rates used only when no fare rule exists for the zone
const FALLBACK_RATES: Record<string, { per_km: number; per_hour: number }> = {
  normal: { per_km: 10, per_hour: 100 },
  elite: { per_km: 12, per_hour: 120 },
  premium: { per_km: 18, per_hour: 180 },
};

const RIDE_TYPES = ['normal', 'elite', 'premium'];

/**
 * Piecewise distance charge: band [0, t1) is billed at `baseRate` (the zone /
 * matching time-slot ₹/km); each checkpoint defines an absolute ₹/km for the band
 * starting at its from_km. Charge = Σ(km in band × band rate).
 */
function computeDistanceCharge(
  distanceKm: number,
  baseRate: number,
  checkpoints: Array<{ from_km: number; price: number }>
): { charge: number; bands: Array<{ from_km: number; to_km: number | null; rate: number; km: number; amount: number }> } {
  const sorted = checkpoints
    .map((c) => ({ from_km: Number(c.from_km), price: Number(c.price) }))
    .filter((c) => c.from_km > 0)
    .sort((a, b) => a.from_km - b.from_km);

  const segments = [{ start: 0, rate: baseRate }, ...sorted.map((c) => ({ start: c.from_km, rate: c.price }))];

  let charge = 0;
  const bands = [];
  for (let i = 0; i < segments.length; i++) {
    const start = segments[i].start;
    const end = i + 1 < segments.length ? segments[i + 1].start : null;
    if (end !== null && distanceKm <= start) break;
    const bandEnd = end === null ? distanceKm : Math.min(distanceKm, end);
    const km = Math.max(0, bandEnd - start);
    const amount = km * segments[i].rate;
    charge += amount;
    bands.push({ from_km: start, to_km: end, rate: segments[i].rate, km, amount });
  }
  return { charge, bands };
}

export const PricingCalculatorService = {
  async calculateAllTypes(input: {
    distance_km: number;
    duration_min: number;
    day: string;
    time: string;
    trip_type?: TripType;
    driver_type?: string;
    from_area?: string | null;
    from_district: string;
    to_area?: string | null;
    to_district?: string | null;
  }) {
    const { distance_km, duration_min, day, time, from_area, from_district } = input;
    const tripType: TripType = input.trip_type === 'round_trip' ? 'round_trip' : 'one_way';

    // Check if a time "HH:mm" falls inside a [from, to] range (supports overnight)
    const isTimeInRange = (currentTime: string, from: string, to: string) => {
      const toMin = (s: string) => {
        const p = s.split(':').map(Number);
        return p[0] * 60 + p[1];
      };
      const currentVal = toMin(currentTime);
      const startVal = toMin(from);
      const endVal = toMin(to);
      if (endVal < startVal) return currentVal >= startVal || currentVal < endVal;
      return currentVal >= startVal && currentVal < endVal;
    };

    // 1. Fetch the zone fare rule (district / area specific) + hotspot
    const fareRuleResult = await query(
      `SELECT p.id AS rule_id, p.is_hotspot,
              p.per_km_price, p.per_hour_price, p.minimum_fare, p.one_way_return_pct,
              p.multiplier AS rule_multiplier,
              h.id AS hotspot_id, h.hotspot_name, h.multiplier AS hotspot_multiplier, h.fare AS hotspot_fare,
              d.name AS district_name, a.name AS area_name
       FROM price_and_fare_rules p
       LEFT JOIN districts d ON p.district_id = d.id
       LEFT JOIN areas a ON p.area_id = a.id
       LEFT JOIN hotspots h ON p.hotspot_id = h.id
       WHERE d.name ILIKE $1
         AND (
           ($2::text IS NOT NULL AND a.name ILIKE $2)
           OR (p.area_id IS NULL)
         )
       ORDER BY p.area_id ASC NULLS LAST LIMIT 1`,
      [from_district, from_area || null]
    );
    const fareRule = fareRuleResult.rows[0];

    // 2. Distance tiers (checkpoints) for the rule
    let checkpoints: Array<{ from_km: number; price: number }> = [];
    if (fareRule?.rule_id) {
      const cpResult = await query(
        `SELECT from_km, price FROM extra_km_checkpoints
         WHERE pricing_fare_rule_id = $1 ORDER BY from_km ASC`,
        [fareRule.rule_id]
      );
      checkpoints = cpResult.rows;
    }

    // 3. Time-slot rates for the zone on this day
    let timeSlotPricings: any[] = [];
    if (fareRule?.rule_id) {
      const tsResult = await query(
        `SELECT driver_types, from_time, to_time, per_km_rate, per_hour_rate
         FROM driver_time_slots_pricing
         WHERE price_and_fare_rules_id = $1 AND day ILIKE $2`,
        [fareRule.rule_id, day]
      );
      timeSlotPricings = tsResult.rows;
    }

    // 4. Waiting / cancellation reference data (informational; not part of base fare)
    const rateDetailsResult = await query(
      `SELECT rd.driver_type, rd.cancellation_fee, rd.waiting_per_min, rd.waiting_fee
       FROM created_locations l
       JOIN rate_details rd ON rd.location_id = l.location_id
       WHERE l.district ILIKE $1 AND ($2::text IS NULL OR l.area ILIKE $2)`,
      [from_district, from_area || null]
    );
    const rateDetails = rateDetailsResult.rows;

    // 5. Active taxes
    const activeTaxes = await TaxRepository.getActiveTaxes();

    const surgeMultiplier =
      fareRule && fareRule.hotspot_multiplier
        ? parseFloat(fareRule.hotspot_multiplier)
        : fareRule && fareRule.rule_multiplier
          ? parseFloat(fareRule.rule_multiplier)
          : 1.0;
    const hotspotFare =
      fareRule && fareRule.is_hotspot && fareRule.hotspot_fare
        ? parseFloat(fareRule.hotspot_fare)
        : 0;
    const oneWayReturnPct = fareRule ? parseFloat(fareRule.one_way_return_pct) || 0 : 0;
    const minimumFare = fareRule ? parseFloat(fareRule.minimum_fare) || 0 : 0;

    const requestedTypes =
      input.driver_type && RIDE_TYPES.includes(input.driver_type)
        ? [input.driver_type]
        : RIDE_TYPES;

    const rideOptions = [];
    for (const ride_type of requestedTypes) {
      // Matching time slot for this driver type + current time
      const matchingTimeSlot = timeSlotPricings.find((ts) => {
        const typeMatch = ts.driver_types && ts.driver_types.toLowerCase().includes(ride_type);
        const timeMatch = isTimeInRange(time, ts.from_time, ts.to_time);
        return typeMatch && timeMatch;
      });

      // Effective rates: matching slot overrides zone base; else zone defaults; else fallback
      const fallback = FALLBACK_RATES[ride_type] || FALLBACK_RATES.normal;
      const perKm = matchingTimeSlot
        ? parseFloat(matchingTimeSlot.per_km_rate)
        : fareRule && fareRule.per_km_price != null
          ? parseFloat(fareRule.per_km_price)
          : fallback.per_km;
      const perHour = matchingTimeSlot
        ? parseFloat(matchingTimeSlot.per_hour_rate)
        : fareRule && fareRule.per_hour_price != null
          ? parseFloat(fareRule.per_hour_price)
          : fallback.per_hour;

      // Components
      const { charge: distance_charge, bands } = computeDistanceCharge(distance_km, perKm, checkpoints);
      const time_charge = perHour * (duration_min / 60);
      const return_charge =
        tripType === 'one_way' ? distance_charge * (oneWayReturnPct / 100) : 0;

      const trip = distance_charge + time_charge + return_charge;
      const subtotal = trip * surgeMultiplier + hotspotFare;
      const fare = Math.max(subtotal, minimumFare);

      // Taxes on the (floored) fare
      const taxDetails = activeTaxes.map((tax) => {
        const taxAmount = (fare * parseFloat(tax.percentage)) / 100;
        return {
          tax_name: tax.tax_name,
          tax_type: tax.tax_type,
          percentage: tax.percentage,
          amount: taxAmount,
        };
      });
      const totalTaxes = taxDetails.reduce((sum, t) => sum + t.amount, 0);
      const total_fare = fare + totalTaxes;

      const matchingRateDetail = rateDetails.find((rd) => rd.driver_type === ride_type);

      rideOptions.push({
        ride_type,
        fare_details: {
          per_km: perKm,
          per_hour: perHour,
          distance_km,
          duration_min,
          distance_charge,
          time_charge,
          return_charge,
          distance_bands: bands,
          surge_multiplier: surgeMultiplier,
          hotspot_fare: hotspotFare,
          minimum_fare: minimumFare,
          subtotal,
          fare,
          taxes: taxDetails,
          total_taxes: totalTaxes,
          total_fare,
          // Informational extras (charged separately, not part of base fare)
          cancellation_fee: matchingRateDetail ? parseFloat(matchingRateDetail.cancellation_fee) : null,
          waiting_per_min: matchingRateDetail ? parseFloat(matchingRateDetail.waiting_per_min) : null,
          waiting_fee: matchingRateDetail ? parseFloat(matchingRateDetail.waiting_fee) : null,
        },
      });
    }

    // Time-of-day label for output
    let time_slot_label = 'normal';
    if (day.toLowerCase() === 'saturday' || day.toLowerCase() === 'sunday') {
      time_slot_label = 'weekend';
    } else {
      const hour = parseInt(time.split(':')[0], 10);
      if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20)) time_slot_label = 'peak';
      else if (hour >= 22 || hour <= 5) time_slot_label = 'night';
    }

    return {
      success: true,
      trip_type: tripType,
      pricing_zone: {
        district: fareRule?.district_name || from_district,
        area: fareRule?.area_name || from_area || null,
        rule_id: fareRule?.rule_id || null,
        per_km_price: fareRule ? parseFloat(fareRule.per_km_price) : null,
        per_hour_price: fareRule ? parseFloat(fareRule.per_hour_price) : null,
        minimum_fare: minimumFare,
        one_way_return_pct: oneWayReturnPct,
        is_hotspot: fareRule?.is_hotspot || false,
        hotspot_name: fareRule?.hotspot_name || null,
        hotspot_fare: hotspotFare,
        multiplier: surgeMultiplier,
      },
      time_slot_info: {
        label: time_slot_label,
        matched_count: timeSlotPricings.length,
        available_slots: timeSlotPricings,
      },
      taxes_applied: activeTaxes.map((t) => ({
        tax_name: t.tax_name,
        percentage: t.percentage,
      })),
      ride_options: rideOptions,
    };
  },
};
