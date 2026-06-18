import { Request, Response, NextFunction } from 'express';
import { AuthRepository } from '../modules/auth/auth.repository';
import { transformPermissions, NestedPermissions } from '../utilities/permission.helper';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions?: NestedPermissions;
  };
}

/**
 * Express middleware to enforce module-action permission checks.
 * Supports a Super Admin bypass where all checks are automatically approved.
 */
export function requirePermission(module: string, action: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user || !user.id || !user.role) {
        res.status(401).json({
          status: 401,
          statusCode: 401,
          success: false,
          message: 'Unauthorized: User authentication is required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Super Admin Bypass Logic
      if (user.role === 'super_admin') {
        return next();
      }

      // If permissions are not eager-loaded, fetch them from the database
      let permissions = user.permissions;
      if (!permissions) {
        const rawPermissions = await AuthRepository.getUserPermissions(user.id);
        permissions = transformPermissions(rawPermissions);
        user.permissions = permissions; // Attach to user object for request lifespan
      }

      // Validate permission
      const hasPermission = permissions[module]?.[action] === true;

      if (!hasPermission) {
        res.status(403).json({
          status: 403,
          message: `Forbidden: Missing ${module}.${action} permission`,
        });
        return;
      }

      next();
    } catch (error: any) {
      next(error);
    }
  };
}
