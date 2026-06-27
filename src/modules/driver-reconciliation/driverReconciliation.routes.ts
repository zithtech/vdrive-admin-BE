// src/modules/driver-reconciliation/driverReconciliation.routes.ts
import { Router } from 'express';
import { DriverReconciliationController } from './driverReconciliation.controller';
import isAuthenticated from '../../shared/authentication';
import { requirePermission } from '../../shared/authorization';

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Driver Outreach is gated by the `drivers_outreach` module (matches the FE page).
// POST /api/driver-reconciliation/process - Process reconciliation data
router.post(
  '/process',
  requirePermission('drivers_outreach', 'create'),
  DriverReconciliationController.processReconciliationData
);

// POST /api/driver-reconciliation/sync - Sync data with live database
router.post(
  '/sync',
  requirePermission('drivers_outreach', 'update'),
  DriverReconciliationController.syncReconciliationData
);

// GET /api/driver-reconciliation/uploads - Get all uploads with pagination
router.get(
  '/uploads',
  requirePermission('drivers_outreach', 'read'),
  DriverReconciliationController.getUploads
);

// GET /api/driver-reconciliation/uploads/:uploadId - Get upload details
router.get(
  '/uploads/:uploadId',
  requirePermission('drivers_outreach', 'read'),
  DriverReconciliationController.getUploadDetails
);

// GET /api/driver-reconciliation/uploads/:uploadId/rows - Get reconciliation rows
router.get(
  '/uploads/:uploadId/rows',
  requirePermission('drivers_outreach', 'read'),
  DriverReconciliationController.getReconciliationRows
);

// GET /api/driver-reconciliation/rows - Get all reconciliation rows
router.get(
  '/rows',
  requirePermission('drivers_outreach', 'read'),
  DriverReconciliationController.getAllReconciliationRows
);

// POST /api/driver-reconciliation/whatsapp-campaign - Update WhatsApp campaign status
router.post(
  '/whatsapp-campaign',
  requirePermission('drivers_outreach', 'update'),
  DriverReconciliationController.updateWhatsAppCampaign
);

// GET /api/driver-reconciliation/summary - Get reconciliation summary statistics
router.get(
  '/summary',
  requirePermission('drivers_outreach', 'read'),
  DriverReconciliationController.getReconciliationSummary
);

export default router;
