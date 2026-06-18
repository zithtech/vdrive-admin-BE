import { Router } from 'express';
import { CouponController } from './coupon.controller';
import { validateBody, validateParams } from '../../utilities/helper';
import { CouponValidation } from './coupon.validator';
import isAuthenticated from '../../shared/authentication';
import { requirePermission } from '../../shared/authorization';

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

adminCouponRoutes.get('/', requirePermission('coupons', 'read'), CouponController.getCoupons);

adminCouponRoutes.get(
  '/:id',
  requirePermission('coupons', 'read'),
  validateParams(CouponValidation.idValidation),
  CouponController.getCouponById
);

adminCouponRoutes.post(
  '/create',
  requirePermission('coupons', 'create'),
  validateBody(CouponValidation.createValidation),
  CouponController.createCoupon
);

adminCouponRoutes.patch(
  '/update/:id',
  requirePermission('coupons', 'update'),
  validateParams(CouponValidation.idValidation),
  validateBody(CouponValidation.updateValidation),
  CouponController.updateCoupon
);

adminCouponRoutes.patch(
  '/status/:id',
  requirePermission('coupons', 'update'),
  validateParams(CouponValidation.idValidation),
  validateBody(CouponValidation.statusValidation),
  CouponController.toggleStatus
);

adminCouponRoutes.delete(
  '/delete/:id',
  requirePermission('coupons', 'delete'),
  validateParams(CouponValidation.idValidation),
  CouponController.deleteCoupon
);

adminCouponRoutes.post(
  '/notify/:id',
  requirePermission('coupons', 'update'),
  validateParams(CouponValidation.idValidation),
  CouponController.notifyUsers
);
