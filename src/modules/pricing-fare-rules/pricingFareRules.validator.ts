import { Joi } from 'celebrate';

// Shared field definitions for the per-km driver-rental fare model
const perKmPriceRequired = Joi.number().precision(2).min(0).required().messages({
  'number.min': 'Price per km must be greater than or equal to 0',
  'any.required': 'Price per km is required',
});
const perKmPriceOptional = Joi.number().precision(2).min(0).optional().messages({
  'number.min': 'Price per km must be greater than or equal to 0',
});
const perHourPrice = Joi.number().precision(2).min(0).optional().default(0).messages({
  'number.min': 'Price per hour must be greater than or equal to 0',
});
const minimumFare = Joi.number().precision(2).min(0).optional().default(0).messages({
  'number.min': 'Minimum fare must be greater than or equal to 0',
});
const oneWayReturnPct = Joi.number().precision(2).min(0).max(100).optional().default(0).messages({
  'number.min': 'One-way return % must be greater than or equal to 0',
  'number.max': 'One-way return % cannot exceed 100',
});

const checkpointItem = Joi.object({
  from_km: Joi.number().precision(2).min(0).required().messages({
    'number.min': 'Checkpoint from_km must be greater than or equal to 0',
    'any.required': 'Checkpoint from_km is required',
  }),
  price: Joi.number().precision(2).min(0).required().messages({
    'number.min': 'Checkpoint price must be greater than or equal to 0',
    'any.required': 'Checkpoint price is required',
  }),
  sort_order: Joi.number().integer().min(0).required(),
});

const timeSlotItem = Joi.object({
  driver_types: Joi.string()
    .valid('normal-driver', 'premium-driver', 'elite-driver')
    .required()
    .messages({
      'any.only': 'Driver type must be normal-driver, premium-driver, or elite-driver',
      'any.required': 'Driver type is required',
    }),
  day: Joi.string()
    .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    .required()
    .messages({
      'any.only': 'Day must be a valid day of the week',
      'any.required': 'Day is required',
    }),
  from_time: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'From time must be in HH:MM:SS format',
      'any.required': 'From time is required',
    }),
  to_time: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'To time must be in HH:MM:SS format',
      'any.required': 'To time is required',
    }),
  per_km_rate: Joi.number().precision(2).min(0).required().messages({
    'number.min': 'Rate per km must be greater than or equal to 0',
    'any.required': 'Rate per km is required',
  }),
  per_hour_rate: Joi.number().precision(2).min(0).optional().default(0).messages({
    'number.min': 'Rate per hour must be greater than or equal to 0',
  }),
});

const hotspotCustom = (value: any, helpers: any) => {
  // If is_hotspot is true, hotspot_id and multiplier are required
  if (value.is_hotspot === true) {
    if (!value.hotspot_id) {
      return helpers.error('any.custom', {
        message: 'Hotspot ID is required when is_hotspot is true',
      });
    }
    if (!value.multiplier) {
      return helpers.error('any.custom', {
        message: 'Multiplier is required when is_hotspot is true',
      });
    }
  }
  return value;
};

export const PricingFareRulesValidation = {
  // Get all pricing fare rules with pagination
  getPricingFareRulesValidation: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().optional(),
    area_id: Joi.string().uuid().optional(),
    district_id: Joi.string().uuid().optional(),
    is_hotspot: Joi.boolean().optional(),
    include_time_slots: Joi.boolean().optional(),
  }),

  // Get single pricing fare rule by ID
  pricingFareRuleIdValidation: Joi.object().keys({
    id: Joi.string().uuid().required().messages({
      'any.required': 'Pricing fare rule ID is required',
      'string.guid': 'Invalid ID format',
    }),
  }),

  // Create pricing fare rule with conditional validation
  createPricingFareRuleValidation: Joi.object()
    .keys({
      district_id: Joi.string().uuid().required().messages({
        'string.guid': 'Invalid district ID format',
        'any.required': 'District ID is required',
      }),
      area_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid area ID format',
      }),
      per_km_price: perKmPriceRequired,
      per_hour_price: perHourPrice,
      minimum_fare: minimumFare,
      one_way_return_pct: oneWayReturnPct,
      is_hotspot: Joi.boolean().default(false),
      hotspot_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid hotspot ID format',
      }),
      multiplier: Joi.number().precision(1).greater(0).optional().allow(null).messages({
        'number.greater': 'Multiplier must be greater than 0',
      }),
      extra_km_checkpoints: Joi.array().items(checkpointItem).optional().default([]),
    })
    .custom(hotspotCustom),

  // Update pricing fare rule
  updatePricingFareRuleValidation: Joi.object()
    .keys({
      district_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid district ID format',
      }),
      area_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid area ID format',
      }),
      per_km_price: perKmPriceOptional,
      per_hour_price: Joi.number().precision(2).min(0).optional(),
      minimum_fare: Joi.number().precision(2).min(0).optional(),
      one_way_return_pct: Joi.number().precision(2).min(0).max(100).optional(),
      is_hotspot: Joi.boolean().optional(),
      hotspot_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid hotspot ID format',
      }),
      multiplier: Joi.number().precision(1).greater(0).optional().allow(null).messages({
        'number.greater': 'Multiplier must be greater than 0',
      }),
      extra_km_checkpoints: Joi.array().items(checkpointItem).optional(),
    })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided to update pricing fare rule',
    })
    .custom(hotspotCustom),

  // Create pricing fare rule with time slots
  createPricingRuleWithSlotsValidation: Joi.object()
    .keys({
      district_id: Joi.string().uuid().required().messages({
        'string.guid': 'Invalid district ID format',
        'any.required': 'District ID is required',
      }),
      area_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid area ID format',
      }),
      per_km_price: perKmPriceRequired,
      per_hour_price: perHourPrice,
      minimum_fare: minimumFare,
      one_way_return_pct: oneWayReturnPct,
      is_hotspot: Joi.boolean().default(false),
      hotspot_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid hotspot ID format',
      }),
      multiplier: Joi.number().precision(1).greater(0).optional().allow(null).messages({
        'number.greater': 'Multiplier must be greater than 0',
      }),
      extra_km_checkpoints: Joi.array().items(checkpointItem).optional().default([]),
      time_slots: Joi.array().items(timeSlotItem).min(1).required().messages({
        'array.min': 'At least one time slot is required',
        'any.required': 'Time slots are required',
      }),
    })
    .custom(hotspotCustom),

  // Update pricing fare rule with time slots
  updatePricingRuleWithSlotsValidation: Joi.object()
    .keys({
      district_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid district ID format',
      }),
      area_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid area ID format',
      }),
      per_km_price: perKmPriceOptional,
      per_hour_price: Joi.number().precision(2).min(0).optional(),
      minimum_fare: Joi.number().precision(2).min(0).optional(),
      one_way_return_pct: Joi.number().precision(2).min(0).max(100).optional(),
      is_hotspot: Joi.boolean().optional(),
      hotspot_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid hotspot ID format',
      }),
      multiplier: Joi.number().precision(1).greater(0).optional().allow(null).messages({
        'number.greater': 'Multiplier must be greater than 0',
      }),
      extra_km_checkpoints: Joi.array().items(checkpointItem).optional(),
      time_slots: Joi.array().items(timeSlotItem).optional().allow(null),
    })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided to update',
    })
    .custom(hotspotCustom),
};
