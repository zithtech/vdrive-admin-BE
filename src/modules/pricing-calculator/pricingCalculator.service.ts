import { query } from '../../shared/database';
import { TaxRepository } from '../tax-management/tax.repository';

export const PricingCalculatorService = {
  async calculateAllTypes(input: {
    distance_km: number;
    duration_min: number;
    day: string;
    time: string;
    from_area?: string | null;
    from_district: string;
    to_area?: string | null;
    to_district?: string | null;
  }) {
    const { distance_km, duration_min, day, time, from_area, from_district } = input;

    // Helper: Check if time is in range (input format: "HH:mm", range format: "HH:mm:ss" or "HH:mm")
    const isTimeInRange = (currentTime: string, from: string, to: string) => {
      const current = currentTime.split(':').map(Number);
      const start = from.split(':').map(Number);
      const end = to.split(':').map(Number);

      const currentVal = current[0] * 60 + current[1];
      const startVal = start[0] * 60 + start[1];
      const endVal = end[0] * 60 + end[1];

      // Handle overnight slots (e.g., 22:00 - 05:00)
      if (endVal < startVal) {
        return currentVal >= startVal || currentVal < endVal;
      }
      return currentVal >= startVal && currentVal < endVal;
    };

    // 1. Convert duration to hours for combination lookup
    const duration_hrs = duration_min / 60;

    // 2. Find the best matching Base Pricing Combination
    const baseCombinationResult = await query(
      `SELECT * FROM pricing_combinations 
       WHERE type = 'Base' AND duration <= $1 AND distance <= $2 
       ORDER BY duration DESC, distance DESC LIMIT 1`,
      [duration_hrs, distance_km]
    );

    const baseCombination = baseCombinationResult.rows[0];
    let matrixBaseFare = 0;
    let extraKmRate = 0;
    let baseDistance = 0;

    if (baseCombination) {
      matrixBaseFare = parseFloat(baseCombination.price);
      baseDistance = parseFloat(baseCombination.distance);

      // Look up Extra KM rate for the same tier
      const extraKmResult = await query(
        `SELECT per_km_rate FROM pricing_combinations 
         WHERE type = 'Extra KM' AND tier = $1 LIMIT 1`,
        [baseCombination.tier]
      );
      if (extraKmResult.rows[0]) {
        extraKmRate = parseFloat(extraKmResult.rows[0].per_km_rate);
      }
    }

    // 3. Fetch Pricing Fare Rule & Hotspot Multiplier (Zone specific)
    const fareRuleResult = await query(
      `SELECT p.id as rule_id, p.global_price, p.multiplier as rule_multiplier,
              h.id as hotspot_id, h.multiplier as hotspot_multiplier,
              d.name as district_name, a.name as area_name
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

    // 4. Fetch Time Slot Pricing rules for the zone
    let timeSlotPricings: any[] = [];
    if (fareRule && fareRule.rule_id) {
      const tsResult = await query(
        `SELECT id, driver_types, from_time, to_time, price 
         FROM driver_time_slots_pricing 
         WHERE price_and_fare_rules_id = $1 AND day ILIKE $2`,
        [fareRule.rule_id, day]
      );
      timeSlotPricings = tsResult.rows;
    }

    // 5. Fetch Rate Details (from price-settings - fallback rates)
    const rateDetailsResult = await query(
      `SELECT l.location_id, l.global_price as loc_global_price,
              rd.driver_type, rd.cancellation_fee, rd.waiting_per_min, rd.waiting_fee,
              t.from_time, t.to_time, t.from_type, t.to_type, t.rate as timing_rate
       FROM created_locations l
       JOIN rate_details rd ON rd.location_id = l.location_id
       LEFT JOIN timings t ON t.rate_id = rd.rate_id
       WHERE l.district ILIKE $1 AND ($2::text IS NULL OR l.area ILIKE $2)
         AND (t.day IS NULL OR t.day::text ILIKE $3)`,
      [from_district, from_area || null, day]
    );
    const rateDetails = rateDetailsResult.rows;

    // 6. Fetch Active Taxes
    const activeTaxes = await TaxRepository.getActiveTaxes();

    const rideOptions = [];
    const RIDE_TYPES = ['normal', 'elite', 'premium'];

    for (const ride_type of RIDE_TYPES) {
      // Find matching time slot price for base fare (Filtered by driver type and current time)
      const matchingTimeSlot = timeSlotPricings.find((ts) => {
        const typeMatch = ts.driver_types && ts.driver_types.toLowerCase().includes(ride_type);
        const timeMatch = isTimeInRange(time, ts.from_time, ts.to_time);
        return typeMatch && timeMatch;
      });

      // Find matching rate detail
      const matchingRateDetail = rateDetails.find((rd) => rd.driver_type === ride_type);

      // 1. Determine Base Component (Priority-based)
      let base_fare = 0;
      if (matchingTimeSlot) {
        base_fare = parseFloat(matchingTimeSlot.price);
      } else if (matrixBaseFare > 0) {
        base_fare = matrixBaseFare;
      } else if (fareRule && fareRule.global_price) {
        base_fare = parseFloat(fareRule.global_price);
      } else {
        // Hardcoded fallbacks if no rules found
        base_fare = ride_type === 'normal' ? 40 : ride_type === 'elite' ? 50 : 70;
      }

      // 2. Determine Per KM and Per Min components
      const per_km =
        matchingRateDetail && matchingRateDetail.timing_rate
          ? parseFloat(matchingRateDetail.timing_rate)
          : ride_type === 'normal'
            ? 10
            : ride_type === 'elite'
              ? 12
              : 18;

      const per_min =
        matchingRateDetail && matchingRateDetail.waiting_fee
          ? parseFloat(matchingRateDetail.waiting_fee)
          : ride_type === 'normal'
            ? 2
            : ride_type === 'elite'
              ? 3
              : 4;

      // Surge Multiplier from Hotspot or Fare Rule
      const surge_multiplier =
        fareRule && fareRule.hotspot_multiplier
          ? parseFloat(fareRule.hotspot_multiplier)
          : fareRule && fareRule.rule_multiplier
            ? parseFloat(fareRule.rule_multiplier)
            : 1.0;

      // 3. Final Fare Calculation (Subtotal)
      let distance_fare = 0;
      // If we used Matrix Base Fare, we use Matrix Extra KM rate.
      // Otherwise use the distance rate from rate settings.
      if (matrixBaseFare > 0 && baseDistance > 0 && !matchingTimeSlot) {
        const extra_distance = Math.max(0, distance_km - baseDistance);
        distance_fare = extra_distance * (extraKmRate || per_km);
      } else {
        distance_fare = per_km * distance_km;
      }

      const time_fare = per_min * duration_min;
      const subtotal = (base_fare + distance_fare + time_fare) * surge_multiplier;

      // 4. Calculate Taxes
      const taxDetails = activeTaxes.map((tax) => {
        const taxAmount = (subtotal * parseFloat(tax.percentage)) / 100;
        return {
          tax_name: tax.tax_name,
          tax_type: tax.tax_type,
          percentage: tax.percentage,
          amount: taxAmount,
        };
      });

      const totalTaxes = taxDetails.reduce((sum, tax) => sum + tax.amount, 0);
      const total_fare = subtotal + totalTaxes;

      rideOptions.push({
        ride_type,
        fare_details: {
          base_fare,
          per_km: matrixBaseFare > 0 && !matchingTimeSlot ? extraKmRate || per_km : per_km,
          per_min,
          distance_fare,
          time_fare,
          surge_multiplier,
          subtotal,
          taxes: taxDetails,
          total_taxes: totalTaxes,
          total_fare,
        },
      });
    }

    // Identify time slot label for output
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
      combination_id: baseCombination ? baseCombination.id : 'default_pkg',
      pricing_zone: {
        district: fareRule?.district_name || from_district,
        area: fareRule?.area_name || from_area || null,
        rule_id: fareRule?.rule_id || null,
        global_price: fareRule?.global_price || null,
        is_hotspot: fareRule?.is_hotspot || false,
        hotspot_name: fareRule?.hotspot_name || null,
        multiplier: fareRule?.hotspot_multiplier || fareRule?.rule_multiplier || 1.0,
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
