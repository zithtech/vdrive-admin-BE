import { PricingFareRulesRepository } from './pricingFareRules.repository';
import { PricingFareRule, FareSummary } from './pricingFareRules.model';
import { DriverTimeSlotsPricingRepository } from './driverTimeSlotsPricing.repository';
import { DriverRateCardsRepository } from './driverRateCards.repository';
import { TimeSlabsRepository } from './timeSlabs.repository';

interface ZoneFields {
  district_id?: string;
  area_id?: string | null;
  one_way_return_pct?: number;
  night_charge_pct?: number;
  night_start?: string;
  night_end?: string;
  outstation_allowance_per_day?: number;
  is_hotspot?: boolean;
  hotspot_id?: string | null;
  multiplier?: number | null;
}

interface RateCardInput {
  driver_types: string;
  per_hour_rate: number;
  per_km_rate?: number;
  free_km?: number;
  minimum_fare?: number;
}
interface TimeSlabInput {
  driver_types: string;
  from_hours: number;
  per_hour_rate: number;
  sort_order: number;
}
interface TimeSlotInput {
  driver_types: string;
  day: string;
  from_time: string;
  to_time: string;
  per_km_rate: number;
  per_hour_rate?: number;
}

function validateZoneFields(data: ZoneFields) {
  if (
    data.one_way_return_pct !== undefined &&
    (data.one_way_return_pct < 0 || data.one_way_return_pct > 100)
  ) {
    throw { statusCode: 400, message: 'One-way return % must be between 0 and 100' };
  }
  if (
    data.night_charge_pct !== undefined &&
    (data.night_charge_pct < 0 || data.night_charge_pct > 100)
  ) {
    throw { statusCode: 400, message: 'Night charge % must be between 0 and 100' };
  }
  if (data.outstation_allowance_per_day !== undefined && data.outstation_allowance_per_day < 0) {
    throw { statusCode: 400, message: 'Outstation allowance cannot be negative' };
  }
  if (data.multiplier !== null && data.multiplier !== undefined && data.multiplier <= 0) {
    throw { statusCode: 400, message: 'Multiplier must be greater than 0' };
  }
}

// Map a rate-card input to the repo shape (filling defaults)
const toCardRow = (ruleId: string, c: RateCardInput) => ({
  pricing_fare_rule_id: ruleId,
  driver_types: c.driver_types,
  per_hour_rate: c.per_hour_rate,
  per_km_rate: c.per_km_rate ?? 0,
  free_km: c.free_km ?? 0,
  minimum_fare: c.minimum_fare ?? 0,
});
const toSlabRow = (ruleId: string, s: TimeSlabInput) => ({
  pricing_fare_rule_id: ruleId,
  driver_types: s.driver_types,
  from_hours: s.from_hours,
  per_hour_rate: s.per_hour_rate,
  sort_order: s.sort_order,
});
const toSlotRow = (ruleId: string, s: TimeSlotInput) => ({
  price_and_fare_rules_id: ruleId,
  driver_types: s.driver_types,
  day: s.day,
  from_time: s.from_time,
  to_time: s.to_time,
  per_km_rate: s.per_km_rate,
  per_hour_rate: s.per_hour_rate ?? 0,
});

