// src/modules/driver-reconciliation/driverReconciliation.routes.ts
import { Router } from 'express';
import { DriverReconciliationController } from './driverReconciliation.controller';
import isAuthenticated from '../../shared/authentication';

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// POST /api/driver-reconciliation/process - Process reconciliation data
router.post('/process', DriverReconciliationController.processReconciliationData);

// POST /api/driver-reconciliation/sync - Sync data with live database
router.post('/sync', DriverReconciliationController.syncReconciliationData);

// GET /api/driver-reconciliation/uploads - Get all uploads with pagination
router.get('/uploads', DriverReconciliationController.getUploads);

// GET /api/driver-reconciliation/uploads/:uploadId - Get upload details
router.get('/uploads/:uploadId', DriverReconciliationController.getUploadDetails);

// GET /api/driver-reconciliation/uploads/:uploadId/rows - Get reconciliation rows
router.get('/uploads/:uploadId/rows', DriverReconciliationController.getReconciliationRows);

// GET /api/driver-reconciliation/rows - Get all reconciliation rows
router.get('/rows', DriverReconciliationController.getAllReconciliationRows);

// POST /api/driver-reconciliation/whatsapp-campaign - Update WhatsApp campaign status
router.post('/whatsapp-campaign', DriverReconciliationController.updateWhatsAppCampaign);

// GET /api/driver-reconciliation/summary - Get reconciliation summary statistics
router.get('/summary', DriverReconciliationController.getReconciliationSummary);

export default router;
