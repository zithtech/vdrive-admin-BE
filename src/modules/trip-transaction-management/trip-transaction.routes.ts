import { Router } from 'express';
import { TripTransactionManagementController } from './trip-transaction.controller';
import isAuthenticated from '../../shared/authentication';
import { requirePermission } from '../../shared/authorization';

const router = Router();

// Apply admin authentication to all routes
router.use(isAuthenticated);

// Trip management routes that proxy to user driver service
// Validation is handled by the user driver API
router.get('/',requirePermission('trip_transaction', 'read'), TripTransactionManagementController.getTrips);

router.get('/bytripid/:id',requirePermission('trip_transaction', 'read'), TripTransactionManagementController.getTripById);

router.post('/create',requirePermission('trip_transaction', 'create'), TripTransactionManagementController.createTrip);

router.patch('/update/:id',requirePermission('trip_transaction', 'update'), TripTransactionManagementController.updateTrip);

export default router;
