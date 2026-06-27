import { Router } from 'express';
import { TripVerificationController } from './tripVerification.controller';
import isAuthenticated from '../../shared/authentication';
import { requirePermission } from '../../shared/authorization';

const router = Router();

// Apply admin authentication
router.use(isAuthenticated);

router.get(
  '/pending',
  requirePermission('trips', 'read'),
  TripVerificationController.getPendingVerifications
);
router.get(
  '/details/:id',
  requirePermission('trips', 'read'),
  TripVerificationController.getVerificationDetails
);
router.get(
  '/comparison/:driverId',
  requirePermission('trips', 'read'),
  TripVerificationController.getComparisonData
);
router.put('/verify/:id', requirePermission('trips', 'update'), TripVerificationController.verifySimple);
router.put(
  '/verify-granular/:id',
  requirePermission('trips', 'update'),
  TripVerificationController.verifyGranular
);
router.get('/trip/:tripId', requirePermission('trips', 'read'), TripVerificationController.getByTripId);
router.get('/history/:id', requirePermission('trips', 'read'), TripVerificationController.getHistory);

export default router;
