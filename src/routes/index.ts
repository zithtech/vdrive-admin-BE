// src/routes/index.ts
import { Router } from 'express';
import userRoutes from '../modules/admin-users/adminUser.routes';
import userManagementRoutes from '../modules/user-management/userManagement.routes';
import tripManagementRoutes from '../modules/trip-management/tripManagement.routes';
import authRoutes from '../modules/auth/auth.routes';
import isAuthenticated from '../shared/authentication';
import locationRoutes from '../modules/locations/location.routes';
import hotspotRoutes from '../modules/hotspots/hotspot.routes';
import priceSettingsRoutes from '../modules/price-settings/price.routes';
import packageRoutes from '../modules/packages/package.routes';
import s3Routes from '../modules/s3/s3.routes';
import driverReconciliationRoutes from '../modules/driver-reconciliation/driverReconciliation.routes';
import rechargePlanRoutes from '../modules/rechargePlan/rechargePlan.routes';
import pricingFareRulesRoutes from '../modules/pricing-fare-rules/pricingFareRules.routes';
import driverManagementRoutes from '../modules/driver-management/driverManagement.routes';
import sosManagementRoutes from '../modules/sos-management/sosManagement.routes';
import webhookRoutes from '../modules/webhooks/webhook.routes';
import { isServiceAuthenticated } from '../shared/serviceAuthentication';
import pricingCalculatorRoutes from '../modules/pricing-calculator/pricingCalculator.routes';
import { sendToSocket } from '../services/socket';
import tripTransactionManagementRoutes from '../modules/trip-transaction-management/trip-transaction.routes';
import taxRoutes from '../modules/tax-management/tax.routes';
import pricingCombinationRoutes from '../modules/pricing-combinations/pricing-combinations.routes';
import { openCouponRoutes, adminCouponRoutes } from '../modules/coupon-management/coupon.routes';
import referralManagementRoutes from '../modules/referral-management/referral.routes';
import promoRoutes from '../modules/promo-management/promo.routes';

const router = Router();

router.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is healthy' });
});
router.use('/auth', authRoutes);

// Webhook routes (secured with API key as it is called by internal Driver API)
router.use('/webhooks', isServiceAuthenticated, webhookRoutes);
// Open endpoint for user-driver backend to fetch all type pricing
router.use('/pricing', pricingCalculatorRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/coupons', openCouponRoutes);

router.use(isAuthenticated);

router.use('/locations', locationRoutes);
router.use('/hotspots', hotspotRoutes);
router.use('/price-settings', priceSettingsRoutes);
router.use('/packages', packageRoutes);
router.use('/admin-users', userRoutes);
router.use('/users', userManagementRoutes);
router.use('/drivers', driverManagementRoutes);
import tripVerificationRoutes from '../modules/trip-management/tripVerification.routes';

router.use('/trips', tripManagementRoutes);
router.use('/trip-verification', tripVerificationRoutes);
router.use('/generate-presigned-url', s3Routes);
router.use('/driver-reconciliation', driverReconciliationRoutes);
router.use('/recharge-plans', rechargePlanRoutes);
router.use('/promos', promoRoutes);
router.use('/pricing-fare-rules', pricingFareRulesRoutes);
router.use('/sos', sosManagementRoutes);
router.use('/triptransactions', tripTransactionManagementRoutes);
router.use('/taxes', taxRoutes);
router.use('/pricing-combinations', pricingCombinationRoutes);
router.use('/coupons', adminCouponRoutes);
router.use('/referrals', referralManagementRoutes);

router.get('/internal/trip-alert', (req, res) => {
  const { trip, secret } = req.body;

  // Security check: Only allow requests with the shared secret
  if (secret !== process.env.INTERNAL_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  sendToSocket('admin', 'ADMIN_NEW_TRIP_ALERT', trip);

  res.status(200).json({ success: true });
});

export default router;

