
import { Router } from 'express';
import { RechargePlanController } from './rechargePlan.controller';
import { validateBody, validateParams } from '../../utilities/helper';
import{ RechargePlanValidation} from './rechargePlan.validator';


const router = Router();

router.get('/', RechargePlanController.getRechargePlans);
router.get('/stats', RechargePlanController.getSubscriptionStats);
router.get('/active-subscriptions', RechargePlanController.getAllActiveDriverSubscriptions);
router.get('/driver-history/:driverId', RechargePlanController.getDriverSubscriptionHistory);


router.get(
  '/:id',
  validateParams(RechargePlanValidation.idValidation),
  RechargePlanController.getRechargePlanById
);


router.get(
  '/history/:id',
  validateParams(RechargePlanValidation.idValidation),
  RechargePlanController.getRechargePlanHistory
);


router.post(
  '/create',
  validateBody(RechargePlanValidation.createValidation),
  RechargePlanController.createRechargePlan
);


router.patch(
  '/update/:id',
  validateParams(RechargePlanValidation.idValidation),
  validateBody(RechargePlanValidation.updateValidation),
  RechargePlanController.editRechargePlan
);


router.patch(
  '/status/:id',
  validateParams(RechargePlanValidation.idValidation),
  validateBody(RechargePlanValidation.statusValidation),
  RechargePlanController.toggleRechargePlanStatus
);


router.delete(
  '/delete/:id',
  validateParams(RechargePlanValidation.idValidation),
  RechargePlanController.deleteRechargePlan
);

router.post('/notify-expiring', RechargePlanController.notifyExpiringSubscribers);
router.post('/notify-individual', RechargePlanController.notifyIndividualSubscriber);

export default router;

