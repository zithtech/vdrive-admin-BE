import { Joi } from 'celebrate';

export const TaxValidation = {
  idValidation: Joi.object().keys({
    id: Joi.string().uuid().required(),
  }),

  createValidation: Joi.object().keys({
    tax_name: Joi.string().min(2).max(100).required(),
    tax_code: Joi.string().min(2).max(50).required(),
    tax_type: Joi.string().min(2).max(50).required(),
    percentage: Joi.number().precision(2).min(0).max(100).required(),
    description: Joi.string().allow('', null),
    is_active: Joi.boolean().default(true),
    is_default: Joi.boolean().default(false),
    indian_tax: Joi.string()
      .valid('GST', 'CGST', 'SGST', 'IGST', 'UTGST', 'TDS', 'TCS', 'VAT', 'PT', 'SURCHARGE')
      .allow(null, ''),
  }),

  updateValidation: Joi.object({
    tax_name: Joi.string().min(2).max(100),
    tax_code: Joi.string().min(2).max(50),
    tax_type: Joi.string().min(2).max(50),
    percentage: Joi.number().precision(2).min(0).max(100),
    description: Joi.string().allow('', null),
    is_active: Joi.boolean(),
    is_default: Joi.boolean(),
    indian_tax: Joi.string()
      .valid('GST', 'CGST', 'SGST', 'IGST', 'UTGST', 'TDS', 'TCS', 'VAT', 'PT', 'SURCHARGE')
      .allow(null, ''),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided to update tax',
    }),

  statusValidation: Joi.object({
    is_active: Joi.boolean().required(),
  }),
};
