import { Router } from 'express';
import { TripManagementController } from './tripManagement.controller';
import isAuthenticated from '../../shared/authentication';
import { requirePermission } from '../../shared/authorization';

const router = Router();

// Apply admin authentication to all routes
router.use(isAuthenticated);

// Trip management routes that proxy to user driver service
// Validation is handled by the user driver API
router.get('/', requirePermission('trips', 'read'), TripManagementController.getTrips);

router.get('/:id', requirePermission('trips', 'read'), TripManagementController.getTripById);

router.post('/create', requirePermission('trips', 'create'), TripManagementController.createTrip);

router.patch(
  '/update/:id',
  requirePermission('trips', 'update'),
  TripManagementController.updateTrip
);

router.post(
  '/:id/assign',
  requirePermission('trips', 'update'),
  TripManagementController.assignDriver
);

router.post(
  '/:id/trigger',
  requirePermission('trips', 'update'),
  TripManagementController.triggerTrip
);

router.post(
  '/cancel/:id',
  requirePermission('trips', 'update'),
  TripManagementController.cancelTrip
);

export default router;
