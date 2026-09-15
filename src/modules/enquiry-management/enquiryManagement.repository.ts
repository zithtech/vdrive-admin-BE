import { query } from '../../shared/database';

export const EnquiryManagementRepository = {
  /* ======================== INSERT ======================== */

  async insertEnquiry(data: {
    name: string;
    email: string;
    phone: string;
    service: string;
  }): Promise<any> {
    const sql = `
      INSERT INTO enquiries (name, email, phone, service)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await query(sql, [
      data.name.trim(),
      data.email.trim().toLowerCase(),
      data.phone.trim(),
      data.service.trim(),
    ]);
    return result.rows[0];
  },

  /* ======================== LIST ======================== */

  async findAllEnquiries(filters: {
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ enquiries: any[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters.status && filters.status !== 'all') {
      conditions.push(`status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.search) {
      conditions.push(
        `(name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx})`
      );
      values.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${idx++}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${idx++}`);
      values.push(filters.endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    // Count query
    const countSql = `SELECT COUNT(*) FROM enquiries ${where}`;
    const countResult = await query(countSql, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const dataSql = `
      SELECT id, name, email, phone, service, status, admin_notes, created_at, updated_at
      FROM enquiries
      ${where}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    const dataResult = await query(dataSql, [...values, limit, offset]);

    return { enquiries: dataResult.rows, total };
  },

  /* ======================== FIND BY ID ======================== */

  async findById(id: string): Promise<any | null> {
    const sql = `SELECT * FROM enquiries WHERE id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  },

  /* ======================== UPDATE STATUS ======================== */

  async updateStatus(id: string, status: string): Promise<any | null> {
    const sql = `
      UPDATE enquiries
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [status, id]);
    return result.rows[0] || null;
  },

  /* ======================== UPDATE ADMIN NOTES ======================== */

  async updateAdminNotes(id: string, adminNotes: string): Promise<any | null> {
    const sql = `
      UPDATE enquiries
      SET admin_notes = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [adminNotes, id]);
    return result.rows[0] || null;
  },

  /* ======================== STATS ======================== */

  async getStats(): Promise<any> {
    const sql = `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'new') AS new,
        COUNT(*) FILTER (WHERE status = 'read') AS read,
        COUNT(*) FILTER (WHERE status = 'replied') AS replied,
        COUNT(*) FILTER (WHERE status = 'closed') AS closed
      FROM enquiries
    `;
    const result = await query(sql);
    return result.rows[0];
  },
};