export const PricingFareRulesService = {
  async getPricingFareRules(
    filters: { search?: string; area_id?: string; district_id?: string; is_hotspot?: boolean },
    page: number,
    limit: number,
    includeTimeSlots = false
  ): Promise<{ data: FareSummary[]; total: number }> {
    return PricingFareRulesRepository.getPricingFareRules(filters, page, limit, includeTimeSlots);
  },

  async getPricingFareRuleById(id: string): Promise<FareSummary> {
    const fareRule = await PricingFareRulesRepository.getFareSummaryById(id);
    if (!fareRule) {
      throw { statusCode: 404, message: 'Pricing fare rule not found' };
    }
    fareRule.rate_cards = await DriverRateCardsRepository.getByPricingFareRuleId(id);
    fareRule.time_slabs = await TimeSlabsRepository.getByPricingFareRuleId(id);
    fareRule.time_slots = await DriverTimeSlotsPricingRepository.getByPricingFareRuleId(id);
    return fareRule;
  },

  async createPricingFareRule(data: ZoneFields & { district_id: string; is_hotspot: boolean }) {
    if (data.is_hotspot) {
      if (!data.hotspot_id)
        throw { statusCode: 400, message: 'Hotspot ID is required when is_hotspot is true' };
      if (!data.multiplier)
        throw { statusCode: 400, message: 'Multiplier is required when is_hotspot is true' };
    }
    if (data.area_id) {
      const dup = await PricingFareRulesRepository.checkDuplicateArea(data.district_id, data.area_id);
      if (dup)
        throw { statusCode: 409, message: 'A pricing fare rule already exists for this area combination' };
    }
    validateZoneFields(data);
    return PricingFareRulesRepository.createPricingFareRule(data);
  },

  async updatePricingFareRule(id: string, data: ZoneFields): Promise<PricingFareRule> {
    const existing = await PricingFareRulesRepository.getPricingFareRuleById(id);
    if (!existing) throw { statusCode: 404, message: 'Pricing fare rule not found' };

    const merged = { ...existing, ...data };
    if (merged.is_hotspot) {
      if (!merged.hotspot_id)
        throw { statusCode: 400, message: 'Hotspot ID is required when is_hotspot is true' };
      if (!merged.multiplier)
        throw { statusCode: 400, message: 'Multiplier is required when is_hotspot is true' };
    }
    if (data.district_id !== undefined || data.area_id !== undefined) {
      const newDistrictId = data.district_id || existing.district_id;
      const newAreaId = data.area_id !== undefined ? data.area_id : existing.area_id;
      if (newAreaId) {
        const dup = await PricingFareRulesRepository.checkDuplicateArea(newDistrictId, newAreaId, id);
        if (dup)
          throw { statusCode: 409, message: 'A pricing fare rule already exists for this area combination' };
      }
    }
    validateZoneFields(data);
    return PricingFareRulesRepository.updatePricingFareRule(id, data);
  },

  async deletePricingFareRule(id: string): Promise<void> {
    const existing = await PricingFareRulesRepository.getPricingFareRuleById(id);
    if (!existing) throw { statusCode: 404, message: 'Pricing fare rule not found' };
    await PricingFareRulesRepository.deletePricingFareRule(id);
  },

  /**
   * Create a rule with per-type rate cards (+ optional duration slabs and day/time slots)
   */
  async createPricingRuleWithSlots(
    data: ZoneFields & {
      district_id: string;
      is_hotspot: boolean;
      rate_cards: RateCardInput[];
      time_slabs?: TimeSlabInput[];
      time_slots?: TimeSlotInput[];
    }
  ) {
    if (data.is_hotspot) {
      if (!data.hotspot_id)
        throw { statusCode: 400, message: 'Hotspot ID is required when is_hotspot is true' };
      if (!data.multiplier)
        throw { statusCode: 400, message: 'Multiplier is required when is_hotspot is true' };
    }
    const dup = await PricingFareRulesRepository.checkDuplicateArea(
      data.district_id,
      data.area_id ?? null
    );
    if (dup)
      throw {
        statusCode: 409,
        message: 'A pricing fare rule already exists for this district and area combination',
      };
    validateZoneFields(data);
    if (!data.rate_cards || data.rate_cards.length === 0) {
      throw { statusCode: 400, message: 'At least one driver-type rate card is required' };
    }

    const pricingRule = await PricingFareRulesRepository.createPricingFareRule(data);

    const rateCards = await DriverRateCardsRepository.bulkCreate(
      data.rate_cards.map((c) => toCardRow(pricingRule.id, c))
    );
    if (data.time_slabs && data.time_slabs.length > 0) {
      await TimeSlabsRepository.bulkCreate(data.time_slabs.map((s) => toSlabRow(pricingRule.id, s)));
    }
    let timeSlots: any[] = [];
    if (data.time_slots && data.time_slots.length > 0) {
      timeSlots = await DriverTimeSlotsPricingRepository.bulkCreateDriverTimeSlotsPricing(
        data.time_slots.map((s) => toSlotRow(pricingRule.id, s))
      );
    }

    return { pricingRule, rateCards, timeSlots };
  },

  /**
   * Update a rule and replace its rate cards / duration slabs / day-time slots
   */
  async updatePricingRuleWithSlots(
    id: string,
    data: ZoneFields & {
      rate_cards?: RateCardInput[];
      time_slabs?: TimeSlabInput[];
      time_slots?: TimeSlotInput[];
    }
  ) {
    const pricingRule = await PricingFareRulesService.updatePricingFareRule(id, data);

    if (data.rate_cards) {
      await DriverRateCardsRepository.deleteByPricingFareRuleId(id);
      if (data.rate_cards.length > 0) {
        await DriverRateCardsRepository.bulkCreate(data.rate_cards.map((c) => toCardRow(id, c)));
      }
    }
    if (data.time_slabs) {
      await TimeSlabsRepository.deleteByPricingFareRuleId(id);
      if (data.time_slabs.length > 0) {
        await TimeSlabsRepository.bulkCreate(data.time_slabs.map((s) => toSlabRow(id, s)));
      }
    }
    let timeSlots: any[] = [];
    if (data.time_slots) {
      await DriverTimeSlotsPricingRepository.deleteByPricingFareRuleId(id);
      if (data.time_slots.length > 0) {
        timeSlots = await DriverTimeSlotsPricingRepository.bulkCreateDriverTimeSlotsPricing(
          data.time_slots.map((s) => toSlotRow(id, s))
        );
      }
    } else {
      timeSlots = await DriverTimeSlotsPricingRepository.getByPricingFareRuleId(id);
    }

    return { pricingRule, timeSlots };
  },
};
