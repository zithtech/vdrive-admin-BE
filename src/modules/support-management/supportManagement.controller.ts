import { Request, Response, NextFunction } from 'express';
import { SupportManagementRepository } from './supportManagement.repository';
import axios from 'axios';
import config from '../../config';
import { notifyUserBackend } from '../../services/socket';

export const SupportManagementController = {

  /* ======================== FAQs ======================== */

  async getFaqs(req: Request, res: Response, next: NextFunction) {
    try {
      const faqs = await SupportManagementRepository.findAllFaqs();
      return res.status(200).json({ success: true, data: faqs });
    } catch (error) {
      next(error);
    }
  },

  async createFaq(req: Request, res: Response, next: NextFunction) {
    try {
      const { question, answer, category, sort_order } = req.body;
      const faq = await SupportManagementRepository.insertFaq({ question, answer, category, sort_order });
      return res.status(201).json({ success: true, message: 'FAQ created', data: faq });
    } catch (error) {
      next(error);
    }
  },

  async updateFaq(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const faq = await SupportManagementRepository.updateFaq(id as string, req.body);
      if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });
      return res.status(200).json({ success: true, message: 'FAQ updated', data: faq });
    } catch (error) {
      next(error);
    }
  },

  async deleteFaq(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deleted = await SupportManagementRepository.deleteFaq(id as string);
      if (!deleted) return res.status(404).json({ success: false, message: 'FAQ not found' });
      return res.status(200).json({ success: true, message: 'FAQ deleted' });
    } catch (error) {
      next(error);
    }
  },

  /* ======================== TICKETS ======================== */

  async getTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const status = req.query.status as string | undefined;

      const result = await SupportManagementRepository.findAllTickets(limit, offset, status);
      return res.status(200).json({
        success: true,
        data: {
          tickets: result.tickets,
          pagination: { page, limit, total: result.total },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getTicketById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const ticket = await SupportManagementRepository.findTicketById(id as string);
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
      return res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  },

  async updateTicketStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, admin_notes } = req.body;
      const ticket = await SupportManagementRepository.updateTicketStatus(id as string, status, admin_notes);
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

      // If resolved or closed, notify User Backend to switch driver to AI
      if (status === 'resolved' || status === 'closed') {
        notifyUserBackend('TICKET_RESOLVED', { ticketId: id });
      }

      return res.status(200).json({ success: true, message: 'Ticket updated', data: ticket });
    } catch (error) {
      next(error);
    }
  },

  async getTicketStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await SupportManagementRepository.getTicketStats();
      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  },

  async getTicketMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const messages = await SupportManagementRepository.findMessagesByTicketId(id as string);
      return res.status(200).json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  },

  async sendSupportMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { sender_id, message } = req.body;
      const newMessage = await SupportManagementRepository.saveMessage({
        ticket_id: id as string,
        sender_id,
        sender_type: 'admin',
        message
      });

      // Send Push Notification to Driver via User-Driver-API
      try {
        const fcmToken = await SupportManagementRepository.getDriverFcmTokenByTicketId(id as string);
        if (fcmToken) {
          await axios.post(`${config.userDriverApiUrl}/api/notifications/internal/send`, {
            driverId: (await SupportManagementRepository.findTicketById(id as string))?.driver_id,
            title: 'Support Update',
            body: `Agent replied: "${message.substring(0, 50)}..."`,
            data: { type: 'SUPPORT_REPLY', ticketId: id as string }
          }, {
            headers: {
              'x-api-key': config.internalServiceApiKey,
            }
          });
        }
      } catch (error: any) {
        // Log but don't fail the request
        console.error('Failed to proxy notification to User-Driver-API:', error.message);
      }

      return res.status(201).json({ success: true, data: newMessage });
    } catch (error) {
      next(error);
    }
  },
};
