import { Router } from 'express';
import { UserManagementController } from './userManagement.controller';
import isAuthenticated from '../../shared/authentication';
import { requirePermission } from '../../shared/authorization';

const router = Router();

// Apply admin authentication to all routes
router.use(isAuthenticated);

router.get('/', requirePermission('customers', 'read'), UserManagementController.getUsers);

router.get('/:id', requirePermission('customers', 'read'), UserManagementController.getUserById);

router.post('/', requirePermission('customers', 'create'), UserManagementController.createUser);

router.patch('/:id', requirePermission('customers', 'update'), UserManagementController.updateUser);

router.patch(
  '/block/:id',
  requirePermission('customers', 'update'),
  UserManagementController.blockUser
);

router.patch(
  '/unblock/:id',
  requirePermission('customers', 'update'),
  UserManagementController.unblockUser
);

router.patch(
  '/disable/:id',
  requirePermission('customers', 'update'),
  UserManagementController.disableUser
);

router.patch(
  '/enable/:id',
  requirePermission('customers', 'update'),
  UserManagementController.enableUser
);

router.patch(
  '/suspend/:id',
  requirePermission('customers', 'update'),
  UserManagementController.suspendUser
);

router.patch(
  '/unsuspend/:id',
  requirePermission('customers', 'update'),
  UserManagementController.unsuspendUser
);

router.get('/search', requirePermission('customers', 'read'), UserManagementController.searchUsers);

router.delete(
  '/:id',
  requirePermission('customers', 'delete'),
  UserManagementController.deleteUser
);

export default router;
