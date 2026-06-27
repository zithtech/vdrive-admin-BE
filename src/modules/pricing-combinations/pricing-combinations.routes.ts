// src/modules/pricing-combinations/pricing-combinations.routes.ts
import { Router } from 'express';
import { celebrate } from 'celebrate';
import { PricingCombinationController } from './pricing-combinations.controller';
import { PricingCombinationValidation } from './pricing-combinations.validator';
import { requirePermission } from '../../shared/authorization';

const router = Router();

router.get('/', requirePermission('pricing', 'read'), PricingCombinationController.getCombinations);

router.post(
  '/create',
  requirePermission('pricing', 'create'),
  celebrate({ body: PricingCombinationValidation.createCombinationValidation }),
  PricingCombinationController.createCombination
);

router.patch(
  '/update/:id',
  requirePermission('pricing', 'update'),
  celebrate({ body: PricingCombinationValidation.updateCombinationValidation }),
  PricingCombinationController.updateCombination
);

router.delete(
  '/delete/:id',
  requirePermission('pricing', 'delete'),
  PricingCombinationController.deleteCombination
);

router.post(
  '/bulk-create',
  requirePermission('pricing', 'create'),
  celebrate({ body: PricingCombinationValidation.saveMatrixValidation }),
  PricingCombinationController.bulkCreateCombinations
);

router.post(
  '/',
  requirePermission('pricing', 'create'),
  celebrate({ body: PricingCombinationValidation.saveMatrixValidation }),
  PricingCombinationController.saveMatrix
);

router.delete('/', requirePermission('pricing', 'delete'), PricingCombinationController.clearMatrix);

export default router;
