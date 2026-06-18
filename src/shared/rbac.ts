import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export const requireRole =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        statusCode: 403,
        success: false,
        message: 'Forbidden: insufficient permissions',
        error: { code: 'ACCESS_DENIED' },
      });
      return;
    }
    next();
  };
