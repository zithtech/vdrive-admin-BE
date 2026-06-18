import { AdminUserRepository } from './adminUser.repository';
import { PublicAdminUser } from './adminUser.model';
import * as bcrypt from 'bcrypt';

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
    return AdminUserRepository.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      contact: data.contact || null,
      role: data.role ?? 'admin',
      role_id: data.role_id,
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
    const updated = await AdminUserRepository.update(id, data);
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
