import { query } from '../../shared/database';
import { TaxRepository } from '../tax-management/tax.repository';

type TripType = 'one_way' | 'round_trip';

// Fallback rate card used only when a zone rule / rate card is missing
const FALLBACK_RATES: Record<string, { per_hour: number; per_km: number }> = {
  normal: { per_hour: 100, per_km: 0 },
  elite: { per_hour: 160, per_km: 0 },
  premium: { per_hour: 220, per_km: 0 },
};
const RIDE_TYPES = ['normal', 'elite', 'premium'];

/**
 * Piecewise time charge over duration slabs.
 * segments: [{from: 0, rate: card base}, ...slabs sorted by from_hours].
 * charge = Σ (hours within [seg.from, next.from) capped at total hours) × seg.rate.
 */
function computeTimeCharge(
  hours: number,
  baseRate: number,
  slabs: Array<{ from_hours: number; per_hour_rate: number }>
): { charge: number; segments: Array<{ from: number; to: number | null; rate: number; hours: number; amount: number }> } {
  const sorted = slabs
    .map((s) => ({ from: Number(s.from_hours), rate: Number(s.per_hour_rate) }))
    .filter((s) => s.from > 0)
    .sort((a, b) => a.from - b.from);
  const segments = [{ start: 0, rate: baseRate }, ...sorted.map((s) => ({ start: s.from, rate: s.rate }))];

  let charge = 0;
  const out = [];
  for (let i = 0; i < segments.length; i++) {
    const start = segments[i].start;
    const end = i + 1 < segments.length ? segments[i + 1].start : null;
    if (end !== null && hours <= start) break;
    const segEnd = end === null ? hours : Math.min(hours, end);
    const h = Math.max(0, segEnd - start);
    const amount = h * segments[i].rate;
    charge += amount;
    out.push({ from: start, to: end, rate: segments[i].rate, hours: h, amount });
  }
  return { charge, segments: out };
}

