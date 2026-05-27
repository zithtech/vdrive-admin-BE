import { Router } from 'express';
import { RolesController } from './roles.controller';

const router = Router();

router.get('/', RolesController.getAllRoles);
router.post('/', RolesController.createRole);
router.get('/:roleId/permissions', RolesController.getRolePermissions);
router.put('/:roleId/permissions', RolesController.updateRolePermissions);
router.patch('/:roleId/type', RolesController.updateRoleType);

export default router;

