import { query } from '../../shared/database';
import { TimeSlab } from './pricingFareRules.model';

export const TimeSlabsRepository = {
  async getByPricingFareRuleId(ruleId: string): Promise<TimeSlab[]> {
    const result = await query(
      `SELECT id, pricing_fare_rule_id, driver_types, from_hours, per_hour_rate, sort_order
       FROM pricing_time_slabs WHERE pricing_fare_rule_id = $1
       ORDER BY driver_types, from_hours ASC, sort_order ASC`,
      [ruleId]
    );
    return result.rows;
  },

  async bulkCreate(
    slabs: Array<{
      pricing_fare_rule_id: string;
      driver_types: string;
      from_hours: number;
      per_hour_rate: number;
      sort_order: number;
    }>
  ): Promise<TimeSlab[]> {
    if (slabs.length === 0) return [];
    const values: any[] = [];
    const placeholders = slabs.map((s, i) => {
      const b = i * 5;
      values.push(s.pricing_fare_rule_id, s.driver_types, s.from_hours, s.per_hour_rate, s.sort_order);
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`;
    });
    const result = await query(
      `INSERT INTO pricing_time_slabs
        (pricing_fare_rule_id, driver_types, from_hours, per_hour_rate, sort_order)
       VALUES ${placeholders.join(', ')}
       RETURNING id, pricing_fare_rule_id, driver_types, from_hours, per_hour_rate, sort_order`,
      values
    );
    return result.rows;
  },

  async deleteByPricingFareRuleId(ruleId: string): Promise<void> {
    await query('DELETE FROM pricing_time_slabs WHERE pricing_fare_rule_id = $1', [ruleId]);
  },
};
