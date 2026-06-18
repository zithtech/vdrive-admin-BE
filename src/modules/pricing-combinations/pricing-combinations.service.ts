// src/modules/pricing-combinations/pricing-combinations.service.ts
import { pool } from '../../shared/database';
import { PricingCombinationRepository } from './pricing-combinations.repository';
import { PricingCombination } from './pricing-combinations.model';

export const PricingCombinationService = {
  async getCombinations(): Promise<PricingCombination[]> {
    return await PricingCombinationRepository.getAll();
  },

  async clearMatrix(): Promise<void> {
    await PricingCombinationRepository.deleteAll();
  },

  async createCombination(data: Partial<PricingCombination>): Promise<PricingCombination> {
    return await PricingCombinationRepository.create(data);
  },

  async updateCombination(
    id: string,
    data: Partial<PricingCombination>
  ): Promise<PricingCombination | null> {
    return await PricingCombinationRepository.update(id, data);
  },

  async deleteCombination(id: string): Promise<void> {
    await PricingCombinationRepository.deleteById(id);
  },

  async bulkCreateCombinations(data: Partial<PricingCombination>[]): Promise<PricingCombination[]> {
    return await PricingCombinationRepository.bulkCreate(data);
  },

  async saveMatrix(data: Partial<PricingCombination>[]): Promise<PricingCombination[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Clear existing matrix
      await client.query('DELETE FROM pricing_combinations');

      if (data.length === 0) {
        await client.query('COMMIT');
        return [];
      }

      // Bulk insert new matrix
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      for (const item of data) {
        placeholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, NOW(), NOW())`
        );
        values.push(
          item.tier,
          item.duration,
          item.distance,
          item.type,
          item.price,
          item.per_km_rate
        );
        paramIndex += 6;
      }

      const sql = `
        INSERT INTO pricing_combinations (tier, duration, distance, type, price, per_km_rate, created_at, updated_at)
        VALUES ${placeholders.join(', ')}
        RETURNING *
      `;

      const result = await client.query(sql, values);
      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async findClosestMatch(duration: number, distance: number): Promise<PricingCombination | null> {
    return await PricingCombinationRepository.findClosestMatch(duration, distance);
  },
};
