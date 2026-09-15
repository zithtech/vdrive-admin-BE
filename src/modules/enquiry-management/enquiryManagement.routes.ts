import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { EnquiryManagementController } from './enquiryManagement.controller';
import { requirePermission } from '../../shared/authorization';

/* ======================== PUBLIC ROUTES ======================== */
// No authentication — called from the landing page contact form.

const publicRouter = Router();

// Strict rate limiter for the public submit endpoint (anti-spam)
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many enquiries submitted. Please try again in 15 minutes.',
  },
});

publicRouter.post(
  '/submit',
  submitLimiter,
  EnquiryManagementController.submitEnquiry
);

/* ======================== ADMIN ROUTES ======================== */
// All require admin authentication (applied in routes/index.ts via isAuthenticated).

const adminRouter = Router();

adminRouter.get(
  '/',
  requirePermission('enquiries', 'read'),
  EnquiryManagementController.getEnquiries
);

adminRouter.get(
  '/stats',
  requirePermission('enquiries', 'read'),
  EnquiryManagementController.getEnquiryStats
);

adminRouter.get(
  '/:id',
  requirePermission('enquiries', 'read'),
  EnquiryManagementController.getEnquiryById
);

adminRouter.patch(
  '/:id/status',
  requirePermission('enquiries', 'update'),
  EnquiryManagementController.updateEnquiryStatus
);

adminRouter.patch(
  '/:id/notes',
  requirePermission('enquiries', 'update'),
  EnquiryManagementController.updateAdminNotes
);

export const enquiryPublicRoutes = publicRouter;
export const enquiryAdminRoutes = adminRouter;
