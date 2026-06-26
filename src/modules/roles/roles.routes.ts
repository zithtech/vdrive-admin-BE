import { Router } from 'express';
import { RolesController } from './roles.controller';
import { requirePermission } from '../../shared/authorization';

const router = Router();

// RBAC management is gated by the granular `roles` permission (super_admin bypasses):
// viewing the roles/matrix needs roles.read; creating or modifying a role needs
// roles.create / roles.update. This replaces the old blanket super_admin lock so
// read access can be delegated — while still closing the escalation hole (a plain
// admin without roles.* permissions still can't touch RBAC).
router.get('/', requirePermission('roles', 'read'), RolesController.getAllRoles);
router.get('/catalog', requirePermission('roles', 'read'), RolesController.getPermissionCatalog);
router.post('/', requirePermission('roles', 'create'), RolesController.createRole);
router.get(
  '/:roleId/permissions',
  requirePermission('roles', 'read'),
  RolesController.getRolePermissions
);
router.put(
  '/:roleId/permissions',
  requirePermission('roles', 'update'),
  RolesController.updateRolePermissions
);
router.patch('/:roleId/type', requirePermission('roles', 'update'), RolesController.updateRoleType);

export default router;
