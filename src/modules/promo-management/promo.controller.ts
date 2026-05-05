import { Request, Response } from 'express';
import { PromoService } from './promo.service';

export const PromoController = {
  async getPromos(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await PromoService.getPromos(page, limit);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getPromoById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const promo = await PromoService.getPromoById(id);
      if (!promo) {
        return res.status(404).json({ success: false, message: 'Promo not found' });
      }
      res.status(200).json({ success: true, data: promo });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async createPromo(req: Request, res: Response) {
    try {
      const promo = await PromoService.createPromo(req.body);
      res.status(201).json({ success: true, data: promo });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async updatePromo(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const promo = await PromoService.updatePromo(id, req.body);
      res.status(200).json({ success: true, data: promo });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async toggleStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { is_active } = req.body;
      const promo = await PromoService.togglePromoStatus(id, is_active);
      res.status(200).json({ success: true, data: promo });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async deletePromo(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await PromoService.deletePromo(id);
      res.status(200).json({ success: true, message: 'Promo deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async notifyDrivers(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { target, driverId } = req.body;
      const promo = await PromoService.triggerNotification(id, target, driverId);
      res.status(200).json({ success: true, data: promo });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};
