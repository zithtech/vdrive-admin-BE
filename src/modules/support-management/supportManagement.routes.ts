import { Router } from 'express';
import { SupportManagementController } from './supportManagement.controller';
import isAuthenticated from '../../shared/authentication';

const router = Router();

// All routes require admin authentication
router.use(isAuthenticated);

/* ======================== FAQs ======================== */
router.get('/faqs', SupportManagementController.getFaqs);
router.post('/faqs', SupportManagementController.createFaq);
router.put('/faqs/:id', SupportManagementController.updateFaq);
router.delete('/faqs/:id', SupportManagementController.deleteFaq);

/* ======================== TICKETS ======================== */
router.get('/tickets', SupportManagementController.getTickets);
router.get('/tickets/stats', SupportManagementController.getTicketStats);
router.get('/tickets/:id', SupportManagementController.getTicketById);
router.put('/tickets/:id/status', SupportManagementController.updateTicketStatus);
router.get('/tickets/:id/messages', SupportManagementController.getTicketMessages);
router.post('/tickets/:id/messages', SupportManagementController.sendSupportMessage);

export default router;
