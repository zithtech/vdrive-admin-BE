
import { Router } from 'express';
import { TaxController } from './tax.controller';
import { validateBody, validateParams } from '../../utilities/helper';
import { TaxValidation } from './tax.validator';
import { requirePermission } from '../../shared/authorization';

const router = Router();

router.get('/',requirePermission('taxes', 'read'), TaxController.getTaxes);

router.get(
  '/:id',
  requirePermission('taxes', 'read'),
  validateParams(TaxValidation.idValidation),
  TaxController.getTaxById
);

router.post(
  '/create',
  requirePermission('taxes', 'create'),
  validateBody(TaxValidation.createValidation),
  TaxController.createTax
);

router.patch(
  '/update/:id',
  requirePermission('taxes', 'update'),
  validateParams(TaxValidation.idValidation),
  validateBody(TaxValidation.updateValidation),
  TaxController.editTax
);

router.patch(
  '/status/:id',
  requirePermission('taxes', 'update'),
  validateParams(TaxValidation.idValidation),
  validateBody(TaxValidation.statusValidation),
  TaxController.toggleTaxStatus
);

router.delete(
  '/delete/:id',
  requirePermission('taxes', 'delete'),
  validateParams(TaxValidation.idValidation),
  TaxController.deleteTax
);

export default router;
