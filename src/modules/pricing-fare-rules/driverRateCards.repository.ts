import { query } from '../../shared/database';
import { DriverRateCard } from './pricingFareRules.model';

export const DriverRateCardsRepository = {
  async getByPricingFareRuleId(ruleId: string): Promise<DriverRateCard[]> {
    const result = await query(
      `SELECT id, pricing_fare_rule_id, driver_types, per_hour_rate, per_km_rate, free_km, minimum_fare
       FROM pricing_driver_rate_cards WHERE pricing_fare_rule_id = $1 ORDER BY driver_types`,
      [ruleId]
    );
    return result.rows;
  },

  async bulkCreate(
    cards: Array<{
      pricing_fare_rule_id: string;
      driver_types: string;
      per_hour_rate: number;
      per_km_rate: number;
      free_km: number;
      minimum_fare: number;
    }>
  ): Promise<DriverRateCard[]> {
    if (cards.length === 0) return [];
    const values: any[] = [];
    const placeholders = cards.map((c, i) => {
      const b = i * 6;
      values.push(
        c.pricing_fare_rule_id,
        c.driver_types,
        c.per_hour_rate,
        c.per_km_rate,
        c.free_km,
        c.minimum_fare
      );
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`;
    });
    const result = await query(
      `INSERT INTO pricing_driver_rate_cards
        (pricing_fare_rule_id, driver_types, per_hour_rate, per_km_rate, free_km, minimum_fare)
       VALUES ${placeholders.join(', ')}
       RETURNING id, pricing_fare_rule_id, driver_types, per_hour_rate, per_km_rate, free_km, minimum_fare`,
      values
    );
    return result.rows;
  },

  async deleteByPricingFareRuleId(ruleId: string): Promise<void> {
    await query('DELETE FROM pricing_driver_rate_cards WHERE pricing_fare_rule_id = $1', [ruleId]);
  },
};
