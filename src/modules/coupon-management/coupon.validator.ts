import { Joi } from 'celebrate';

export const CouponValidation = {
  idValidation: Joi.object().keys({
    id: Joi.string().uuid().required(),
  }),

  createValidation: Joi.object().keys({
    code: Joi.string().min(3).max(50).required(),
    discount_type: Joi.string().valid('PERCENTAGE', 'FIXED', 'FREE_RIDE').required(),
    discount_value: Joi.number().min(0).required(),
    min_ride_amount: Joi.number().min(0).default(0),
    max_discount_amount: Joi.number().min(0).allow(null),
    usage_limit: Joi.number().integer().min(1).allow(null),
    per_user_limit: Joi.number().integer().min(1).default(1),
    valid_from: Joi.date().iso().required(),
    valid_until: Joi.date().iso().min(Joi.ref('valid_from')).required(),
    applicable_ride_types: Joi.any(),
    applicable_to: Joi.string().valid('CUSTOMER', 'DRIVER').default('CUSTOMER'),
    user_eligibility: Joi.string().valid('NEW_USERS', 'EXISTING_USERS', 'ALL').default('ALL'),
    is_active: Joi.boolean().default(true),
  }),

  updateValidation: Joi.object({
    code: Joi.string().min(3).max(50),
    discount_type: Joi.string().valid('PERCENTAGE', 'FIXED', 'FREE_RIDE'),
    discount_value: Joi.number().min(0),
    min_ride_amount: Joi.number().min(0),
    max_discount_amount: Joi.number().min(0).allow(null),
    usage_limit: Joi.number().integer().min(1).allow(null),
    per_user_limit: Joi.number().integer().min(1),
    valid_from: Joi.date().iso(),
    valid_until: Joi.date().iso().min(Joi.ref('valid_from')),
    applicable_ride_types: Joi.any(),
    applicable_to: Joi.string().valid('CUSTOMER', 'DRIVER'),
    user_eligibility: Joi.string().valid('NEW_USERS', 'EXISTING_USERS', 'ALL'),
    is_active: Joi.boolean(),
  }).min(1),

  statusValidation: Joi.object({
    is_active: Joi.boolean().required(),
  }),

  validateAndApplyValidation: Joi.object({
    code: Joi.string().required(),
    userId: Joi.string().required(),
    amount: Joi.number().min(0).required(),
  }),

  recordUsageValidation: Joi.object({
    coupon_id: Joi.string().uuid().required(),
    user_id: Joi.string().required(),
    trip_id: Joi.string().required(),
    discount_applied: Joi.number().min(0).required(),
  }),
};
