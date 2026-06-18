import { query } from '../../shared/database';
import { AdminUser, PublicAdminUser } from './adminUser.model';

const SAFE_COLUMNS =
  'id, name, email, contact, role, role_id, created_at, updated_at, deleted_at, is_deleted';

export const AdminUserRepository = {
  async findAll(): Promise<PublicAdminUser[]> {
    const result = await query(
      `SELECT ${SAFE_COLUMNS} FROM admin_users WHERE is_deleted = false ORDER BY created_at DESC`
    );
    return result.rows;
  },

  async findById(id: string): Promise<PublicAdminUser | null> {
    const result = await query(
      `SELECT ${SAFE_COLUMNS} FROM admin_users WHERE id = $1 AND is_deleted = false`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findByEmail(email: string): Promise<PublicAdminUser | null> {
    const result = await query(
      `SELECT ${SAFE_COLUMNS} FROM admin_users WHERE email = $1 AND is_deleted = false`,
      [email]
    );
    return result.rows[0] || null;
  },

  async create(data: {
    name: string;
    password: string;
    email: string;
    contact: string | null;
    role: string;
    role_id?: string | null;
  }): Promise<PublicAdminUser> {
    const result = await query(
      `INSERT INTO admin_users (name, password, email, contact, role, role_id, is_deleted)
       VALUES ($1, $2, $3, $4, $5, $6, false)
       RETURNING ${SAFE_COLUMNS}`,
      [data.name, data.password, data.email, data.contact, data.role, data.role_id || null]
    );
    return result.rows[0];
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      contact: string | null;
      role: string;
      role_id: string | null;
    }>
  ): Promise<PublicAdminUser | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${index++}`);
      values.push(data.email);
    }
    if (data.contact !== undefined) {
      fields.push(`contact = $${index++}`);
      values.push(data.contact);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${index++}`);
      values.push(data.role);
    }
    if (data.role_id !== undefined) {
      fields.push(`role_id = $${index++}`);
      values.push(data.role_id);
    }

    if (fields.length === 0) {
      return null;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE admin_users SET ${fields.join(', ')} WHERE id = $${index} AND is_deleted = false RETURNING ${SAFE_COLUMNS}`,
      values
    );
    return result.rows[0] || null;
  },

  async softDelete(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE admin_users SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND is_deleted = false',
      [id]
    );
    return (result.rowCount || 0) > 0;
  },
};
