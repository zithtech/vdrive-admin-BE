import { PricingFareRulesRepository } from './pricingFareRules.repository';
import { PricingFareRule, FareSummary } from './pricingFareRules.model';
import { DriverTimeSlotsPricingRepository } from './driverTimeSlotsPricing.repository';
import { ExtraKmCheckpointsRepository } from './extraKmCheckpoints.repository';

interface CheckpointInput {
  from_km: number;
  price: number;
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

interface FareRuleFields {
  district_id?: string;
  area_id?: string | null;
  per_km_price?: number;
  per_hour_price?: number;
  minimum_fare?: number;
  one_way_return_pct?: number;
  is_hotspot?: boolean;
  hotspot_id?: string | null;
  multiplier?: number | null;
}

// Validate the numeric fare-model fields shared by create/update
function validateFareFields(data: FareRuleFields) {
  if (data.per_km_price !== undefined && data.per_km_price < 0) {
    throw { statusCode: 400, message: 'Price per km cannot be negative' };
  }
  if (data.per_hour_price !== undefined && data.per_hour_price < 0) {
    throw { statusCode: 400, message: 'Price per hour cannot be negative' };
  }
  if (data.minimum_fare !== undefined && data.minimum_fare < 0) {
    throw { statusCode: 400, message: 'Minimum fare cannot be negative' };
  }
  if (
    data.one_way_return_pct !== undefined &&
    (data.one_way_return_pct < 0 || data.one_way_return_pct > 100)
  ) {
    throw { statusCode: 400, message: 'One-way return % must be between 0 and 100' };
  }
  if (data.multiplier !== null && data.multiplier !== undefined && data.multiplier <= 0) {
    throw { statusCode: 400, message: 'Multiplier must be greater than 0' };
  }
}

export const PricingFareRulesService = {
  async getPricingFareRules(
    filters: {
      search?: string;
      area_id?: string;
      district_id?: string;
      is_hotspot?: boolean;
    },
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

    // Always include time slots when fetching a single fare rule
    fareRule.time_slots = await DriverTimeSlotsPricingRepository.getByPricingFareRuleId(id);

    return fareRule;
  },

  async createPricingFareRule(data: {
    district_id: string;
    area_id?: string | null;
    per_km_price: number;
    per_hour_price?: number;
    minimum_fare?: number;
    one_way_return_pct?: number;
    is_hotspot: boolean;
    hotspot_id?: string | null;
    multiplier?: number | null;
  }): Promise<PricingFareRule> {
    // Validate hotspot requirements
    if (data.is_hotspot) {
      if (!data.hotspot_id) {
        throw { statusCode: 400, message: 'Hotspot ID is required when is_hotspot is true' };
      }
      if (!data.multiplier) {
        throw { statusCode: 400, message: 'Multiplier is required when is_hotspot is true' };
      }
    }

    // Check for duplicate area combination (only if area_id is provided)
    if (data.area_id) {
      const isDuplicate = await PricingFareRulesRepository.checkDuplicateArea(
        data.district_id,
        data.area_id
      );
      if (isDuplicate) {
        throw {
          statusCode: 409,
          message: 'A pricing fare rule already exists for this area combination',
        };
      }
    }

    validateFareFields(data);

    return await PricingFareRulesRepository.createPricingFareRule(data);
  },

  async updatePricingFareRule(id: string, data: FareRuleFields): Promise<PricingFareRule> {
    // Check if pricing fare rule exists
    const existing = await PricingFareRulesRepository.getPricingFareRuleById(id);
    if (!existing) {
      throw { statusCode: 404, message: 'Pricing fare rule not found' };
    }

    // Merge existing data with updates to validate hotspot requirements
    const mergedData = { ...existing, ...data };
    if (mergedData.is_hotspot) {
      if (!mergedData.hotspot_id) {
        throw { statusCode: 400, message: 'Hotspot ID is required when is_hotspot is true' };
      }
      if (!mergedData.multiplier) {
        throw { statusCode: 400, message: 'Multiplier is required when is_hotspot is true' };
      }
    }

    // If district_id or area_id is being updated, check for duplicates (only if area_id is not null)
    if (data.district_id !== undefined || data.area_id !== undefined) {
      const newDistrictId = data.district_id || existing.district_id;
      const newAreaId = data.area_id !== undefined ? data.area_id : existing.area_id;

      // Only check for duplicates if area_id is provided
      if (newAreaId) {
        const isDuplicate = await PricingFareRulesRepository.checkDuplicateArea(
          newDistrictId,
          newAreaId,
          id
        );
        if (isDuplicate) {
          throw {
            statusCode: 409,
            message: 'A pricing fare rule already exists for this area combination',
          };
        }
      }
    }

    validateFareFields(data);

    return await PricingFareRulesRepository.updatePricingFareRule(id, data);
  },

  async deletePricingFareRule(id: string): Promise<void> {
    // Check if pricing fare rule exists
    const existing = await PricingFareRulesRepository.getPricingFareRuleById(id);
    if (!existing) {
      throw { statusCode: 404, message: 'Pricing fare rule not found' };
    }

    await PricingFareRulesRepository.deletePricingFareRule(id);
  },

  /**
   * Create pricing fare rule with time slots
   */
  async createPricingRuleWithSlots(data: {
    district_id: string;
    area_id?: string | null;
    per_km_price: number;
    per_hour_price?: number;
    minimum_fare?: number;
    one_way_return_pct?: number;
    is_hotspot: boolean;
    hotspot_id?: string | null;
    multiplier?: number | null;
    extra_km_checkpoints?: CheckpointInput[];
    time_slots: TimeSlotInput[];
  }): Promise<{ pricingRule: PricingFareRule; timeSlots: any[] }> {
    // Validate hotspot requirements
    if (data.is_hotspot) {
      if (!data.hotspot_id) {
        throw { statusCode: 400, message: 'Hotspot ID is required when is_hotspot is true' };
      }
      if (!data.multiplier) {
        throw { statusCode: 400, message: 'Multiplier is required when is_hotspot is true' };
      }
    }

    // Check for duplicate district/area combination (including null area_id)
    const isDuplicate = await PricingFareRulesRepository.checkDuplicateArea(
      data.district_id,
      data.area_id ?? null
    );
    if (isDuplicate) {
      throw {
        statusCode: 409,
        message: 'A pricing fare rule already exists for this district and area combination',
      };
    }

    validateFareFields(data);

    // Validate time slots
    if (!data.time_slots || data.time_slots.length === 0) {
      throw { statusCode: 400, message: 'At least one time slot is required' };
    }

    // Create the pricing rule first
    const pricingRule = await PricingFareRulesRepository.createPricingFareRule({
      district_id: data.district_id,
      area_id: data.area_id,
      per_km_price: data.per_km_price,
      per_hour_price: data.per_hour_price,
      minimum_fare: data.minimum_fare,
      one_way_return_pct: data.one_way_return_pct,
      is_hotspot: data.is_hotspot,
      hotspot_id: data.hotspot_id,
      multiplier: data.multiplier,
    });

    // Prepare time slots with the pricing rule ID
    const slotsWithRuleId = data.time_slots.map((slot) => ({
      price_and_fare_rules_id: pricingRule.id,
      driver_types: slot.driver_types,
      day: slot.day,
      from_time: slot.from_time,
      to_time: slot.to_time,
      per_km_rate: slot.per_km_rate,
      per_hour_rate: slot.per_hour_rate ?? 0,
    }));

    // Bulk create time slots
    const timeSlots =
      await DriverTimeSlotsPricingRepository.bulkCreateDriverTimeSlotsPricing(slotsWithRuleId);

    // Bulk create extra KM checkpoints if provided
    if (data.extra_km_checkpoints && data.extra_km_checkpoints.length > 0) {
      await ExtraKmCheckpointsRepository.bulkCreate(
        data.extra_km_checkpoints.map((c) => ({
          pricing_fare_rule_id: pricingRule.id,
          from_km: c.from_km,
          price: c.price,
          sort_order: c.sort_order,
        }))
      );
    }

    return { pricingRule, timeSlots };
  },

  /**
   * Update pricing fare rule with time slots
   */
  async updatePricingRuleWithSlots(
    id: string,
    data: FareRuleFields & {
      extra_km_checkpoints?: CheckpointInput[];
      time_slots?: TimeSlotInput[];
    }
  ): Promise<{ pricingRule: PricingFareRule; timeSlots: any[] }> {
    // 1. Update the pricing rule itself (validation is handled inside updatePricingFareRule)
    const pricingRule = await PricingFareRulesService.updatePricingFareRule(id, {
      district_id: data.district_id,
      area_id: data.area_id,
      per_km_price: data.per_km_price,
      per_hour_price: data.per_hour_price,
      minimum_fare: data.minimum_fare,
      one_way_return_pct: data.one_way_return_pct,
      is_hotspot: data.is_hotspot,
      hotspot_id: data.hotspot_id,
      multiplier: data.multiplier,
    });

    // 2. If time_slots are provided, replace them
    let timeSlots: any[] = [];
    if (data.time_slots && data.time_slots.length > 0) {
      // Delete existing slots
      await DriverTimeSlotsPricingRepository.deleteByPricingFareRuleId(id);

      // Prepare new slots
      const slotsWithRuleId = data.time_slots.map((slot) => ({
        price_and_fare_rules_id: id,
        driver_types: slot.driver_types,
        day: slot.day,
        from_time: slot.from_time,
        to_time: slot.to_time,
        per_km_rate: slot.per_km_rate,
        per_hour_rate: slot.per_hour_rate ?? 0,
      }));

      // Create new slots
      timeSlots =
        await DriverTimeSlotsPricingRepository.bulkCreateDriverTimeSlotsPricing(slotsWithRuleId);
    } else {
      // If time_slots not provided in update, fetch existing ones to return
      timeSlots = await DriverTimeSlotsPricingRepository.getByPricingFareRuleId(id);
    }

    // Always replace extra KM checkpoints when updating (delete + re-insert)
    await ExtraKmCheckpointsRepository.deleteByPricingFareRuleId(id);
    if (data.extra_km_checkpoints && data.extra_km_checkpoints.length > 0) {
      await ExtraKmCheckpointsRepository.bulkCreate(
        data.extra_km_checkpoints.map((c) => ({
          pricing_fare_rule_id: id,
          from_km: c.from_km,
          price: c.price,
          sort_order: c.sort_order,
        }))
      );
    }

    return { pricingRule, timeSlots };
  },
};
