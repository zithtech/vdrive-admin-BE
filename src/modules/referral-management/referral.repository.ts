import { query } from '../../shared/database';

export const ReferralRepository = {
  async getAll() {
    const result = await query('SELECT * FROM referral_configurations ORDER BY created_at DESC');
    return result.rows;
  },

  async getById(id: string) {
    const result = await query('SELECT * FROM referral_configurations WHERE id = $1', [id]);
    return result.rows[0];
  },

  async getByUserType(userType: string) {
    const result = await query('SELECT * FROM referral_configurations WHERE user_type = $1 AND is_active = TRUE', [userType]);
    return result.rows[0];
  },

  async create(data: any) {
    const {
      user_type,
      referrer_reward,
      referrer_reward_type,
      referee_reward,
      referee_reward_type,
      is_active,
    } = data;

    const result = await query(
      `INSERT INTO referral_configurations 
       (user_type, referrer_reward, referrer_reward_type, referee_reward, referee_reward_type, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_type, referrer_reward, referrer_reward_type, referee_reward, referee_reward_type, is_active ?? true]
    );
    return result.rows[0];
  },

  async update(id: string, data: any) {
    const fields = Object.keys(data).filter(key => data[key] !== undefined);
    const setClause = fields.map((field, index) => `"${field}" = $${index + 2}`).join(', ');
    const values = fields.map(field => data[field]);

    const result = await query(
      `UPDATE referral_configurations SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  },

  async delete(id: string) {
    await query('DELETE FROM referral_configurations WHERE id = $1', [id]);
  },

  async deactivateAllOther(userType: string, excludeId?: string) {
    let sql = 'UPDATE referral_configurations SET is_active = FALSE WHERE user_type = $1';
    const params = [userType];
    if (excludeId) {
      sql += ' AND id != $2';
      params.push(excludeId);
    }
    await query(sql, params);
  },

  async getReferralLogs(userType: 'CUSTOMER' | 'DRIVER') {
    const tableName = userType === 'DRIVER' ? 'drivers' : 'users';
    
    // Both drivers and users have first_name, last_name, and a generated full_name column
    const result = await query(`
      SELECT 
        r.id,
        r.referrer_id,
        r.referee_id,
        r.status,
        0 as reward_amount,
        r.created_at as referred_at,
        r.updated_at as completed_at,
        r.referral_type,
        ref.referral_code,
        ref.full_name as referrer_name,
        ref.phone_number as referrer_phone,
        ree.full_name as referee_name,
        ree.phone_number as referee_phone
      FROM referrals r
      JOIN ${tableName} ref ON r.referrer_id = ref.id
      LEFT JOIN ${tableName} ree ON r.referee_id = ree.id
      WHERE r.referral_type = $1
      ORDER BY r.created_at DESC
    `, [userType]);
    return result.rows;
  }
};
