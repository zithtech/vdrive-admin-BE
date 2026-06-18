// src/modules/pricing-combinations/pricing-combinations.routes.ts
import { Router } from 'express';
import { celebrate } from 'celebrate';
import { PricingCombinationController } from './pricing-combinations.controller';
import { PricingCombinationValidation } from './pricing-combinations.validator';

const router = Router();

router.get('/', PricingCombinationController.getCombinations);

router.post(
  '/create',
  celebrate({ body: PricingCombinationValidation.createCombinationValidation }),
  PricingCombinationController.createCombination
);

router.patch(
  '/update/:id',
  celebrate({ body: PricingCombinationValidation.updateCombinationValidation }),
  PricingCombinationController.updateCombination
);

router.delete('/delete/:id', PricingCombinationController.deleteCombination);

router.post(
  '/bulk-create',
  celebrate({ body: PricingCombinationValidation.saveMatrixValidation }),
  PricingCombinationController.bulkCreateCombinations
);

router.post(
  '/',
  celebrate({ body: PricingCombinationValidation.saveMatrixValidation }),
  PricingCombinationController.saveMatrix
);

router.delete('/', PricingCombinationController.clearMatrix);

export default router;
