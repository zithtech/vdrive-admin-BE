import { Request, Response } from 'express';
import { ReferralService } from './referral.service';
import { logger } from '../../shared/logger';

export const ReferralController = {
  async listConfigs(req: Request, res: Response) {
    try {
      const configs = await ReferralService.listConfigs();
      return res.status(200).json({ success: true, data: configs });
    } catch (error: any) {
      logger.error('ReferralController.listConfigs error', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async createConfig(req: Request, res: Response) {
    try {
      const config = await ReferralService.createConfig(req.body);
      return res.status(201).json({ success: true, data: config });
    } catch (error: any) {
      logger.error('ReferralController.createConfig error', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const config = await ReferralService.updateConfig(id, req.body);
      return res.status(200).json({ success: true, data: config });
    } catch (error: any) {
      logger.error('ReferralController.updateConfig error', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async deleteConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await ReferralService.deleteConfig(id);
      return res.status(200).json({ success: true, message: 'Configuration deleted successfully' });
    } catch (error: any) {
      logger.error('ReferralController.deleteConfig error', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async getActiveConfig(req: Request, res: Response) {
    try {
      const { user_type } = req.query;
      if (!user_type) {
        return res
          .status(400)
          .json({ success: false, message: 'user_type query param is required' });
      }
      const config = await ReferralService.getActiveConfig(user_type as string);
      return res.status(200).json({ success: true, data: config || null });
    } catch (error: any) {
      logger.error('ReferralController.getActiveConfig error', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async listLogs(req: Request, res: Response) {
    try {
      const { user_type } = req.query;
      if (!user_type) {
        return res
          .status(400)
          .json({ success: false, message: 'user_type query param is required' });
      }
      const logs = await ReferralService.listReferralLogs(user_type as string);
      return res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      logger.error('ReferralController.listLogs error', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};
