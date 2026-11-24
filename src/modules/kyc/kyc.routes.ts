import { Router, Request, Response, NextFunction } from 'express';
import isAuthenticated from '../../shared/authentication';
import { forwardRequest } from '../../shared/forwardRequest';
import config from '../../config';

const router = Router();

// Apply admin authentication to all KYC routes
router.use(isAuthenticated);

/**
 * Driver / Admin: Request Video KYC session for a driver
 */
router.post('/request/:driverId', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Get active Video KYC Queue
 */
router.get('/queue', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Accept Video KYC Request and initiate Agora call
 */
router.post('/accept/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Cancel Video KYC session
 */
router.post('/cancel/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Send real-time prompt instruction to driver during call
 */
router.post('/prompt/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Submit final verification verdict (Approve / Reject)
 */
router.post('/verdict/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Get KYC Status for a driver
 */
router.get('/status/:driverId', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Get Agora call token for a session
 */
router.get('/token/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Driver / Admin: Retry Video KYC (Attempt 2)
 */
router.post('/retry/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Driver / Admin: 4-min timeout transition to scheduling
 */
router.post('/timeout-to-schedule/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Admin: Schedule Video KYC appointment for driver
 */
router.post('/schedule-appointment', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Driver / Admin: Get scheduled appointment for driver
 */
router.get('/appointment/:driverId', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Admin: Get Video KYC call history
 */
router.get('/history', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Admin: Get available working time slots
 */
router.get('/slots', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Admin: Add custom working time slot
 */
router.post('/slots', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

/**
 * Admin: Delete working time slot
 */
router.delete('/slots/:slotId', (req: Request, res: Response, next: NextFunction) => {
  return forwardRequest(req, res, next, config.userDriverApiUrl);
});

export default router;
