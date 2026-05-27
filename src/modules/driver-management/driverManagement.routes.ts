import { Router } from 'express';
import { DriverManagementController } from './driverManagement.controller';
import isAuthenticated from '../../shared/authentication';

const router = Router();

// Apply admin authentication to all routes
router.use(isAuthenticated);

// Static/specific GET routes MUST come before the /:id wildcard
router.get('/', DriverManagementController.getDrivers);
router.get('/dashboard-stats', DriverManagementController.getDashboardStats);
router.get('/documents/history/:document_id', DriverManagementController.getDocumentHistory);
router.get('/activity/:id', DriverManagementController.getRideActivity);
router.get('/performance/:id', DriverManagementController.getPerformance);
router.get('/earnings/:id/summary', DriverManagementController.getEarningsSummary);
router.get('/wallet/:id/balance', DriverManagementController.getWalletBalance);
router.get('/today-overview/:id', DriverManagementController.getTodayOverview);

// Wildcard /:id MUST come after all specific GET routes
router.get('/:id', DriverManagementController.getDriverById);

router.post('/', DriverManagementController.createDriver);
router.post('/search', DriverManagementController.searchNearbyDrivers);
router.post('/available-for-assignment', DriverManagementController.getAvailableDriversForAssignment);
router.post('/admin-verify/:id', DriverManagementController.adminVerifyDriver);
router.post('/:id/go-online', DriverManagementController.goOnline);
router.post('/:id/go-offline', DriverManagementController.goOffline);

router.patch('/documents/verify/:document_id', DriverManagementController.verifyDocument);
router.patch('/documents/bulk-verify/:id', DriverManagementController.bulkVerifyDocuments);
router.patch('/:id', DriverManagementController.updateDriver);

export default router;
