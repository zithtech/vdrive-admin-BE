import { Request, Response, NextFunction } from 'express';
import { RolesService } from './roles.service';
import { successResponse } from '../../shared/errorHandler';

export const RolesController = {
  async getAllRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await RolesService.getAllRoles();
      successResponse(res, 200, 'Roles retrieved successfully', roles);
    } catch (error) {
      next(error);
    }
  },

  async getRolePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roleId } = req.params;
      const data = await RolesService.getRolePermissions(roleId);
      successResponse(res, 200, 'Role permissions retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  },

  async updateRolePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roleId } = req.params;
      const { permissions } = req.body;
      await RolesService.updateRolePermissions(roleId, permissions);
      successResponse(res, 200, 'Role permissions updated successfully');
    } catch (error) {
      next(error);
    }
  },

  async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description } = req.body;
      const role = await RolesService.createRole(name, description);
      successResponse(res, 201, 'Role created successfully', role);
    } catch (error) {
      next(error);
    }
  },

  async updateRoleType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roleId } = req.params;
      const { roleType } = req.body;
      await RolesService.updateRoleType(roleId, roleType);
      successResponse(res, 200, 'Role type updated successfully');
    } catch (error) {
      next(error);
    }
  },
};
