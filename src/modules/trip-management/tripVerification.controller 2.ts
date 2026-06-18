import { Request, Response, NextFunction } from 'express';
import { forwardRequest } from '../../shared/forwardRequest';
import config from '../../config';
import { logger } from '../../shared/logger';

/**
 * Trip Verification Controller for Admin Backend
 * Proxies verification requests to the User-Driver-API
 * and handles admin-specific logic
 */
export const TripVerificationController = {
  /**
   * Get all pending trip verifications
   */
  async getPendingVerifications(req: Request, res: Response, next: NextFunction) {
    return forwardRequest(
      req,
      res,
      next,
      config.userDriverApiUrl,
      '/api/drivers/trip-verification/pending'
    );
  },

  /**
   * Get verification details by ID (includes comparison with profile selfie)
   */
  async getVerificationDetails(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    return forwardRequest(
      req,
      res,
      next,
      config.userDriverApiUrl,
      `/api/drivers/trip-verification/details/${id}`
    );
  },

  /**
   * Get comparison data for a driver (trip selfie vs profile selfie)
   */
  async getComparisonData(req: Request, res: Response, next: NextFunction) {
    const { driverId } = req.params;
    return forwardRequest(
      req,
      res,
      next,
      config.userDriverApiUrl,
      `/api/drivers/trip-verification/comparison/${driverId}`
    );
  },

  /**
   * Granular approve/reject — allows admin to approve/reject selfie and car image independently
   */
  async verifyGranular(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      // Inject admin_id from authenticated user
      req.body.admin_id = (req as any).user?.id;

      return forwardRequest(
        req,
        res,
        next,
        config.userDriverApiUrl,
        `/api/drivers/trip-verification/verify-granular/${id}`
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Simple approve/reject (legacy)
   */
  async verifySimple(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    return forwardRequest(
      req,
      res,
      next,
      config.userDriverApiUrl,
      `/api/drivers/trip-verification/verify/${id}`
    );
  },

  /**
   * Get verification by trip ID
   */
  async getByTripId(req: Request, res: Response, next: NextFunction) {
    const { tripId } = req.params;
    return forwardRequest(
      req,
      res,
      next,
      config.userDriverApiUrl,
      `/api/drivers/trip-verification/trip/${tripId}`
    );
  },
};
