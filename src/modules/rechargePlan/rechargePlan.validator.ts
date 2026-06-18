import { Joi } from 'celebrate';
//import * as commonSchema from './validator';

export const RechargePlanValidation = {
  idValidation: Joi.object().keys({
    id: Joi.number().integer().positive().required(),
  }),

  createValidation: Joi.object().keys({
    planName: Joi.string().min(2).max(100).required(),
    description: Joi.string().allow('', null),
    validityDays: Joi.number().integer().min(0).required(),
    dailyPrice: Joi.number().precision(2).default(0),
    weeklyPrice: Joi.number().precision(2).default(0),
    monthlyPrice: Joi.number().precision(2).default(0),
    features: Joi.any().default({}),
    isActive: Joi.boolean().default(true),
    tag: Joi.string().max(100).allow('', null),
    promoCode: Joi.string().allow('', null),
    promoDiscount: Joi.number().min(0).max(100).default(0),
    firstRechargeDiscount: Joi.number().min(0).max(100).default(0),
  }),

  updateValidation: Joi.object({
    planName: Joi.string().min(2).max(100),
    description: Joi.string().allow('', null),
    validityDays: Joi.number().integer().min(0),
    dailyPrice: Joi.number().precision(2),
    weeklyPrice: Joi.number().precision(2),
    monthlyPrice: Joi.number().precision(2),
    features: Joi.any(),
    isActive: Joi.boolean(),
    tag: Joi.string().max(100).allow('', null),
    promoCode: Joi.string().allow('', null),
    promoDiscount: Joi.number().min(0).max(100),
    firstRechargeDiscount: Joi.number().min(0).max(100),
  })

    .min(1)
    .messages({
      'object.min': 'At least one field must be provided to update recharge plan',
    }),

  statusValidation: Joi.object({
    isActive: Joi.boolean().required(),
  }),
};
