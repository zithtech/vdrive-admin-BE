import { Router } from 'express';
import { celebrate, Joi, Segments } from 'celebrate';
import { S3Controller } from './s3.controller';

const router = Router();

router.post(
  '/',
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      key: Joi.string().required().messages({
        'string.empty': 'Key is required.',
      }),
      contentType: Joi.string().required().messages({
        'string.empty': 'Content type is required.',
      }),
      bucketName: Joi.string().optional(),
      expiresIn: Joi.number().optional(),
    }),
  }),
  S3Controller.generateUploadUrl
);

export const s3PublicRoutes = Router();
s3PublicRoutes.post(
  '/generate-presigned-url',
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      key: Joi.string().required().messages({
        'string.empty': 'Key is required.',
      }),
      contentType: Joi.string().required().messages({
        'string.empty': 'Content type is required.',
      }),
      bucketName: Joi.string().optional(),
      expiresIn: Joi.number().optional(),
    }),
  }),
  S3Controller.generateUploadUrl
);

export default router;
