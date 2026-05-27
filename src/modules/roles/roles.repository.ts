import { query } from '../../shared/database';

export const RolesRepository = {
  async getAllRoles() {
    const result = await query('SELECT id, name, description, role_type FROM roles ORDER BY name ASC');
    return result.rows;
  },

  async getRolePermissions(roleId: string) {
    const sql = `
      SELECT p.module, p.action
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = $1
    `;
    const result = await query(sql, [roleId]);
    return result.rows;
  },

  async updateRolePermissions(roleId: string, permissions: Array<{ module: string, actions: string[] }>) {
    // Get all system permissions to map module:action to permission ID
    const allPermsResult = await query('SELECT id, module, action FROM permissions');
    const permMap: Record<string, string> = {};
    for (const row of allPermsResult.rows) {
      permMap[`${row.module}:${row.action}`] = row.id;
    }

    // Clear old mappings
    await query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

    // Insert new mappings
    for (const perm of permissions) {
      const module = perm.module;
      for (const action of perm.actions) {
        const permId = permMap[`${module}:${action}`];
        if (permId) {
          await query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [roleId, permId]
          );
        }
      }
    }
  },

  async createRole(name: string, description?: string, roleType: string = 'customizable') {
    const result = await query(
      'INSERT INTO roles (name, description, role_type) VALUES ($1, $2, $3) RETURNING id, name, description, role_type',
      [name, description || null, roleType]
    );
    return result.rows[0];
  },

  async updateRoleType(roleId: string, roleType: string) {
    await query(
      'UPDATE roles SET role_type = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [roleId, roleType]
    );
  }
};

