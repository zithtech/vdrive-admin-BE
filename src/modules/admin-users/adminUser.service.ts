import { AdminUserRepository } from './adminUser.repository';
import { RolesRepository } from '../roles/roles.repository';
import { PublicAdminUser } from './adminUser.model';
import * as bcrypt from 'bcrypt';

/**
 * The admin_users.role column is constrained to 'admin' | 'super_admin' and serves
 * only as the coarse super-admin bypass flag. The actual (possibly custom) role
 * lives in role_id, which is authoritative. Given whatever the client sent
 * (a role name and/or a role_id), resolve the canonical role row and derive the
 * coarse flag from it — this is what lets custom roles (ops_manager, user, ...) be
 * assigned without violating the CHECK constraint.
 */
async function resolveRole(input: {
  role?: string;
  role_id?: string | null;
}): Promise<{ role: string; role_id: string }> {
  let roleRow: { id: string; name: string } | null = null;

  if (input.role_id) {
    roleRow = await RolesRepository.findById(input.role_id);
    if (!roleRow) {
      throw { statusCode: 400, message: 'Invalid role_id: role does not exist' };
    }
  } else if (input.role) {
    roleRow = await RolesRepository.findByName(input.role);
    if (!roleRow) {
      throw { statusCode: 400, message: `Unknown role: ${input.role}` };
    }
  } else {
    roleRow = await RolesRepository.findByName('admin');
    if (!roleRow) {
      throw { statusCode: 500, message: 'Default "admin" role is not configured' };
    }
  }

  return {
    role: roleRow.name === 'super_admin' ? 'super_admin' : 'admin',
    role_id: roleRow.id,
  };
}

export const AdminUserService = {
  async getAdminUsers(): Promise<PublicAdminUser[]> {
    return AdminUserRepository.findAll();
  },

  async getAdminUserById(id: string): Promise<PublicAdminUser> {
    const adminUser = await AdminUserRepository.findById(id);
    if (!adminUser) {
      throw { statusCode: 404, message: 'Admin user not found' };
    }
    return adminUser;
  },

  async createAdminUser(data: {
    name: string;
    email: string;
    password: string;
    contact?: string;
    role?: string;
    role_id?: string;
  }): Promise<PublicAdminUser> {
    const existing = await AdminUserRepository.findByEmail(data.email);
    if (existing) {
      throw { statusCode: 409, message: 'Email already in use' };
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const { role, role_id } = await resolveRole({ role: data.role, role_id: data.role_id });
    return AdminUserRepository.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      contact: data.contact || null,
      role,
      role_id,
    });
  },

  async updateAdminUser(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      contact: string;
      role: string;
      role_id: string | null;
    }>
  ): Promise<PublicAdminUser> {
    const existing = await AdminUserRepository.findById(id);
    if (!existing) {
      throw { statusCode: 404, message: 'Admin user not found' };
    }
    if (data.email && data.email !== existing.email) {
      const emailTaken = await AdminUserRepository.findByEmail(data.email);
      if (emailTaken) {
        throw { statusCode: 409, message: 'Email already in use' };
      }
    }
    // If the role is being changed, resolve it to keep the coarse `role` flag and
    // authoritative `role_id` in sync (and satisfy the role CHECK constraint).
    const patch = { ...data };
    if (data.role !== undefined || data.role_id !== undefined) {
      const resolved = await resolveRole({ role: data.role, role_id: data.role_id ?? undefined });
      patch.role = resolved.role;
      patch.role_id = resolved.role_id;
    }
    const updated = await AdminUserRepository.update(id, patch);
    if (!updated) {
      throw { statusCode: 404, message: 'Admin user not found' };
    }
    return updated;
  },

  async deleteAdminUser(id: string): Promise<void> {
    const deleted = await AdminUserRepository.softDelete(id);
    if (!deleted) {
      throw { statusCode: 404, message: 'Admin user not found' };
    }
  },
};
