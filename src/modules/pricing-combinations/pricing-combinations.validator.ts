// src/modules/pricing-combinations/pricing-combinations.validator.ts
import { Joi } from 'celebrate';

export const PricingCombinationValidation = {
  saveMatrixValidation: Joi.object().keys({
    combinations: Joi.array()
      .items(
        Joi.object().keys({
          tier: Joi.number().integer().required(),
          duration: Joi.number().required(),
          distance: Joi.number().required(),
          type: Joi.string().valid('Base', 'Extra KM').required(),
          price: Joi.number().required(),
          per_km_rate: Joi.number().required(),
        })
      )
      .required(),
  }),

  createCombinationValidation: Joi.object().keys({
    tier: Joi.number().integer().required(),
    duration: Joi.number().required(),
    distance: Joi.number().required(),
    type: Joi.string().valid('Base', 'Extra KM').required(),
    price: Joi.number().required(),
    per_km_rate: Joi.number().required(),
  }),

  updateCombinationValidation: Joi.object().keys({
    tier: Joi.number().integer(),
    duration: Joi.number(),
    distance: Joi.number(),
    type: Joi.string().valid('Base', 'Extra KM'),
    price: Joi.number(),
    per_km_rate: Joi.number(),
  }),
};