export const PricingCalculatorService = {
  async calculateAllTypes(input: {
    distance_km: number;
    duration_min: number;
    day: string;
    time: string;
    trip_type?: TripType;
    is_outstation?: boolean;
    days?: number;
    driver_type?: string;
    from_area?: string | null;
    from_district: string;
    to_area?: string | null;
    to_district?: string | null;
  }) {
    const { distance_km, duration_min, day, time, from_area, from_district } = input;
    const tripType: TripType = input.trip_type === 'round_trip' ? 'round_trip' : 'one_way';
    const isOutstation = !!input.is_outstation;
    const days = input.days && input.days > 0 ? input.days : 1;
    const hours = duration_min / 60;

    const isTimeInRange = (currentTime: string, from: string, to: string) => {
      const toMin = (s: string) => {
        const p = s.split(':').map(Number);
        return p[0] * 60 + p[1];
      };
      const cur = toMin(currentTime);
      const start = toMin(from);
      const end = toMin(to);
      if (end < start) return cur >= start || cur < end;
      return cur >= start && cur < end;
    };

    // 1. Zone fare rule (+ hotspot)
    const fareRuleResult = await query(
      `SELECT p.id AS rule_id,
              p.one_way_return_pct, p.night_charge_pct, p.night_start, p.night_end,
              p.outstation_allowance_per_day, p.is_hotspot, p.multiplier AS rule_multiplier,
              h.id AS hotspot_id, h.hotspot_name, h.multiplier AS hotspot_multiplier, h.fare AS hotspot_fare,
              d.name AS district_name, a.name AS area_name
       FROM price_and_fare_rules p
       LEFT JOIN districts d ON p.district_id = d.id
       LEFT JOIN areas a ON p.area_id = a.id
       LEFT JOIN hotspots h ON p.hotspot_id = h.id
       WHERE d.name ILIKE $1
         AND (($2::text IS NOT NULL AND a.name ILIKE $2) OR (p.area_id IS NULL))
       ORDER BY p.area_id ASC NULLS LAST LIMIT 1`,
      [from_district, from_area || null]
    );
    const fareRule = fareRuleResult.rows[0];

    // 2. Per-type rate cards, duration slabs, day/time slots
    let rateCards: any[] = [];
    let timeSlabs: any[] = [];
    let timeSlots: any[] = [];
    if (fareRule?.rule_id) {
      rateCards = (
        await query(
          `SELECT driver_types, per_hour_rate, per_km_rate, free_km, minimum_fare
           FROM pricing_driver_rate_cards WHERE pricing_fare_rule_id = $1`,
          [fareRule.rule_id]
        )
      ).rows;
      timeSlabs = (
        await query(
          `SELECT driver_types, from_hours, per_hour_rate
           FROM pricing_time_slabs WHERE pricing_fare_rule_id = $1 ORDER BY from_hours ASC`,
          [fareRule.rule_id]
        )
      ).rows;
      timeSlots = (
        await query(
          `SELECT driver_types, from_time, to_time, per_km_rate, per_hour_rate
           FROM driver_time_slots_pricing WHERE price_and_fare_rules_id = $1 AND day ILIKE $2`,
          [fareRule.rule_id, day]
        )
      ).rows;
    }

    const activeTaxes = await TaxRepository.getActiveTaxes();

    const surge =
      fareRule && fareRule.hotspot_multiplier
        ? parseFloat(fareRule.hotspot_multiplier)
        : fareRule && fareRule.rule_multiplier
          ? parseFloat(fareRule.rule_multiplier)
          : 1.0;
    const hotspotFare =
      fareRule && fareRule.is_hotspot && fareRule.hotspot_fare ? parseFloat(fareRule.hotspot_fare) : 0;
    const oneWayReturnPct = fareRule ? parseFloat(fareRule.one_way_return_pct) || 0 : 0;
    const nightChargePct = fareRule ? parseFloat(fareRule.night_charge_pct) || 0 : 0;
    const outstationPerDay = fareRule ? parseFloat(fareRule.outstation_allowance_per_day) || 0 : 0;
    const isNight =
      nightChargePct > 0 && fareRule
        ? isTimeInRange(time, fareRule.night_start, fareRule.night_end)
        : false;

    const requestedTypes =
      input.driver_type && RIDE_TYPES.includes(input.driver_type) ? [input.driver_type] : RIDE_TYPES;

    const rideOptions = [];
    for (const ride_type of requestedTypes) {
      const card = rateCards.find((c) => c.driver_types?.toLowerCase().includes(ride_type));
      const fallback = FALLBACK_RATES[ride_type] || FALLBACK_RATES.normal;
      const freeKm = card ? parseFloat(card.free_km) : 0;
      const minimumFare = card ? parseFloat(card.minimum_fare) : 0;

      const slot = timeSlots.find(
        (ts) =>
          ts.driver_types?.toLowerCase().includes(ride_type) &&
          isTimeInRange(time, ts.from_time, ts.to_time)
      );

      // Hourly: matching slot overrides (flat); else duration slabs from the rate card
      let time_charge: number;
      let perKm: number;
      let timeSegments: any[] = [];
      if (slot) {
        time_charge = parseFloat(slot.per_hour_rate) * hours;
        perKm = parseFloat(slot.per_km_rate);
      } else {
        const baseHour = card ? parseFloat(card.per_hour_rate) : fallback.per_hour;
        const slabs = timeSlabs.filter((s) => s.driver_types?.toLowerCase().includes(ride_type));
        const r = computeTimeCharge(hours, baseHour, slabs);
        time_charge = r.charge;
        timeSegments = r.segments;
        perKm = card ? parseFloat(card.per_km_rate) : fallback.per_km;
      }

      const distance_charge = Math.max(0, distance_km - freeKm) * perKm;
      const return_charge = tripType === 'one_way' ? distance_charge * (oneWayReturnPct / 100) : 0;
      const base = time_charge + distance_charge + return_charge;
      const night_charge = isNight ? base * (nightChargePct / 100) : 0;
      const outstation_allowance = isOutstation ? outstationPerDay * days : 0;
      const subtotal = (base + night_charge) * surge + hotspotFare + outstation_allowance;
      const fare = Math.max(subtotal, minimumFare);

      const taxDetails = activeTaxes.map((tax) => ({
        tax_name: tax.tax_name,
        tax_type: tax.tax_type,
        percentage: tax.percentage,
        amount: (fare * parseFloat(tax.percentage)) / 100,
      }));
      const totalTaxes = taxDetails.reduce((s, t) => s + t.amount, 0);

      rideOptions.push({
        ride_type,
        fare_details: {
          per_hour: slot ? parseFloat(slot.per_hour_rate) : card ? parseFloat(card.per_hour_rate) : fallback.per_hour,
          per_km: perKm,
          free_km: freeKm,
          distance_km,
          duration_min,
          hours,
          rate_source: slot ? 'time_slot' : 'rate_card',
          time_charge,
          time_segments: timeSegments,
          distance_charge,
          return_charge,
          night_charge,
          surge_multiplier: surge,
          hotspot_fare: hotspotFare,
          outstation_allowance,
          minimum_fare: minimumFare,
          subtotal,
          fare,
          taxes: taxDetails,
          total_taxes: totalTaxes,
          total_fare: fare + totalTaxes,
        },
      });
    }

    let time_slot_label = 'normal';
    if (day.toLowerCase() === 'saturday' || day.toLowerCase() === 'sunday') time_slot_label = 'weekend';
    else {
      const hr = parseInt(time.split(':')[0], 10);
      if ((hr >= 8 && hr <= 11) || (hr >= 17 && hr <= 20)) time_slot_label = 'peak';
      else if (hr >= 22 || hr <= 5) time_slot_label = 'night';
    }

    return {
      success: true,
      trip_type: tripType,
      is_outstation: isOutstation,
      days,
      pricing_zone: {
        district: fareRule?.district_name || from_district,
        area: fareRule?.area_name || from_area || null,
        rule_id: fareRule?.rule_id || null,
        one_way_return_pct: oneWayReturnPct,
        night_charge_pct: nightChargePct,
        is_night: isNight,
        outstation_allowance_per_day: outstationPerDay,
        is_hotspot: fareRule?.is_hotspot || false,
        hotspot_name: fareRule?.hotspot_name || null,
        hotspot_fare: hotspotFare,
        multiplier: surge,
      },
      time_slot_info: {
        label: time_slot_label,
        matched_count: timeSlots.length,
      },
      taxes_applied: activeTaxes.map((t) => ({ tax_name: t.tax_name, percentage: t.percentage })),
      ride_options: rideOptions,
    };
  },
};
