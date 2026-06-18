import { Router } from 'express';
import { AdminUserController } from './adminUser.controller';
import { AdminUserValidation } from './adminUser.validator';
import { validateBody, validateParams } from '../../utilities/helper';
import { requireRole } from '../../shared/rbac';
import { requirePermission } from '../../shared/authorization';

const router = Router();

router.get('/',requirePermission('admins','read'), AdminUserController.getAdminUsers);

router.get(
  '/:id',
  requirePermission('admins','read'),
  validateParams(AdminUserValidation.idValidation),
  AdminUserController.getAdminUserById
);

router.post(
  '/',
  requirePermission('admins','create'),
  requireRole('super_admin'),
  validateBody(AdminUserValidation.createAdminUserValidation),
  AdminUserController.createAdminUser
);

router.put(
  '/:id',
  requirePermission('admins','update'),
  requireRole('super_admin'),
  validateParams(AdminUserValidation.idValidation),
  validateBody(AdminUserValidation.updateAdminUserValidation),
  AdminUserController.updateAdminUser
);

router.delete(
  '/:id',
  requirePermission('admins','delete'),
  requireRole('super_admin'),
  validateParams(AdminUserValidation.idValidation),
  AdminUserController.deleteAdminUser
);

export default router;
