import Joi from 'joi';

export const PricingCalculatorValidator = {
  calculateAllTypes: Joi.object({
    distance_km: Joi.number().min(0).required(),
    duration_min: Joi.number().min(0).required(),
    day: Joi.string()
      .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
      .required(),
    time: Joi.string()
      .pattern(/^([01]\d|2[0-3]):?([0-5]\d)(:?([0-5]\d))?$/) // HH:MM or HH:MM:SS
      .required(),
    trip_type: Joi.string().valid('one_way', 'round_trip').default('one_way'),
    is_outstation: Joi.boolean().default(false),
    days: Joi.number().integer().min(1).default(1),
    driver_type: Joi.string().valid('normal', 'elite', 'premium').optional(),
    from_area: Joi.string().allow('', null).optional(),
    from_district: Joi.string().required(),
    to_area: Joi.string().allow('', null).optional(),
    to_district: Joi.string().allow('', null).optional(),
  }),
};
