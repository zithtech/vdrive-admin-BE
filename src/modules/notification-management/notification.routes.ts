import { Router } from 'express';
import isAuthenticated from '../../shared/authentication';
import { NotificationController } from './notification.controller';

const router = Router();

router.use(isAuthenticated);

// Broadcast / Queue Dispatch
router.post('/dispatch', NotificationController.dispatchNotification);

// CRUD operations for notification templates/history
router.get('/', NotificationController.getNotifications);
router.post('/create', NotificationController.createNotificationRecord);
router.patch('/update/:id', NotificationController.updateNotificationRecord);
router.delete('/delete/:id', NotificationController.deleteNotificationRecord);

export default router;
