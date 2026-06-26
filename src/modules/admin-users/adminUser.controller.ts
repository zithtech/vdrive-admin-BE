import { Request, Response, NextFunction } from 'express';
import { AdminUserService } from './adminUser.service';
import { successResponse } from '../../shared/errorHandler';
import { logger } from '../../shared/logger';

export const AdminUserController = {
  async getAdminUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Fetching all admin users');
      const adminUsers = await AdminUserService.getAdminUsers();
      logger.info(`Fetched ${adminUsers.length} admin users`);
      successResponse(res, 200, 'Admin users fetched successfully', adminUsers);
    } catch (error: any) {
      logger.error(`Failed to fetch admin users: ${error.message}`);
      next(error);
    }
  },

  async getAdminUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    try {
      logger.info(`Fetching admin user: ${id}`);
      const adminUser = await AdminUserService.getAdminUserById(id);
      logger.info(`Fetched admin user: ${id}`);
      successResponse(res, 200, 'Admin user fetched successfully', adminUser);
    } catch (error: any) {
      if (error.statusCode === 404) {
        logger.warn(`Admin user not found: ${id}`);
      } else {
        logger.error(`Failed to fetch admin user ${id}: ${error.message}`);
      }
      next(error);
    }
  },

  async createAdminUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email } = req.body;
    try {
      logger.info(`Creating admin user: ${email}`);
      const adminUser = await AdminUserService.createAdminUser(
        req.body,
        (req as any).user?.role
      );
      logger.info(`Admin user created successfully: ${adminUser.id}`);
      successResponse(res, 201, 'Admin user created successfully', adminUser);
    } catch (error: any) {
      if (error.statusCode === 409) {
        logger.warn(`Admin user creation conflict for email ${email}: ${error.message}`);
      } else {
        logger.error(`Failed to create admin user ${email}: ${error.message}`);
      }
      next(error);
    }
  },

  async updateAdminUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    try {
      logger.info(`Updating admin user: ${id}`);
      const adminUser = await AdminUserService.updateAdminUser(
        id,
        req.body,
        (req as any).user?.role
      );
      logger.info(`Admin user updated successfully: ${id}`);
      successResponse(res, 200, 'Admin user updated successfully', adminUser);
    } catch (error: any) {
      if (error.statusCode === 404) {
        logger.warn(`Admin user not found for update: ${id}`);
      } else if (error.statusCode === 409) {
        logger.warn(`Admin user update conflict for ${id}: ${error.message}`);
      } else {
        logger.error(`Failed to update admin user ${id}: ${error.message}`);
      }
      next(error);
    }
  },

  async deleteAdminUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    try {
      logger.info(`Deleting admin user: ${id}`);
      await AdminUserService.deleteAdminUser(id);
      logger.info(`Admin user deleted successfully: ${id}`);
      successResponse(res, 200, 'Admin user deleted successfully');
    } catch (error: any) {
      if (error.statusCode === 404) {
        logger.warn(`Admin user not found for deletion: ${id}`);
      } else {
        logger.error(`Failed to delete admin user ${id}: ${error.message}`);
      }
      next(error);
    }
  },
};
