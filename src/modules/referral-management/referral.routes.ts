import { Router } from 'express';
import { ReferralController } from './referral.controller';
import { requirePermission } from '../../shared/authorization';

const router = Router();

// These routes were authenticated (global guard) but not authorized — any admin could
// manage referral configs. Both customer & driver referrals share this one endpoint set
// (distinguished by a `user_type` field), so they're gated under a single module.
router.get('/', requirePermission('user_referrals', 'read'), ReferralController.listConfigs);
router.get('/active', requirePermission('user_referrals', 'read'), ReferralController.getActiveConfig);
router.get('/logs', requirePermission('user_referrals', 'read'), ReferralController.listLogs);
router.post('/', requirePermission('user_referrals', 'create'), ReferralController.createConfig);
router.patch('/:id', requirePermission('user_referrals', 'update'), ReferralController.updateConfig);
router.delete('/:id', requirePermission('user_referrals', 'delete'), ReferralController.deleteConfig);

export default router;
