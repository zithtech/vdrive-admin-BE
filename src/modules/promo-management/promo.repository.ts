import { query } from '../../shared/database';
import { Promo } from './promo.model';

export const PromoRepository = {
  async getPromos(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const res = await query(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM promo_usage WHERE promo_id = p.id) as usage_count,
        (SELECT SUM(discount_applied) FROM promo_usage WHERE promo_id = p.id) as total_discount
       FROM promos p
       ORDER BY p.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalRes = await query(`SELECT COUNT(*) AS total FROM promos`);

    return {
      data: res.rows,
      total: Number(totalRes.rows[0].total),
    };
  },

  async getById(id: number) {
    const res = await query(`SELECT * FROM promos WHERE id = $1`, [id]);
    return res.rows[0];
  },

  async create(data: Partial<Promo>) {
    const res = await query(
      `INSERT INTO promos 
       (code, description, discount_type, discount_value, target_type, target_driver_id, min_rides_required, max_uses, max_uses_per_driver, start_date, expiry_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        data.code,
        data.description,
        data.discount_type,
        data.discount_value,
        data.target_type,
        data.target_driver_id,
        data.min_rides_required || 0,
        data.max_uses,
        data.max_uses_per_driver || 1,
        data.start_date || new Date(),
        data.expiry_date,
        data.is_active ?? true
      ]
    );
    return res.rows[0];
  },

  async update(id: number, data: Partial<Promo>) {
    const res = await query(
      `UPDATE promos 
       SET code=$1, description=$2, discount_type=$3, discount_value=$4, target_type=$5, 
           target_driver_id=$6, min_rides_required=$7, max_uses=$8, max_uses_per_driver=$9, 
           start_date=$10, expiry_date=$11, is_active=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [
        data.code,
        data.description,
        data.discount_type,
        data.discount_value,
        data.target_type,
        data.target_driver_id,
        data.min_rides_required,
        data.max_uses,
        data.max_uses_per_driver,
        data.start_date,
        data.expiry_date,
        data.is_active,
        id
      ]
    );
    return res.rows[0];
  },

  async toggleStatus(id: number, isActive: boolean) {
    const res = await query(
      `UPDATE promos SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [isActive, id]
    );
    return res.rows[0];
  },

  async delete(id: number) {
    await query(`DELETE FROM promos WHERE id = $1`, [id]);
  },

  async triggerNotification(promoId: number, target: string, driverId?: string) {
    const res = await query(
      `UPDATE promos 
       SET notify_status = 'PENDING', 
           notify_target = $1, 
           notify_specific_driver_id = $2,
           notify_count = 0,
           notify_sent_at = NULL
       WHERE id = $3 
       RETURNING *`,
      [target, driverId || null, promoId]
    );
    return res.rows[0];
  }
};
