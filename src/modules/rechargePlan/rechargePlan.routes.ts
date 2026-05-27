
import { Router } from 'express';
import { RechargePlanController } from './rechargePlan.controller';
import { validateBody, validateParams } from '../../utilities/helper';
import{ RechargePlanValidation} from './rechargePlan.validator';
import { requirePermission } from '../../shared/authorization';


const router = Router();

router.get('/',requirePermission('recharge', 'read'), RechargePlanController.getRechargePlans);
router.get('/stats',requirePermission('recharge', 'read'), RechargePlanController.getSubscriptionStats);
router.get('/active-subscriptions',requirePermission('recharge', 'read'), RechargePlanController.getAllActiveDriverSubscriptions);
router.get('/driver-history/:driverId',requirePermission('recharge', 'read'), RechargePlanController.getDriverSubscriptionHistory);


router.get(
  '/:id',
  requirePermission('recharge', 'read'),
  validateParams(RechargePlanValidation.idValidation),
  RechargePlanController.getRechargePlanById
);


router.get(
  '/history/:id',
  requirePermission('recharge', 'read'),
  validateParams(RechargePlanValidation.idValidation),
  RechargePlanController.getRechargePlanHistory
);


router.post(
  '/create',
  requirePermission('recharge', 'create'),
  validateBody(RechargePlanValidation.createValidation),
  RechargePlanController.createRechargePlan
);


router.patch(
  '/update/:id',
  requirePermission('recharge', 'update'),
  validateParams(RechargePlanValidation.idValidation),
  validateBody(RechargePlanValidation.updateValidation),
  RechargePlanController.editRechargePlan
);


router.patch(
  '/status/:id',
  requirePermission('recharge', 'update'),
  validateParams(RechargePlanValidation.idValidation),
  validateBody(RechargePlanValidation.statusValidation),
  RechargePlanController.toggleRechargePlanStatus
);


router.delete(
  '/delete/:id',
  requirePermission('recharge', 'delete'),
  validateParams(RechargePlanValidation.idValidation),
  RechargePlanController.deleteRechargePlan
);

router.post('/notify-expiring', requirePermission('recharge', 'update'), RechargePlanController.notifyExpiringSubscribers);
router.post('/notify-individual', requirePermission('recharge', 'update'), RechargePlanController.notifyIndividualSubscriber);

export default router;

