import { NextFunction, Request, Response } from 'express';
import { forwardRequest } from '../../shared/forwardRequest';
import config from '../../config';

export const NotificationController = {
  async dispatchNotification(req: Request, res: Response, next: NextFunction) {
    return forwardRequest(req, res, next, config.userDriverApiUrl);
  },

  async getNotifications(req: Request, res: Response, next: NextFunction) {
    return forwardRequest(req, res, next, config.userDriverApiUrl);
  },

  async createNotificationRecord(req: Request, res: Response, next: NextFunction) {
    return forwardRequest(req, res, next, config.userDriverApiUrl);
  },

  async updateNotificationRecord(req: Request, res: Response, next: NextFunction) {
    return forwardRequest(req, res, next, config.userDriverApiUrl);
  },

  async deleteNotificationRecord(req: Request, res: Response, next: NextFunction) {
    return forwardRequest(req, res, next, config.userDriverApiUrl);
  },
};
