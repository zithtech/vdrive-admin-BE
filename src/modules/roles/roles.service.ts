import { RolesRepository } from './roles.repository';

export const RolesService = {
  async getAllRoles() {
    const roles = await RolesRepository.getAllRoles();
    return roles.map((role) => ({
      ...role,
      is_system: role.role_type === 'system',
    }));
  },

  // Returns the full permission catalog grouped by module — the single source of
  // truth the Role Matrix UI renders its grid from.
  async getPermissionCatalog(): Promise<Array<{ module: string; actions: string[] }>> {
    const rows = await RolesRepository.getPermissionCatalog();
    const byModule: Record<string, string[]> = {};
    for (const { module, action } of rows) {
      (byModule[module] ??= []).push(action);
    }
    return Object.entries(byModule).map(([module, actions]) => ({ module, actions }));
  },

  async getRolePermissions(roleId: string) {
    // Scaffold the matrix from the DB catalog (not a static config) so no granted
    // permission is ever dropped just because a module isn't in some hardcoded list.
    const [catalog, rawPerms] = await Promise.all([
      RolesRepository.getPermissionCatalog(),
      RolesRepository.getRolePermissions(roleId),
    ]);

    const permissions: Record<string, Record<string, boolean>> = {};
    for (const { module, action } of catalog) {
      (permissions[module] ??= {})[action] = false;
    }

    for (const { module, action } of rawPerms) {
      if (permissions[module]) {
        permissions[module][action] = true;
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
