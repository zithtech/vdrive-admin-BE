import { Router } from 'express';
import { CouponController } from './coupon.controller';
import { validateBody, validateParams } from '../../utilities/helper';
import { CouponValidation } from './coupon.validator';
import isAuthenticated from '../../shared/authentication';

export const openCouponRoutes = Router();
export const adminCouponRoutes = Router();

// Open routes (for user app backend calls)
openCouponRoutes.post(
  '/validate',
  validateBody(CouponValidation.validateAndApplyValidation),
  CouponController.validateAndApply
);

openCouponRoutes.post(
  '/record-usage',
  validateBody(CouponValidation.recordUsageValidation),
  CouponController.recordUsage
);

// Admin routes (require authentication)
adminCouponRoutes.use(isAuthenticated);

adminCouponRoutes.get('/', CouponController.getCoupons);

adminCouponRoutes.get(
  '/:id',
  validateParams(CouponValidation.idValidation),
  CouponController.getCouponById
);

adminCouponRoutes.post(
  '/create',
  validateBody(CouponValidation.createValidation),
  CouponController.createCoupon
);

adminCouponRoutes.patch(
  '/update/:id',
  validateParams(CouponValidation.idValidation),
  validateBody(CouponValidation.updateValidation),
  CouponController.updateCoupon
);

adminCouponRoutes.patch(
  '/status/:id',
  validateParams(CouponValidation.idValidation),
  validateBody(CouponValidation.statusValidation),
  CouponController.toggleStatus
);

adminCouponRoutes.delete(
  '/delete/:id',
  validateParams(CouponValidation.idValidation),
  CouponController.deleteCoupon
);

adminCouponRoutes.post(
  '/notify/:id',
  validateParams(CouponValidation.idValidation),
  CouponController.notifyUsers
);
