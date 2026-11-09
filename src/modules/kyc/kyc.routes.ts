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

export default router;
