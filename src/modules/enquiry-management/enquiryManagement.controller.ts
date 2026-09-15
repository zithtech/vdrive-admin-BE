import { Request, Response, NextFunction } from 'express';
import { EnquiryManagementRepository } from './enquiryManagement.repository';
import { sendToSocket } from '../../services/socket';

const VALID_STATUSES = ['new', 'read', 'replied', 'closed'];

/** Strip HTML tags to prevent stored XSS */
const sanitize = (str: string): string =>
  str.replace(/[<>]/g, '').replace(/javascript:/gi, '').trim();

export const EnquiryManagementController = {
  /* ======================== PUBLIC: Submit Enquiry ======================== */

  async submitEnquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, service } = req.body;

      // Validation
      const errors: string[] = [];
      if (!name || name.trim().length < 2) {
        errors.push('Name must be at least 2 characters.');
      }
      if (name && name.length > 255) {
        errors.push('Name is too long.');
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
        errors.push('Please provide a valid email address.');
      }
      if (email && email.length > 320) {
        errors.push('Email is too long.');
      }
      const digits = (phone || '').replace(/\D/g, '');
      if (digits.length < 7) {
        errors.push('Please provide a valid phone number.');
      }
      if (phone && phone.length > 30) {
        errors.push('Phone number is too long.');
      }
      if (!service || service.trim().length < 10) {
        errors.push('Service description must be at least 10 characters.');
      }
      if (service && service.length > 2000) {
        errors.push('Service description is too long (max 2000 characters).');
      }

      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: errors.join(' ') });
      }

      const enquiry = await EnquiryManagementRepository.insertEnquiry({
        name: sanitize(name),
        email: email.trim().toLowerCase(),
        phone: sanitize(phone),
        service: sanitize(service),
      });

      // Notify admin panel via socket (real-time)
      try {
        sendToSocket('admin', 'NEW_ENQUIRY', enquiry);
      } catch {
        // Socket failure should not break the submission
      }

      return res.status(201).json({
        success: true,
        message: 'Enquiry submitted successfully',
        data: { id: enquiry.id },
      });
    } catch (error) {
      next(error);
    }
  },

  /* ======================== ADMIN: List Enquiries ======================== */

  async getEnquiries(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, search, startDate, endDate, page, limit } = req.query;

      const result = await EnquiryManagementRepository.findAllEnquiries({
        status: status as string,
        search: search as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      return res.status(200).json({
        success: true,
        data: result.enquiries,
        pagination: {
          total: result.total,
          page: page ? parseInt(page as string, 10) : 1,
          limit: limit ? parseInt(limit as string, 10) : 20,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /* ======================== ADMIN: Get Stats ======================== */

  async getEnquiryStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await EnquiryManagementRepository.getStats();
      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  },

  /* ======================== ADMIN: Get Enquiry By ID ======================== */

  async getEnquiryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const enquiry = await EnquiryManagementRepository.findById(id);
      if (!enquiry) {
        return res.status(404).json({ success: false, message: 'Enquiry not found' });
      }
      return res.status(200).json({ success: true, data: enquiry });
    } catch (error) {
      next(error);
    }
  },

  /* ======================== ADMIN: Update Status ======================== */

  async updateEnquiryStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }

      const enquiry = await EnquiryManagementRepository.updateStatus(id, status);
      if (!enquiry) {
        return res.status(404).json({ success: false, message: 'Enquiry not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Status updated',
        data: enquiry,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ======================== ADMIN: Update Admin Notes ======================== */

  async updateAdminNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { admin_notes } = req.body;

      if (admin_notes === undefined) {
        return res.status(400).json({
          success: false,
          message: 'admin_notes field is required',
        });
      }

      const enquiry = await EnquiryManagementRepository.updateAdminNotes(id, admin_notes);
      if (!enquiry) {
        return res.status(404).json({ success: false, message: 'Enquiry not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Notes updated',
        data: enquiry,
      });
    } catch (error) {
      next(error);
    }
  },
};
