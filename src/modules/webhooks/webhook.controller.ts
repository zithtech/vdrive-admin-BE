import { Request, Response, NextFunction } from 'express';
import { getIO } from '../../services/socket';
import { logger } from '../../shared/logger';
import { successResponse } from '../../shared/errorHandler';

export const WebhookController = {
  async handleDriverEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventType, message, data } = req.body;

      if (!eventType) {
        return res.status(400).json({ error: 'eventType is required' });
      }

      logger.info(`Received webhook event: ${eventType}`);

      // Emit event to all connected admin clients
      // We are emitting a generic 'driver_event' with the exact eventType and message payload
      const io = getIO();
      if (io) {
        io.emit('driver_event', { eventType, message, data, timestamp: new Date().toISOString() });
      }

      return successResponse(res, 200, 'Event received and broadcasted successfully');
    } catch (err) {
      logger.error('Error handling webhook driver event:', err);
      next(err);
    }
  },
};
