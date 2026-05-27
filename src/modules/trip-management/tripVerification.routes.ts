import { Router } from 'express';
import { TripVerificationController } from './tripVerification.controller';
import isAuthenticated from '../../shared/authentication';

const router = Router();

// Apply admin authentication
router.use(isAuthenticated);

router.get('/pending', TripVerificationController.getPendingVerifications);
router.get('/details/:id', TripVerificationController.getVerificationDetails);
router.get('/comparison/:driverId', TripVerificationController.getComparisonData);
router.put('/verify/:id', TripVerificationController.verifySimple);
router.put('/verify-granular/:id', TripVerificationController.verifyGranular);
router.get('/trip/:tripId', TripVerificationController.getByTripId);
router.get('/history/:id', TripVerificationController.getHistory);

export default router;
