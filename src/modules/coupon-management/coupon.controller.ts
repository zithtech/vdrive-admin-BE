import { Request, Response } from 'express';
import { CouponService } from './coupon.service';
import axios from 'axios';
import config from '../../config';
import { logger } from '../../shared/logger';

const notifyUserBackend = async (event: string, payload: any) => {
  try {
    await axios.post(config.userBackendWebhookUrl, {
      event,
      payload,
      secret: config.internalSecret,
    });
  } catch (error) {
    logger.error('Webhook notification failed:', error);
  }
};

export const CouponController = {
  async getCoupons(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await CouponService.getCoupons(page, limit);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async getCouponById(req: Request, res: Response) {
    try {
      const result = await CouponService.getCouponById(req.params.id);
      if (!result) return res.status(404).json({ message: 'Coupon not found' });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async createCoupon(req: Request, res: Response) {
    try {
      const result = await CouponService.createCoupon(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  },

  async updateCoupon(req: Request, res: Response) {
    try {
      const result = await CouponService.updateCoupon(req.params.id, req.body);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  },

  async toggleStatus(req: Request, res: Response) {
    try {
      const { is_active } = req.body;
      const result = await CouponService.toggleCouponStatus(req.params.id, is_active);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  },

  async deleteCoupon(req: Request, res: Response) {
    try {
      await CouponService.deleteCoupon(req.params.id);
      res.status(200).json({ message: 'Coupon deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async validateAndApply(req: Request, res: Response) {
    try {
      const { code, userId, amount } = req.body;
      const validationResult = await CouponService.validateAndApplyCoupon(code, userId, amount);
      res.status(200).json(validationResult);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  },

  async recordUsage(req: Request, res: Response) {
    try {
      const result = await CouponService.recordCouponUsage(req.body);

      // Notify user app via webhook about successful coupon application
      await notifyUserBackend('COUPON_APPLIED', {
        userId: req.body.user_id,
        couponId: req.body.coupon_id,
        tripId: req.body.trip_id,
        discountApplied: req.body.discount_applied,
      });

      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  },

  async notifyUsers(req: Request, res: Response) {
    try {
      const { target, userIds, userId } = req.body;
      const specificUsers = userIds || userId;
      const result = await CouponService.notifyUsers(req.params.id, target, specificUsers);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};
