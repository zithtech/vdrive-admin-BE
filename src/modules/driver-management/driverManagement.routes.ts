import { Router } from 'express';
import { DriverManagementController } from './driverManagement.controller';
import isAuthenticated from '../../shared/authentication';
import { requirePermission } from '../../shared/authorization';

const router = Router();

// Apply admin authentication to all routes
router.use(isAuthenticated);

router.get('/', requirePermission('drivers', 'read'), DriverManagementController.getDrivers);
router.get('/dashboard-stats', requirePermission('drivers', 'read'), DriverManagementController.getDashboardStats);
router.get('/:id', requirePermission('drivers', 'read'), DriverManagementController.getDriverById);
router.post('/', requirePermission('drivers', 'create'), DriverManagementController.createDriver);
router.patch('/:id', requirePermission('drivers', 'update'), DriverManagementController.updateDriver);
router.post('/admin-verify/:id', requirePermission('drivers', 'update'), DriverManagementController.adminVerifyDriver);
router.post('/:id/go-online', DriverManagementController.goOnline);
router.post('/:id/go-offline', DriverManagementController.goOffline);
router.get('/activity/:id', DriverManagementController.getRideActivity);
router.get('/performance/:id', DriverManagementController.getPerformance);
router.get('/earnings/:id/summary', DriverManagementController.getEarningsSummary);
router.get('/wallet/:id/balance', DriverManagementController.getWalletBalance);
router.post('/search', DriverManagementController.searchNearbyDrivers);
router.post('/available-for-assignment', DriverManagementController.getAvailableDriversForAssignment);

export default router;
