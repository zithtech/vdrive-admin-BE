import { query } from '../../shared/database';
import { Coupon, CouponUsage } from './coupon.model';

export const CouponRepository = {
  async getCoupons(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const coupons = await query(
      `SELECT * FROM coupons 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalRes = await query(
      `SELECT COUNT(*) AS total FROM coupons`
    );

    return {
      coupons: coupons.rows,
      total: Number(totalRes.rows[0].total),
    };
  },

  async getById(id: string) {
    const res = await query(
      `SELECT * FROM coupons WHERE id=$1`,
      [id]
    );
    return res.rows[0];
  },

  async getByCode(code: string) {
    const res = await query(
      `SELECT * FROM coupons WHERE code=$1`,
      [code]
    );
    return res.rows[0];
  },

  async create(data: Coupon) {
    const res = await query(
      `INSERT INTO coupons 
       (code, discount_type, discount_value, min_ride_amount, max_discount_amount, usage_limit, per_user_limit, valid_from, valid_until, applicable_ride_types, user_eligibility, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        data.code,
        data.discount_type,
        data.discount_value,
        data.min_ride_amount || 0,
        data.max_discount_amount || null,
        data.usage_limit || null,
        data.per_user_limit || 1,
        data.valid_from,
        data.valid_until,
        data.applicable_ride_types || null,
        data.user_eligibility || 'ALL',
        data.is_active ?? true,
      ]
    );
    return res.rows[0];
  },

  async update(id: string, data: Partial<Coupon>) {
    const keys = Object.keys(data).filter(k => data[k as keyof Coupon] !== undefined);
    if (keys.length === 0) return this.getById(id);

    const setStr = keys.map((k, i) => `${k}=$${i + 1}`).join(', ');
    const values = keys.map(k => data[k as keyof Coupon]);
    
    // Add id to the end of values for the WHERE clause
    values.push(id as any);

    const res = await query(
      `UPDATE coupons
       SET ${setStr}, updated_at = current_timestamp
       WHERE id=$${values.length} RETURNING *`,
      values
    );
    return res.rows[0];
  },

  async toggleStatus(id: string, is_active: boolean) {
    const res = await query(
      `UPDATE coupons 
       SET is_active=$1, updated_at = current_timestamp
       WHERE id=$2 
       RETURNING *`,
      [is_active, id]
    );
    return res.rows[0];
  },

  async delete(id: string) {
    await query(
      `DELETE FROM coupons WHERE id=$1`,
      [id]
    );
  },

  async recordUsage(data: CouponUsage) {
    const res = await query(
      `INSERT INTO coupon_usages 
       (coupon_id, user_id, trip_id, discount_applied)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.coupon_id, data.user_id, data.trip_id, data.discount_applied]
    );
    return res.rows[0];
  },

  async getUserUsageCount(couponId: string, userId: string) {
    const res = await query(
      `SELECT COUNT(*) AS total FROM coupon_usages WHERE coupon_id=$1 AND user_id=$2`,
      [couponId, userId]
    );
    return Number(res.rows[0].total);
  },

  async getTotalUsageCount(couponId: string) {
    const res = await query(
      `SELECT COUNT(*) AS total FROM coupon_usages WHERE coupon_id=$1`,
      [couponId]
    );
    return Number(res.rows[0].total);
  },

  async createTopic(couponId: string, topicName: string) {
    const res = await query(
      `INSERT INTO coupon_topics (coupon_id, topic_name)
       VALUES ($1, $2)
       ON CONFLICT (topic_name) DO NOTHING
       RETURNING *`,
      [couponId, topicName]
    );
    return res.rows[0];
  },

  async triggerNotification(couponId: string, target: string, userId?: string) {
    const res = await query(
      `UPDATE coupons 
       SET notify_status = 'PENDING', 
           notify_target = $1, 
           notify_specific_user_id = $2,
           notify_count = 0,
           notify_sent_at = NULL
       WHERE id = $3 
       RETURNING *`,
      [target, userId || null, couponId]
    );
    return res.rows[0];
  }
};
