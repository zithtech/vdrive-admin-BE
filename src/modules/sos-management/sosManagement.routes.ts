import { Router } from 'express';
import { SosManagementController } from './sosManagement.controller';
import { requirePermission } from '../../shared/authorization';

const router = Router();

// NOTE: there is no dedicated 'sos' permission module yet, so SOS is gated under
// 'drivers' as an interim. Phase 5 (naming consistency) should introduce a proper
// 'sos' module and switch these checks over.
router.get('/active', requirePermission('drivers', 'read'), SosManagementController.getActiveSos);
router.post('/resolve', requirePermission('drivers', 'update'), SosManagementController.resolveSos);

export default router;
