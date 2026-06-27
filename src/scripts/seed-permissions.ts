import dotenv from 'dotenv';
import { connectDatabase, query, pool } from '../shared/database';

// Load environment variables
dotenv.config();

async function syncPermissionsToDatabase() {
  // The backend config/permissions.ts is the canonical catalog (single source of
  // truth). It is NOT copied from the frontend — both are seeded from here.
  const {
    VDRIVE_MODULES,
    VDriveSystemRoles,
    DEFAULT_ROLE_PERMISSIONS,
  } = require('../config/permissions');

  console.log('\n🚀 Starting Permission System Database Synchronization...');

  try {
    await connectDatabase();

    // Begin transaction
    await query('BEGIN');

    // 1. Sync Permissions
    console.log('🔄 Syncing permissions...');
    const dbPermissionsToSync: Array<{ module: string; action: string; description: string }> = [];

    for (const [moduleKey, moduleVal] of Object.entries(VDRIVE_MODULES) as [string, any][]) {
      for (const permStr of moduleVal.permissions) {
        const action = permStr.split('.')[1];
        dbPermissionsToSync.push({
          module: moduleKey,
          action: action,
          description: `Granular ${action} access for ${moduleVal.label} module`,
        });
      }
    }

    for (const perm of dbPermissionsToSync) {
      await query(
        `INSERT INTO permissions (module, action, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (module, action) DO UPDATE 
         SET description = EXCLUDED.description
         RETURNING id`,
        [perm.module, perm.action, perm.description]
      );
    }
    console.log(`✅ Synced ${dbPermissionsToSync.length} permissions.`);

    // 2. Sync System Roles
    console.log('🔄 Syncing system roles...');
    const roleMap: Record<string, string> = {};
    for (const roleName of Object.values(VDriveSystemRoles) as string[]) {
      // Upsert role
      const res = await query(
        `INSERT INTO roles (name, description, role_type)
         VALUES ($1, $2, 'system')
         ON CONFLICT (name) DO UPDATE 
         SET role_type = 'system', updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [roleName, `Default system role for ${roleName.replace('_', ' ')}`]
      );
      const roleId = res.rows[0]?.id;
      if (roleId) {
        roleMap[roleName] = roleId;
      } else {
        // Retrieve if not returned (should be returned on insert/update)
        const fetchRes = await query('SELECT id FROM roles WHERE name = $1', [roleName]);
        roleMap[roleName] = fetchRes.rows[0].id;
      }
    }
    console.log(`✅ Synced default system roles: ${Object.keys(roleMap).join(', ')}`);

    // Helper to map a permission string (e.g. 'customer.create') to DB module/action
    const mapPermissionToDb = (permStr: string) => {
      for (const [moduleKey, moduleVal] of Object.entries(VDRIVE_MODULES) as [string, any][]) {
        if (moduleVal.permissions.includes(permStr)) {
          const action = permStr.split('.')[1];
          return { module: moduleKey, action };
        }
      }
      return null;
    };

    // 3. Sync Role-Permission Mappings
    console.log('🔄 Syncing role-permission mappings...');

    // Fetch all permission records to map (module, action) -> ID
    const allPermsRes = await query('SELECT id, module, action FROM permissions');
    const dbPermMap: Record<string, string> = {};
    for (const row of allPermsRes.rows) {
      dbPermMap[`${row.module}:${row.action}`] = row.id;
    }

    for (const [roleName, permissionsList] of Object.entries(DEFAULT_ROLE_PERMISSIONS) as [
      string,
      string[],
    ][]) {
      const roleId = roleMap[roleName];
      if (!roleId) continue;

      const targetPermissionIds: string[] = [];

      for (const permStr of permissionsList) {
        const dbMapping = mapPermissionToDb(permStr);
        if (dbMapping) {
          const key = `${dbMapping.module}:${dbMapping.action}`;
          const permissionId = dbPermMap[key];
          if (permissionId) {
            targetPermissionIds.push(permissionId);
          }
        }
      }

      if (targetPermissionIds.length > 0) {
        // Insert target mappings
        for (const permissionId of targetPermissionIds) {
          await query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
            [roleId, permissionId]
          );
        }

        // Delete mappings that are no longer assigned for this role
        const placeholders = targetPermissionIds.map((_, i) => `$${i + 2}`).join(', ');
        await query(
          `DELETE FROM role_permissions
           WHERE role_id = $1
           AND permission_id NOT IN (${placeholders})`,
          [roleId, ...targetPermissionIds]
        );
      } else {
        // Delete all mappings if role has no permissions
        await query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
      }

      console.log(`👉 Configured ${targetPermissionIds.length} permissions for role '${roleName}'`);
    }

    await query('COMMIT');
    console.log('\n🎉 Database permission system synchronization completed successfully!');
  } catch (error) {
    await query('ROLLBACK');
    console.error('\n❌ Transaction failed. Rollback executed.', error);
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 Disconnected from PostgreSQL.');
    }
  }
}

// Execute sync
syncPermissionsToDatabase();
