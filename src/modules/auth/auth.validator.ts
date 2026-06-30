import { Joi } from 'celebrate';

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{5,18}$/;

export const AuthValidation = {
  signInValidation: Joi.object().keys({
    user_name: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is required.',
    }),
    password: Joi.string().required().min(5).max(18).pattern(passwordRegex).messages({
      'string.pattern.base':
        'Password must contain at least 1 uppercase letter, 1 number, and 1 special character.',
    }),
  }),

  forgotPasswordValidation: Joi.object().keys({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is required.',
    }),
  }),

  resetPasswordValidation: Joi.object().keys({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is required.',
    }),
    otp: Joi.string().length(6).required().messages({
      'any.required': 'OTP is required',
      'string.length': 'OTP must be exactly 6 digits',
    }),
    newPassword: Joi.string().required().min(5).max(18).pattern(passwordRegex).messages({
      'string.pattern.base':
        'Password must contain at least 1 uppercase letter, 1 number, and 1 special character.',
    }),
  }),

  changePasswordValidation: Joi.object().keys({
    oldPassword: Joi.string().required().messages({
      'any.required': 'Old password is required',
    }),
    newPassword: Joi.string().required().min(5).max(18).pattern(passwordRegex).messages({
      'string.pattern.base':
        'Password must contain at least 1 uppercase letter, 1 number, and 1 special character.',
    }),
  }),

  updateProfileValidation: Joi.object().keys({
    contact: Joi.string().allow('', null).optional().messages({
      'string.base': 'Contact must be a string.',
    }),
  }),
};
