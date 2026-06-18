import { Joi } from 'celebrate';

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{5,18}$/;
const phoneRegex = /^\+?[0-9]{6,15}$/;

export const AdminUserValidation = {
  createAdminUserValidation: Joi.object().keys({
    name: Joi.string().min(2).max(100).required().messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required',
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(5).max(18).pattern(passwordRegex).required().messages({
      'string.pattern.base':
        'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
      'string.min': 'Password must be at least 5 characters long',
      'string.max': 'Password must not exceed 18 characters',
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
    contact: Joi.string().pattern(phoneRegex).max(15).optional().messages({
      'string.pattern.base': 'Contact must be a valid phone number',
      'string.max': 'Contact must not exceed 15 characters',
    }),
    role: Joi.string().optional().default('admin').messages({
      'string.empty': 'Role is required',
    }),
    role_id: Joi.string().uuid().optional().allow(null).messages({
      'string.guid': 'Role ID must be a valid UUID',
    }),
  }),

  updateAdminUserValidation: Joi.object({
    name: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters',
    }),
    email: Joi.string().email().optional().messages({
      'string.email': 'Email must be a valid email address',
    }),
    contact: Joi.string().pattern(phoneRegex).max(15).optional().messages({
      'string.pattern.base': 'Contact must be a valid phone number',
      'string.max': 'Contact must not exceed 15 characters',
    }),
    role: Joi.string().optional().messages({
      'string.empty': 'Role cannot be empty',
    }),
    role_id: Joi.string().uuid().optional().allow(null).messages({
      'string.guid': 'Role ID must be a valid UUID',
    }),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided to update',
    }),

  idValidation: Joi.object().keys({
    id: Joi.string().uuid().required().messages({
      'string.guid': 'ID must be a valid UUID',
      'any.required': 'ID is required',
    }),
  }),
};
