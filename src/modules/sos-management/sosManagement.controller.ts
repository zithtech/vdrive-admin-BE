import { Request, Response, NextFunction } from 'express';
import { forwardRequest } from '../../shared/forwardRequest';
import config from '../../config';

export const SosManagementController = {
  async getActiveSos(req: Request, res: Response, next: NextFunction) {
    return forwardRequest(req, res, next, config.userDriverApiUrl);
  },

  async resolveSos(req: Request, res: Response, next: NextFunction) {
    // This will forward the resolve request to the User-Driver API (1234)
    return forwardRequest(req, res, next, config.userDriverApiUrl);
  },
};
