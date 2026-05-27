
import { Router } from 'express';
import { RechargePlanController } from './rechargePlan.controller';
import { validateBody, validateParams } from '../../utilities/helper';
import{ RechargePlanValidation} from './rechargePlan.validator';
import { requirePermission } from '../../shared/authorization';


const router = Router();

router.get('/',requirePermission('recharge', 'read'), RechargePlanController.getRechargePlans);
router.get('/active-subscriptions' ,requirePermission('recharge', 'read'), RechargePlanController.getAllActiveDriverSubscriptions);


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

export default router;

