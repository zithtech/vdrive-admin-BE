import { Router } from 'express';
import { ReferralController } from './referral.controller';

const router = Router();

router.get('/', ReferralController.listConfigs);
router.get('/active', ReferralController.getActiveConfig);
router.get('/logs', ReferralController.listLogs);
router.post('/', ReferralController.createConfig);
router.patch('/:id', ReferralController.updateConfig);
router.delete('/:id', ReferralController.deleteConfig);

export default router;
