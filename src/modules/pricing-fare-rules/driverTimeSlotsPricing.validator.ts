import { Joi } from 'celebrate';

export const DriverTimeSlotsPricingValidation = {
  // Get all driver time slots pricing with pagination
  getDriverTimeSlotsPricingValidation: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    price_and_fare_rules_id: Joi.string().uuid().optional(),
    driver_types: Joi.string().optional(),
    day: Joi.string().optional(),
  }),

  // Get single driver time slots pricing by ID
  driverTimeSlotsPricingIdValidation: Joi.object().keys({
    id: Joi.string().uuid().required().messages({
      'any.required': 'Driver time slots pricing ID is required',
      'string.guid': 'Invalid ID format',
    }),
  }),

  // Get by pricing fare rule ID
  pricingFareRuleIdValidation: Joi.object().keys({
    price_and_fare_rules_id: Joi.string().uuid().required().messages({
      'any.required': 'Pricing fare rule ID is required',
      'string.guid': 'Invalid pricing fare rule ID format',
    }),
  }),

  // Create driver time slots pricing
  createDriverTimeSlotsPricingValidation: Joi.object().keys({
    price_and_fare_rules_id: Joi.string().uuid().required().messages({
      'any.required': 'Pricing fare rule ID is required',
      'string.guid': 'Invalid pricing fare rule ID format',
    }),
    driver_types: Joi.string().required().messages({
      'any.required': 'Driver types is required',
    }),
    day: Joi.string()
      .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
      .required()
      .messages({
        'any.required': 'Day is required',
        'any.only': 'Day must be a valid weekday',
      }),
    from_time: Joi.string()
      .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
      .required()
      .messages({
        'any.required': 'From time is required',
        'string.pattern.base': 'From time must be in HH:MM or HH:MM:SS format',
      }),
    to_time: Joi.string()
      .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
      .required()
      .messages({
        'any.required': 'To time is required',
        'string.pattern.base': 'To time must be in HH:MM or HH:MM:SS format',
      }),
    per_km_rate: Joi.number().precision(2).min(0).required().messages({
      'number.min': 'Rate per km must be greater than or equal to 0',
      'any.required': 'Rate per km is required',
    }),
    per_hour_rate: Joi.number().precision(2).min(0).optional().default(0).messages({
      'number.min': 'Rate per hour must be greater than or equal to 0',
    }),
  }),

  // Update driver time slots pricing
  updateDriverTimeSlotsPricingValidation: Joi.object()
    .keys({
      driver_types: Joi.string().optional(),
      day: Joi.string()
        .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
        .optional()
        .messages({
          'any.only': 'Day must be a valid weekday',
        }),
      from_time: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
        .optional()
        .messages({
          'string.pattern.base': 'From time must be in HH:MM or HH:MM:SS format',
        }),
      to_time: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
        .optional()
        .messages({
          'string.pattern.base': 'To time must be in HH:MM or HH:MM:SS format',
        }),
      per_km_rate: Joi.number().precision(2).min(0).optional().messages({
        'number.min': 'Rate per km must be greater than or equal to 0',
      }),
      per_hour_rate: Joi.number().precision(2).min(0).optional().messages({
        'number.min': 'Rate per hour must be greater than or equal to 0',
      }),
    })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided to update driver time slots pricing',
    }),

  // Bulk create driver time slots pricing
  bulkCreateDriverTimeSlotsPricingValidation: Joi.object().keys({
    slots: Joi.array()
      .items(
        Joi.object().keys({
          price_and_fare_rules_id: Joi.string().uuid().required(),
          driver_types: Joi.string().required(),
          day: Joi.string()
            .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
            .required(),
          from_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
            .required(),
          to_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
            .required(),
          per_km_rate: Joi.number().precision(2).min(0).required(),
          per_hour_rate: Joi.number().precision(2).min(0).optional().default(0),
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one slot must be provided',
        'any.required': 'Slots array is required',
      }),
  }),
};
