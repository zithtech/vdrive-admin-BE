import { query } from '../../shared/database';

export const SupportManagementRepository = {
  /* ======================== FAQs ======================== */

  async findAllFaqs(): Promise<any[]> {
    const sql = `
      SELECT id, question, answer, category, is_active, sort_order, created_at, updated_at
      FROM support_faqs
      ORDER BY sort_order ASC, created_at ASC
    `;
    const result = await query(sql);
    return result.rows;
  },

  async findFaqById(id: string): Promise<any | null> {
    const sql = `SELECT * FROM support_faqs WHERE id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  },

  async insertFaq(data: {
    question: string;
    answer: string;
    category: string;
    sort_order?: number;
  }): Promise<any> {
    const sql = `
      INSERT INTO support_faqs (question, answer, category, sort_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await query(sql, [
      data.question,
      data.answer,
      data.category,
      data.sort_order || 0,
    ]);
    return result.rows[0];
  },

  async updateFaq(id: string, data: any): Promise<any | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.question !== undefined) {
      fields.push(`question = $${idx++}`);
      values.push(data.question);
    }
    if (data.answer !== undefined) {
      fields.push(`answer = $${idx++}`);
      values.push(data.answer);
    }
    if (data.category !== undefined) {
      fields.push(`category = $${idx++}`);
      values.push(data.category);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(data.is_active);
    }
    if (data.sort_order !== undefined) {
      fields.push(`sort_order = $${idx++}`);
      values.push(data.sort_order);
    }

    if (fields.length === 0) return this.findFaqById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `UPDATE support_faqs SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);
    return result.rows[0] || null;
  },

  async deleteFaq(id: string): Promise<boolean> {
    const sql = `DELETE FROM support_faqs WHERE id = $1`;
    const result = await query(sql, [id]);
    return (result.rowCount || 0) > 0;
  },

  /* ======================== TICKETS ======================== */

  async findAllTickets(
    limit: number = 50,
    offset: number = 0,
    status?: string
  ): Promise<{ tickets: any[]; total: number }> {
    let countSql = `SELECT COUNT(*) FROM support_tickets`;
    let dataSql = `
      SELECT st.*, d.full_name as driver_name, d.phone_number as driver_phone, d.vdrive_id
      FROM support_tickets st
      LEFT JOIN drivers d ON d.id = st.driver_id
    `;
    const params: any[] = [];
    let idx = 1;

    if (status) {
      const whereClause = ` WHERE st.status = $${idx++}`;
      countSql += ` WHERE status = $1`;
      dataSql += whereClause;
      params.push(status);
    }

    dataSql += ` ORDER BY st.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;

    const countParams = status ? [status] : [];
    const dataParams = [...params, limit, offset];

    const [countResult, dataResult] = await Promise.all([
      query(countSql, countParams),
      query(dataSql, dataParams),
    ]);

    return {
      tickets: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  },

  async findTicketById(id: string): Promise<any | null> {
    const sql = `
      SELECT st.*, d.full_name as driver_name, d.phone_number as driver_phone, d.vdrive_id
      FROM support_tickets st
      LEFT JOIN drivers d ON d.id = st.driver_id
      WHERE st.id = $1
    `;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  },

  async updateTicketStatus(id: string, status: string, adminNotes?: string): Promise<any | null> {
    const sql = `
      UPDATE support_tickets
      SET status = $2, admin_notes = COALESCE($3, admin_notes),
          resolved_at = ${status === 'resolved' ? 'CURRENT_TIMESTAMP' : 'resolved_at'},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id, status, adminNotes || null]);
    return result.rows[0] || null;
  },

  async getTicketStats(): Promise<any> {
    // Overall counts
    const overallSql = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_count
      FROM support_tickets
    `;

    // Today's counts
    const todaySql = `
      SELECT
        COUNT(*) as today_total,
        COUNT(*) FILTER (WHERE status = 'open') as today_open,
        COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'closed') as today_resolved
      FROM support_tickets
      WHERE created_at >= CURRENT_DATE
    `;

    // Category breakdown
    const categorySql = `
      SELECT 
        COALESCE(category, 'general') as category,
        COUNT(*) as count
      FROM support_tickets
      GROUP BY category
      ORDER BY count DESC
    `;

    // Average response time (time between ticket creation and first admin message)
    const avgResponseSql = `
      SELECT 
        ROUND(AVG(EXTRACT(EPOCH FROM (first_reply - ticket_created)) / 60)::numeric, 1) as avg_response_minutes
      FROM (
        SELECT 
          st.created_at as ticket_created,
          MIN(sm.created_at) as first_reply
        FROM support_tickets st
        JOIN support_messages sm ON sm.ticket_id = st.id AND sm.sender_type = 'admin'
        GROUP BY st.id, st.created_at
      ) sub
    `;

    const [overallResult, todayResult, categoryResult, avgResponseResult] = await Promise.all([
      query(overallSql),
      query(todaySql),
      query(categorySql),
      query(avgResponseSql),
    ]);

    return {
      overall: overallResult.rows[0],
      today: todayResult.rows[0],
      categories: categoryResult.rows,
      avg_response_minutes: avgResponseResult.rows[0]?.avg_response_minutes || 0,
    };
  },

  /* ======================== MESSAGES ======================== */

  async saveMessage(data: {
    ticket_id: string;
    sender_id: string;
    sender_type: string;
    message: string;
  }): Promise<any> {
    const sql = `
      INSERT INTO support_messages (ticket_id, sender_id, sender_type, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await query(sql, [
      data.ticket_id,
      data.sender_id,
      data.sender_type,
      data.message,
    ]);
    return result.rows[0];
  },

  async findMessagesByTicketId(ticketId: string): Promise<any[]> {
    const sql = `
      SELECT * FROM support_messages
      WHERE ticket_id = $1
      ORDER BY created_at ASC
    `;
    const result = await query(sql, [ticketId]);
    return result.rows;
  },

  async getDriverFcmTokenByTicketId(ticketId: string): Promise<string | null> {
    const sql = `
      SELECT d.fcm_token 
      FROM support_tickets st
      JOIN drivers d ON d.id = st.driver_id
      WHERE st.id = $1
    `;
    const result = await query(sql, [ticketId]);
    return result.rows[0]?.fcm_token || null;
  },

  /* ======================== USER-DRIVER-API Tickets ======================== */

  async createUserTicket(data: any): Promise<any> {
    const sql = `
      INSERT INTO user_support_tickets (
        user_id, subject, description, priority, category, status,
        channel, severity, source, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;
    const result = await query(sql, [
      data.user_id,
      data.subject,
      data.description,
      data.priority,
      data.category,
      data.status,
      data.channel,
      data.severity,
      data.source,
    ]);
    return result.rows[0];
  },

  async findTicketsByUserId(userId: string): Promise<any[]> {
    const sql = `
      SELECT * FROM user_support_tickets
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [userId]);
    return result.rows;
  },

  async findAllUserTickets(): Promise<any[]> {
    const sql = `
      SELECT st.*, u.full_name as user_name, u.phone_number as user_phone
      FROM user_support_tickets st
      LEFT JOIN users u ON u.id = st.user_id
      ORDER BY st.created_at DESC
    `;
    const result = await query(sql);
    return result.rows;
  },

  async getUserFcmToken(userId: string): Promise<string | null> {
    const sql = `
      SELECT fcm_token FROM users WHERE id = $1
    `;
    const result = await query(sql, [userId]);
    return result.rows[0]?.fcm_token || null;
  },

  async updateUserTicketStatus(
    ticketId: string,
    status: string,
    adminNotes?: string
  ): Promise<any | null> {
    const sql = `
      UPDATE user_support_tickets
      SET status = $2, admin_notes = COALESCE($3, admin_notes),
          resolved_at = ${status === 'resolved' ? 'CURRENT_TIMESTAMP' : 'resolved_at'},
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [ticketId, status, adminNotes || null]);
    return result.rows[0] || null;
  },

  async getUserTicketById(ticketId: string): Promise<any | null> {
    const sql = `
      SELECT st.*, u.full_name as user_name, u.phone_number as user_phone
      FROM user_support_tickets st
      LEFT JOIN users u ON u.id = st.user_id
      WHERE st.id = $1
    `;
    const result = await query(sql, [ticketId]);
    return result.rows[0] || null;
  },

  async saveUserMessage(data: {
    ticket_id: string;
    sender_id: string;
    sender_type: string;
    message: string;
    attachments?: string[];
  }): Promise<any> {
    const attachmentsJson = data.attachments?.length ? JSON.stringify(data.attachments) : null;

    const sql = `
      INSERT INTO user_support_messages (
        ticket_id, sender_id, sender_type, message, attachments
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await query(sql, [
      data.ticket_id,
      data.sender_id,
      data.sender_type,
      data.message,
      attachmentsJson,
    ]);

    return result.rows[0];
  },

  async findUserMessagesByTicketId(ticketId: string): Promise<any[]> {
    const sql = `
      SELECT * FROM user_support_messages
      WHERE ticket_id = $1
      ORDER BY created_at ASC
    `;
    const result = await query(sql, [ticketId]);
    return result.rows;
  },

  async getUserFcmTokenByTicketId(ticketId: string): Promise<string | null> {
    const sql = `
      SELECT u.fcm_token 
      FROM user_support_tickets st
      JOIN users u ON u.id = st.user_id
      WHERE st.id = $1
    `;
    const result = await query(sql, [ticketId]);
    return result.rows[0]?.fcm_token || null;
  },
};
