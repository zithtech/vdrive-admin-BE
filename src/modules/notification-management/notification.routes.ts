import { Router } from 'express';
import isAuthenticated from '../../shared/authentication';
import { NotificationController } from './notification.controller';
import { requirePermission } from '../../shared/authorization';

const router = Router();

router.use(isAuthenticated);

// Broadcast / Queue Dispatch
router.post('/dispatch', requirePermission('notifications', 'create'), NotificationController.dispatchNotification);

// CRUD operations for notification templates/history
router.get('/', requirePermission('notifications', 'read'), NotificationController.getNotifications);
router.post('/create', requirePermission('notifications', 'create'), NotificationController.createNotificationRecord);
router.patch('/update/:id', requirePermission('notifications', 'update'), NotificationController.updateNotificationRecord);
router.delete('/delete/:id', requirePermission('notifications', 'delete'), NotificationController.deleteNotificationRecord);

export default router;
