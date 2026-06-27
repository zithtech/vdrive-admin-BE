import { Router } from 'express';
import { SupportManagementController } from './supportManagement.controller';
import isAuthenticated from '../../shared/authentication';
import { requirePermission } from '../../shared/authorization';

const router = Router();

// All routes require admin authentication
router.use(isAuthenticated);

/* ======================== FAQs ======================== */
router.get(
  '/faqs',
  requirePermission('support_tickets', 'read'),
  SupportManagementController.getFaqs
);
router.post(
  '/faqs',
  requirePermission('support_tickets', 'create'),
  SupportManagementController.createFaq
);
router.put(
  '/faqs/:id',
  requirePermission('support_tickets', 'update'),
  SupportManagementController.updateFaq
);
router.delete(
  '/faqs/:id',
  requirePermission('support_tickets', 'delete'),
  SupportManagementController.deleteFaq
);

/* ======================== TICKETS ======================== */
router.get(
  '/tickets',
  requirePermission('support_tickets', 'read'),
  SupportManagementController.getTickets
);
router.get(
  '/tickets/stats',
  requirePermission('support_tickets', 'read'),
  SupportManagementController.getTicketStats
);
router.get(
  '/tickets/:id',
  requirePermission('support_tickets', 'read'),
  SupportManagementController.getTicketById
);
router.put(
  '/tickets/:id/status',
  requirePermission('support_tickets', 'update'),
  SupportManagementController.updateTicketStatus
);
router.get(
  '/tickets/:id/messages',
  requirePermission('support_tickets', 'read'),
  SupportManagementController.getTicketMessages
);
router.post(
  '/tickets/:id/messages',
  requirePermission('support_tickets', 'create'),
  SupportManagementController.sendSupportMessage
);

/* ======================== USER TICKETS ======================== */

// User — create support ticket
router.post(
  '/tickets/user',
  requirePermission('support_tickets', 'create'),
  SupportManagementController.createUserTicket
);

// User — get my tickets
router.get(
  '/tickets/user/my-tickets/:userId',
  requirePermission('support_tickets', 'read'),
  SupportManagementController.getUserTickets
);

// Admin — get all user tickets
router.get(
  '/tickets/user/all',
  requirePermission('support_tickets', 'read'),
  SupportManagementController.getAllUserTickets
);

// Get single user ticket
router.get(
  '/tickets/user/:id',
  requirePermission('support_tickets', 'read'),
  SupportManagementController.getUserTicketById
);

// Admin — update user ticket status
router.patch(
  '/tickets/user/:id/status',
  requirePermission('support_tickets', 'update'),
  SupportManagementController.updateUserTicketStatus
);

// Get user ticket messages
router.get(
  '/tickets/user/:id/messages',
  requirePermission('support_tickets', 'read'),
  SupportManagementController.getUserTicketMessages
);

router.post(
  '/tickets/user/:id/messages',
  requirePermission('support_tickets', 'create'),
  SupportManagementController.sendUserSupportMessage
);

export default router;
