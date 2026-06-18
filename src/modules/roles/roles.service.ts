import { RolesRepository } from './roles.repository';
import { VDRIVE_MODULES } from '../../config/permissions';

const SYSTEM_MODULES = Object.keys(VDRIVE_MODULES);

export const RolesService = {
  async getAllRoles() {
    const roles = await RolesRepository.getAllRoles();
    return roles.map((role) => ({
      ...role,
      is_system: role.role_type === 'system',
    }));
  },

  async getRolePermissions(roleId: string) {
    const rawPerms = await RolesRepository.getRolePermissions(roleId);

    // Initialize full permissions matrix with false based on dynamic config
    const permissions: Record<string, Record<string, boolean>> = {};
    for (const [modKey, modVal] of Object.entries(VDRIVE_MODULES) as [string, any][]) {
      permissions[modKey] = {};
      for (const permStr of modVal.permissions) {
        const action = permStr.split('.')[1];
        permissions[modKey][action] = false;
      }
    }

    // Populate with true for active permission associations
    for (const perm of rawPerms) {
      if (permissions[perm.module] && perm.action in permissions[perm.module]) {
        permissions[perm.module][perm.action] = true;
      }
    }

    return { permissions };
  },

  async updateRolePermissions(
    roleId: string,
    permissions: Array<{ module: string; actions: string[] }>
  ) {
    await RolesRepository.updateRolePermissions(roleId, permissions);
  },

  async createRole(name: string, description?: string, roleType?: string) {
    const newRole = await RolesRepository.createRole(name, description, roleType);
    return {
      ...newRole,
      is_system: newRole.role_type === 'system',
    };
  },

  async updateRoleType(roleId: string, roleType: string) {
    await RolesRepository.updateRoleType(roleId, roleType);
  },
};
