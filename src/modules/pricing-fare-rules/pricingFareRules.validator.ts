import { Joi } from 'celebrate';

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
      global_price: Joi.number().precision(2).min(0).required().messages({
        'number.min': 'Global price must be greater than or equal to 0',
        'any.required': 'Global price is required',
      }),
      is_hotspot: Joi.boolean().default(false),
      hotspot_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid hotspot ID format',
      }),
      multiplier: Joi.number().precision(1).greater(0).optional().allow(null).messages({
        'number.greater': 'Multiplier must be greater than 0',
      }),
      extra_km_step: Joi.number().positive().precision(2).optional().default(5).messages({
        'number.positive': 'Extra KM step must be greater than 0',
      }),
      extra_km_price: Joi.number().min(0).precision(2).optional().default(10).messages({
        'number.min': 'Extra KM price cannot be negative',
      }),
      extra_km_start_multiplier: Joi.number()
        .positive()
        .precision(2)
        .optional()
        .default(1)
        .messages({
          'number.positive': 'Extra KM start multiplier must be greater than 0',
        }),
      extra_km_checkpoints: Joi.array()
        .items(
          Joi.object({
            multiplier: Joi.number().positive().required().messages({
              'number.positive': 'Checkpoint multiplier must be greater than 0',
              'any.required': 'Checkpoint multiplier is required',
            }),
            sort_order: Joi.number().integer().min(0).required(),
          })
        )
        .optional()
        .default([]),
    })
    .custom((value, helpers) => {
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
    }),

  // Update pricing fare rule
  updatePricingFareRuleValidation: Joi.object()
    .keys({
      district_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid district ID format',
      }),
      area_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid area ID format',
      }),
      global_price: Joi.number().precision(2).min(0).optional().messages({
        'number.min': 'Global price must be greater than or equal to 0',
      }),
      is_hotspot: Joi.boolean().optional(),
      hotspot_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid hotspot ID format',
      }),
      multiplier: Joi.number().precision(1).greater(0).optional().allow(null).messages({
        'number.greater': 'Multiplier must be greater than 0',
      }),
      extra_km_step: Joi.number().positive().precision(2).optional().messages({
        'number.positive': 'Extra KM step must be greater than 0',
      }),
      extra_km_price: Joi.number().min(0).precision(2).optional().messages({
        'number.min': 'Extra KM price cannot be negative',
      }),
      extra_km_start_multiplier: Joi.number().positive().precision(2).optional().messages({
        'number.positive': 'Extra KM start multiplier must be greater than 0',
      }),
      extra_km_checkpoints: Joi.array()
        .items(
          Joi.object({
            multiplier: Joi.number().positive().required(),
            sort_order: Joi.number().integer().min(0).required(),
          })
        )
        .optional(),
    })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided to update pricing fare rule',
    })
    .custom((value, helpers) => {
      // If is_hotspot is being set to true, validate hotspot_id and multiplier
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
    }),

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
      global_price: Joi.number().precision(2).min(0).required().messages({
        'number.min': 'Global price must be greater than or equal to 0',
        'any.required': 'Global price is required',
      }),
      is_hotspot: Joi.boolean().default(false),
      hotspot_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid hotspot ID format',
      }),
      multiplier: Joi.number().precision(1).greater(0).optional().allow(null).messages({
        'number.greater': 'Multiplier must be greater than 0',
      }),
      extra_km_step: Joi.number().positive().precision(2).optional().default(5).messages({
        'number.positive': 'Extra KM step must be greater than 0',
      }),
      extra_km_price: Joi.number().min(0).precision(2).optional().default(10).messages({
        'number.min': 'Extra KM price cannot be negative',
      }),
      extra_km_start_multiplier: Joi.number()
        .positive()
        .precision(2)
        .optional()
        .default(1)
        .messages({
          'number.positive': 'Extra KM start multiplier must be greater than 0',
        }),
      extra_km_checkpoints: Joi.array()
        .items(
          Joi.object({
            multiplier: Joi.number().positive().required().messages({
              'number.positive': 'Checkpoint multiplier must be greater than 0',
              'any.required': 'Checkpoint multiplier is required',
            }),
            sort_order: Joi.number().integer().min(0).required(),
          })
        )
        .optional()
        .default([]),
      time_slots: Joi.array()
        .items(
          Joi.object({
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
            price: Joi.number().precision(2).min(0).required().messages({
              'number.min': 'Price must be greater than or equal to 0',
              'any.required': 'Price is required',
            }),
          })
        )
        .min(1)
        .required()
        .messages({
          'array.min': 'At least one time slot is required',
          'any.required': 'Time slots are required',
        }),
    })
    .custom((value, helpers) => {
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
    }),

  // Update pricing fare rule with time slots
  updatePricingRuleWithSlotsValidation: Joi.object()
    .keys({
      district_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid district ID format',
      }),
      area_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid area ID format',
      }),
      global_price: Joi.number().precision(2).min(0).optional().messages({
        'number.min': 'Global price must be greater than or equal to 0',
      }),
      is_hotspot: Joi.boolean().optional(),
      hotspot_id: Joi.string().uuid().optional().allow(null).messages({
        'string.guid': 'Invalid hotspot ID format',
      }),
      multiplier: Joi.number().precision(1).greater(0).optional().allow(null).messages({
        'number.greater': 'Multiplier must be greater than 0',
      }),
      extra_km_step: Joi.number().positive().precision(2).optional().messages({
        'number.positive': 'Extra KM step must be greater than 0',
      }),
      extra_km_price: Joi.number().min(0).precision(2).optional().messages({
        'number.min': 'Extra KM price cannot be negative',
      }),
      extra_km_start_multiplier: Joi.number().positive().precision(2).optional().messages({
        'number.positive': 'Extra KM start multiplier must be greater than 0',
      }),
      extra_km_checkpoints: Joi.array()
        .items(
          Joi.object({
            multiplier: Joi.number().positive().required(),
            sort_order: Joi.number().integer().min(0).required(),
          })
        )
        .optional(),
      time_slots: Joi.array()
        .items(
          Joi.object({
            driver_types: Joi.string()
              .valid('normal-driver', 'premium-driver', 'elite-driver')
              .required(),
            day: Joi.string()
              .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
              .required(),
            from_time: Joi.string()
              .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
              .required(),
            to_time: Joi.string()
              .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
              .required(),
            price: Joi.number().precision(2).min(0).required(),
          })
        )
        .optional()
        .allow(null),
    })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided to update',
    })
    .custom((value, helpers) => {
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
    }),
};
