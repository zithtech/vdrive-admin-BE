import { Router } from 'express';
import { RolesController } from './roles.controller';
import { requireRole } from '../../shared/rbac';

const router = Router();

// RBAC management is super-admin only. These routes are already behind the global
// isAuthenticated guard; without this, ANY authenticated admin could rewrite role
// permissions (including their own) — a privilege-escalation hole.
router.use(requireRole('super_admin'));

router.get('/', RolesController.getAllRoles);
router.post('/', RolesController.createRole);
router.get('/:roleId/permissions', RolesController.getRolePermissions);
router.put('/:roleId/permissions', RolesController.updateRolePermissions);
router.patch('/:roleId/type', RolesController.updateRoleType);

export default router;
