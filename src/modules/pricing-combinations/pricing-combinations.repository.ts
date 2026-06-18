// src/modules/pricing-combinations/pricing-combinations.repository.ts
import { query } from '../../shared/database';
import { PricingCombination } from './pricing-combinations.model';

export const PricingCombinationRepository = {
  async getAll(): Promise<PricingCombination[]> {
    const result = await query(
      'SELECT * FROM pricing_combinations ORDER BY tier ASC, distance ASC',
      []
    );
    return result.rows;
  },

  async getById(id: string): Promise<PricingCombination | null> {
    const result = await query('SELECT * FROM pricing_combinations WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async deleteAll(): Promise<void> {
    await query('DELETE FROM pricing_combinations', []);
  },

  async deleteById(id: string): Promise<void> {
    await query('DELETE FROM pricing_combinations WHERE id = $1', [id]);
  },

  async create(data: Partial<PricingCombination>): Promise<PricingCombination> {
    const { tier, duration, distance, type, price, per_km_rate } = data;
    const result = await query(
      `INSERT INTO pricing_combinations (tier, duration, distance, type, price, per_km_rate, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [tier, duration, distance, type, price, per_km_rate]
    );
    return result.rows[0];
  },

  async update(id: string, data: Partial<PricingCombination>): Promise<PricingCombination | null> {
    const fields = Object.keys(data).filter((key) =>
      ['tier', 'duration', 'distance', 'type', 'price', 'per_km_rate'].includes(key)
    );
    if (fields.length === 0) return this.getById(id);

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = fields.map((field) => (data as any)[field]);

    const result = await query(
      `UPDATE pricing_combinations SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  },

  async bulkCreate(data: Partial<PricingCombination>[]): Promise<PricingCombination[]> {
    if (data.length === 0) return [];

    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const item of data) {
      placeholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, NOW(), NOW())`
      );
      values.push(item.tier, item.duration, item.distance, item.type, item.price, item.per_km_rate);
      paramIndex += 6;
    }

    const sql = `
      INSERT INTO pricing_combinations (tier, duration, distance, type, price, per_km_rate, created_at, updated_at)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows;
  },

  async findClosestMatch(duration: number, distance: number): Promise<PricingCombination | null> {
    // Find the combination that has duration <= current duration AND distance <= current distance
    // We want the most specific one (highest duration/distance within limits)
    const result = await query(
      `SELECT * FROM pricing_combinations 
       WHERE duration <= $1 AND distance <= $2 
       ORDER BY duration DESC, distance DESC 
       LIMIT 1`,
      [duration, distance]
    );
    return result.rows[0] || null;
  },
};
