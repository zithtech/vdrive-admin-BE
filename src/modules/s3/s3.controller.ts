import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/logger';
import { successResponse } from '../../shared/errorHandler';
import { s3Service } from './s3.service';

export const S3Controller = {
  async generateUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key, contentType } = req.body;
      if (!key || !contentType) {
        res.status(400).json({ success: false, message: 'Key and ContentType are required' });
        return;
      }
      const result = await s3Service.getUploadUrl(key, contentType);
      successResponse(res, 200, 'Presigned URL generated successfully', result);
    } catch (error: any) {
      next(error);
    }
  },
};
