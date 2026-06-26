import { Router } from 'express';
import { DriverManagementController } from './driverManagement.controller';
import isAuthenticated from '../../shared/authentication';
import { requirePermission } from '../../shared/authorization';

const router = Router();

// Apply admin authentication to all routes
router.use(isAuthenticated);

// Static/specific GET routes MUST come before the /:id wildcard
router.get('/', requirePermission('drivers', 'read'), DriverManagementController.getDrivers);
// Dashboard overview is gated by `dashboard.read` (not drivers.read) so granting
// "view dashboard" unlocks the whole overview. It returns only aggregate summary data.
router.get(
  '/dashboard-stats',
  requirePermission('dashboard', 'read'),
  DriverManagementController.getDashboardStats
);
router.get(
  '/documents/history/:document_id',
  requirePermission('drivers', 'read'),
  DriverManagementController.getDocumentHistory
);
router.get(
  '/activity/:id',
  requirePermission('drivers', 'read'),
  DriverManagementController.getRideActivity
);
router.get(
  '/performance/:id',
  requirePermission('drivers', 'read'),
  DriverManagementController.getPerformance
);
router.get(
  '/earnings/:id/summary',
  requirePermission('drivers', 'read'),
  DriverManagementController.getEarningsSummary
);
router.get(
  '/wallet/:id/balance',
  requirePermission('drivers', 'read'),
  DriverManagementController.getWalletBalance
);
router.get(
  '/today-overview/:id',
  requirePermission('drivers', 'read'),
  DriverManagementController.getTodayOverview
);

// Wildcard /:id MUST come after all specific GET routes
router.get('/:id', requirePermission('drivers', 'read'), DriverManagementController.getDriverById);

router.post('/', requirePermission('drivers', 'create'), DriverManagementController.createDriver);
router.post(
  '/search',
  requirePermission('drivers', 'read'),
  DriverManagementController.searchNearbyDrivers
);
router.post(
  '/available-for-assignment',
  requirePermission('drivers', 'read'),
  DriverManagementController.getAvailableDriversForAssignment
);
router.post(
  '/admin-verify/:id',
  requirePermission('drivers', 'update'),
  DriverManagementController.adminVerifyDriver
);
router.post(
  '/:id/go-online',
  requirePermission('drivers', 'update'),
  DriverManagementController.goOnline
);
router.post(
  '/:id/go-offline',
  requirePermission('drivers', 'update'),
  DriverManagementController.goOffline
);

router.patch(
  '/documents/verify/:document_id',
  requirePermission('drivers', 'update'),
  DriverManagementController.verifyDocument
);
router.patch(
  '/documents/bulk-verify/:id',
  requirePermission('drivers', 'update'),
  DriverManagementController.bulkVerifyDocuments
);
router.post(
  '/documents/:document_id/ocr',
  requirePermission('drivers', 'update'),
  DriverManagementController.runOCR
);
router.patch(
  '/:id',
  requirePermission('drivers', 'update'),
  DriverManagementController.updateDriver
);

export default router;
