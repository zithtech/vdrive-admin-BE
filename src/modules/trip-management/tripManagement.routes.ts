import { Router } from 'express';
import { TripManagementController } from './tripManagement.controller';
import isAuthenticated from '../../shared/authentication';

const router = Router();

// Apply admin authentication to all routes
router.use(isAuthenticated);

// Trip management routes that proxy to user driver service
// Validation is handled by the user driver API
router.get('/', TripManagementController.getTrips);

router.get('/:id', TripManagementController.getTripById);

router.post('/create', TripManagementController.createTrip);

router.patch('/update/:id', TripManagementController.updateTrip);

router.post('/:id/assign', TripManagementController.assignDriver);

router.post('/:id/trigger', TripManagementController.triggerTrip);

export default router;
