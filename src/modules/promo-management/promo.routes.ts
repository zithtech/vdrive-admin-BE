import { Router } from 'express';
import { PromoController } from './promo.controller';

const router = Router();

router.get('/', PromoController.getPromos);
router.get('/:id', PromoController.getPromoById);
router.post('/', PromoController.createPromo);
router.put('/:id', PromoController.updatePromo);
router.patch('/:id/toggle', PromoController.toggleStatus);
router.post('/notify/:id', PromoController.notifyDrivers);
router.delete('/:id', PromoController.deletePromo);

export default router;
