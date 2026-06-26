import { Joi } from 'celebrate';

const DRIVER_TYPES = ['normal-driver', 'premium-driver', 'elite-driver'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TIME_PATTERN = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

// ── Zone-wide field schemas ─────────────────────────────────────────────
const oneWayReturnPct = Joi.number().precision(2).min(0).max(100).optional().default(0);
const nightChargePct = Joi.number().precision(2).min(0).max(100).optional().default(0);
const nightTime = Joi.string().pattern(TIME_PATTERN).messages({
  'string.pattern.base': 'Time must be HH:MM or HH:MM:SS',
});
const outstationAllowance = Joi.number().precision(2).min(0).optional().default(0);
const hotspotFields = {
  is_hotspot: Joi.boolean().default(false),
  hotspot_id: Joi.string().uuid().optional().allow(null),
  multiplier: Joi.number().precision(1).greater(0).optional().allow(null),
};

// ── Child collection item schemas ───────────────────────────────────────
const rateCardItem = Joi.object({
  driver_types: Joi.string().valid(...DRIVER_TYPES).required(),
  per_hour_rate: Joi.number().precision(2).min(0).required(),
  per_km_rate: Joi.number().precision(2).min(0).optional().default(0),
  free_km: Joi.number().precision(2).min(0).optional().default(0),
  minimum_fare: Joi.number().precision(2).min(0).optional().default(0),
});

const timeSlabItem = Joi.object({
  driver_types: Joi.string().valid(...DRIVER_TYPES).required(),
  from_hours: Joi.number().precision(2).min(0).required(),
  per_hour_rate: Joi.number().precision(2).min(0).required(),
  sort_order: Joi.number().integer().min(0).required(),
});

const timeSlotItem = Joi.object({
  driver_types: Joi.string().valid(...DRIVER_TYPES).required(),
  day: Joi.string().valid(...DAYS).required(),
  from_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).required(),
  to_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).required(),
  per_km_rate: Joi.number().precision(2).min(0).required(),
  per_hour_rate: Joi.number().precision(2).min(0).optional().default(0),
});

const hotspotCustom = (value: any, helpers: any) => {
  if (value.is_hotspot === true) {
    if (!value.hotspot_id)
      return helpers.error('any.custom', { message: 'Hotspot ID is required when is_hotspot is true' });
    if (!value.multiplier)
      return helpers.error('any.custom', { message: 'Multiplier is required when is_hotspot is true' });
  }
  return value;
};

export const PricingFareRulesValidation = {
  getPricingFareRulesValidation: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().optional(),
    area_id: Joi.string().uuid().optional(),
    district_id: Joi.string().uuid().optional(),
    is_hotspot: Joi.boolean().optional(),
    include_time_slots: Joi.boolean().optional(),
  }),

  pricingFareRuleIdValidation: Joi.object().keys({
    id: Joi.string().uuid().required().messages({ 'string.guid': 'Invalid ID format' }),
  }),

  // Zone-only create
  createPricingFareRuleValidation: Joi.object()
    .keys({
      district_id: Joi.string().uuid().required(),
      area_id: Joi.string().uuid().optional().allow(null),
      one_way_return_pct: oneWayReturnPct,
      night_charge_pct: nightChargePct,
      night_start: nightTime.optional().default('22:00:00'),
      night_end: nightTime.optional().default('06:00:00'),
      outstation_allowance_per_day: outstationAllowance,
      ...hotspotFields,
    })
    .custom(hotspotCustom),

  // Zone-only update
  updatePricingFareRuleValidation: Joi.object()
    .keys({
      district_id: Joi.string().uuid().optional().allow(null),
      area_id: Joi.string().uuid().optional().allow(null),
      one_way_return_pct: Joi.number().precision(2).min(0).max(100).optional(),
      night_charge_pct: Joi.number().precision(2).min(0).max(100).optional(),
      night_start: nightTime.optional(),
      night_end: nightTime.optional(),
      outstation_allowance_per_day: Joi.number().precision(2).min(0).optional(),
      is_hotspot: Joi.boolean().optional(),
      hotspot_id: Joi.string().uuid().optional().allow(null),
      multiplier: Joi.number().precision(1).greater(0).optional().allow(null),
    })
    .min(1)
    .custom(hotspotCustom),

  // Create rule + rate cards + time slabs + time slots
  createPricingRuleWithSlotsValidation: Joi.object()
    .keys({
      district_id: Joi.string().uuid().required(),
      area_id: Joi.string().uuid().optional().allow(null),
      one_way_return_pct: oneWayReturnPct,
      night_charge_pct: nightChargePct,
      night_start: nightTime.optional().default('22:00:00'),
      night_end: nightTime.optional().default('06:00:00'),
      outstation_allowance_per_day: outstationAllowance,
      ...hotspotFields,
      rate_cards: Joi.array().items(rateCardItem).min(1).required().messages({
        'array.min': 'At least one driver-type rate card is required',
      }),
      time_slabs: Joi.array().items(timeSlabItem).optional().default([]),
      time_slots: Joi.array().items(timeSlotItem).optional().default([]),
    })
    .custom(hotspotCustom),

  // Update rule + replace rate cards / time slabs / time slots
  updatePricingRuleWithSlotsValidation: Joi.object()
    .keys({
      district_id: Joi.string().uuid().optional().allow(null),
      area_id: Joi.string().uuid().optional().allow(null),
      one_way_return_pct: Joi.number().precision(2).min(0).max(100).optional(),
      night_charge_pct: Joi.number().precision(2).min(0).max(100).optional(),
      night_start: nightTime.optional(),
      night_end: nightTime.optional(),
      outstation_allowance_per_day: Joi.number().precision(2).min(0).optional(),
      is_hotspot: Joi.boolean().optional(),
      hotspot_id: Joi.string().uuid().optional().allow(null),
      multiplier: Joi.number().precision(1).greater(0).optional().allow(null),
      rate_cards: Joi.array().items(rateCardItem).optional(),
      time_slabs: Joi.array().items(timeSlabItem).optional(),
      time_slots: Joi.array().items(timeSlotItem).optional().allow(null),
    })
    .min(1)
    .custom(hotspotCustom),
};
