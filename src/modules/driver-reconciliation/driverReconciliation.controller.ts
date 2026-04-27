// src/modules/driver-reconciliation/driverReconciliation.controller.ts
import { Request, Response, NextFunction } from 'express';
import { DriverReconciliationService } from './driverReconciliation.service';
import { DriverReconciliationPayload } from './driverReconciliation.model';

interface AuthRequest extends Request {
  user?: { id: string };
}

export class DriverReconciliationController {
  // Sync all reconciliation data with live database
  static async syncReconciliationData(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DriverReconciliationService.syncReconciliationData();
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Error in syncReconciliationData:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Process reconciliation data payload
  static async processReconciliationData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.id; // From authentication middleware
      const payload: DriverReconciliationPayload = req.body;

      // Validate payload
      if (!payload.filename || !Array.isArray(payload.data)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payload: filename and data array are required',
        });
      }

      if (payload.data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Data array cannot be empty',
        });
      }

      if (payload.data.length > 10000) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 10,000 rows allowed per upload',
        });
      }

      // Process the data
      const result = await DriverReconciliationService.processReconciliationData(adminId, payload);

      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error: any) {
      console.error('Error in processReconciliationData:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // Get upload details
  static async getUploadDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const uploadId = parseInt(req.params.uploadId);

      if (isNaN(uploadId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid upload ID',
        });
      }

      const result = await DriverReconciliationService.getUploadDetails(uploadId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error in getUploadDetails:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Get reconciliation rows for an upload
  static async getReconciliationRows(req: Request, res: Response, next: NextFunction) {
    try {
      const uploadId = parseInt(req.params.uploadId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      if (isNaN(uploadId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid upload ID',
        });
      }

      if (page < 1 || limit < 1 || limit > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pagination parameters',
        });
      }

      const result = await DriverReconciliationService.getReconciliationRows(uploadId, page, limit);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error in getReconciliationRows:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Get all reconciliation rows without upload ID filter
  static async getAllReconciliationRows(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      if (page < 1 || limit < 1 || limit > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pagination parameters',
        });
      }

      const result = await DriverReconciliationService.getAllReconciliationRows(page, limit);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error in getAllReconciliationRows:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Get all uploads
  static async getUploads(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      if (page < 1 || limit < 1 || limit > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pagination parameters',
        });
      }

      const result = await DriverReconciliationService.getUploads(page, limit);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error in getUploads:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Update WhatsApp campaign status
  static async updateWhatsAppCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { rowIds } = req.body;

      if (!Array.isArray(rowIds) || rowIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'rowIds must be a non-empty array of numbers',
        });
      }

      // Validate that all IDs are numbers
      if (!rowIds.every((id) => typeof id === 'number' && id > 0)) {
        return res.status(400).json({
          success: false,
          message: 'All rowIds must be positive numbers',
        });
      }

      if (rowIds.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 1000 rows can be updated at once',
        });
      }

      const result = await DriverReconciliationService.updateWhatsAppCampaign(rowIds);

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Error in updateWhatsAppCampaign:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Get reconciliation summary statistics
  static async getReconciliationSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await DriverReconciliationService.getReconciliationSummary();

      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error('Error in getReconciliationSummary:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
}
