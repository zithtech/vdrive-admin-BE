import { Router } from 'express';
import { PromoController } from './promo.controller';
import { requirePermission } from '../../shared/authorization';

const router = Router();

router.get('/', requirePermission('promos', 'read'), PromoController.getPromos);
router.get('/:id', requirePermission('promos', 'read'), PromoController.getPromoById);
router.post('/', requirePermission('promos', 'create'), PromoController.createPromo);
router.put('/:id', requirePermission('promos', 'update'), PromoController.updatePromo);
router.patch('/:id/toggle', requirePermission('promos', 'update'), PromoController.toggleStatus);
router.post('/notify/:id', requirePermission('promos', 'update'), PromoController.notifyDrivers);
router.delete('/:id', requirePermission('promos', 'delete'), PromoController.deletePromo);

export default router;
