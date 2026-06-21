import { query } from '../../shared/database';
import { DriverTimeSlotsPricing } from './driverTimeSlotsPricing.model';

export const DriverTimeSlotsPricingRepository = {
  /**
   * Get all driver time slots pricing with optional filters and pagination
   */
  async getDriverTimeSlotsPricing(
    filters: {
      price_and_fare_rules_id?: string;
      driver_types?: string;
      day?: string;
    },
    page: number,
    limit: number
  ): Promise<{ data: DriverTimeSlotsPricing[]; total: number }> {
    const offset = (page - 1) * limit;
    const params: any[] = [];
    const whereConditions: string[] = [];
    let paramIndex = 1;

    // Build dynamic WHERE conditions
    if (filters.price_and_fare_rules_id) {
      whereConditions.push(`price_and_fare_rules_id = $${paramIndex}`);
      params.push(filters.price_and_fare_rules_id);
      paramIndex++;
    }

    if (filters.driver_types) {
      whereConditions.push(`driver_types ILIKE $${paramIndex}`);
      params.push(`%${filters.driver_types}%`);
      paramIndex++;
    }

    if (filters.day) {
      whereConditions.push(`day = $${paramIndex}`);
      params.push(filters.day.toLowerCase());
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM driver_time_slots_pricing ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM driver_time_slots_pricing 
      ${whereClause}
      ORDER BY day, from_time
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const dataResult = await query(dataQuery, params);
    return { data: dataResult.rows, total };
  },

  /**
   * Get a single driver time slots pricing by ID
   */
  async getDriverTimeSlotsPricingById(id: string): Promise<DriverTimeSlotsPricing | null> {
    const result = await query('SELECT * FROM driver_time_slots_pricing WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  /**
   * Get all driver time slots pricing for a specific pricing fare rule
   */
  async getByPricingFareRuleId(price_and_fare_rules_id: string): Promise<DriverTimeSlotsPricing[]> {
    const result = await query(
      'SELECT * FROM driver_time_slots_pricing WHERE price_and_fare_rules_id = $1 ORDER BY day, from_time',
      [price_and_fare_rules_id]
    );
    return result.rows;
  },

  /**
   * Create a new driver time slots pricing
   */
  async createDriverTimeSlotsPricing(data: {
    price_and_fare_rules_id: string;
    driver_types: string;
    day: string;
    from_time: string;
    to_time: string;
    per_km_rate: number;
    per_hour_rate?: number;
  }): Promise<DriverTimeSlotsPricing> {
    const result = await query(
      `INSERT INTO driver_time_slots_pricing
        (price_and_fare_rules_id, driver_types, day, from_time, to_time, per_km_rate, per_hour_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.price_and_fare_rules_id,
        data.driver_types,
        data.day.toLowerCase(),
        data.from_time,
        data.to_time,
        data.per_km_rate,
        data.per_hour_rate ?? 0,
      ]
    );
    return result.rows[0];
  },

  /**
   * Bulk create driver time slots pricing
   */
  async bulkCreateDriverTimeSlotsPricing(
    slots: Array<{
      price_and_fare_rules_id: string;
      driver_types: string;
      day: string;
      from_time: string;
      to_time: string;
      per_km_rate: number;
      per_hour_rate?: number;
    }>
  ): Promise<DriverTimeSlotsPricing[]> {
    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    slots.forEach((slot) => {
      values.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`
      );
      params.push(
        slot.price_and_fare_rules_id,
        slot.driver_types,
        slot.day.toLowerCase(),
        slot.from_time,
        slot.to_time,
        slot.per_km_rate,
        slot.per_hour_rate ?? 0
      );
      paramIndex += 7;
    });

    const result = await query(
      `INSERT INTO driver_time_slots_pricing
        (price_and_fare_rules_id, driver_types, day, from_time, to_time, per_km_rate, per_hour_rate)
       VALUES ${values.join(', ')}
       RETURNING *`,
      params
    );
    return result.rows;
  },

  /**
   * Update a driver time slots pricing
   */
  async updateDriverTimeSlotsPricing(
    id: string,
    data: {
      driver_types?: string;
      day?: string;
      from_time?: string;
      to_time?: string;
      per_km_rate?: number;
      per_hour_rate?: number;
    }
  ): Promise<DriverTimeSlotsPricing> {
    const fields: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (data.driver_types !== undefined) {
      fields.push(`driver_types = $${paramIndex}`);
      params.push(data.driver_types);
      paramIndex++;
    }
    if (data.day !== undefined) {
      fields.push(`day = $${paramIndex}`);
      params.push(data.day.toLowerCase());
      paramIndex++;
    }
    if (data.from_time !== undefined) {
      fields.push(`from_time = $${paramIndex}`);
      params.push(data.from_time);
      paramIndex++;
    }
    if (data.to_time !== undefined) {
      fields.push(`to_time = $${paramIndex}`);
      params.push(data.to_time);
      paramIndex++;
    }
    if (data.per_km_rate !== undefined) {
      fields.push(`per_km_rate = $${paramIndex}`);
      params.push(data.per_km_rate);
      paramIndex++;
    }
    if (data.per_hour_rate !== undefined) {
      fields.push(`per_hour_rate = $${paramIndex}`);
      params.push(data.per_hour_rate);
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const result = await query(
      `UPDATE driver_time_slots_pricing SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return result.rows[0];
  },

  /**
   * Delete a driver time slots pricing
   */
  async deleteDriverTimeSlotsPricing(id: string): Promise<void> {
    const result = await query('DELETE FROM driver_time_slots_pricing WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      throw { statusCode: 404, message: 'Driver time slots pricing not found' };
    }
  },

  /**
   * Delete all driver time slots pricing for a specific pricing fare rule
   */
  async deleteByPricingFareRuleId(price_and_fare_rules_id: string): Promise<void> {
    await query('DELETE FROM driver_time_slots_pricing WHERE price_and_fare_rules_id = $1', [
      price_and_fare_rules_id,
    ]);
  },

  /**
   * Check for overlapping time slots
   */
  async checkTimeOverlap(
    price_and_fare_rules_id: string,
    driver_types: string,
    day: string,
    from_time: string,
    to_time: string,
    excludeId?: string
  ): Promise<boolean> {
    const params: any[] = [
      price_and_fare_rules_id,
      driver_types,
      day.toLowerCase(),
      from_time,
      to_time,
    ];
    let queryText = `
      SELECT id FROM driver_time_slots_pricing 
      WHERE price_and_fare_rules_id = $1 
        AND driver_types = $2 
        AND day = $3
        AND (
          (from_time <= $4 AND to_time > $4) OR
          (from_time < $5 AND to_time >= $5) OR
          (from_time >= $4 AND to_time <= $5)
        )
    `;

    if (excludeId) {
      queryText += ' AND id != $6';
      params.push(excludeId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  },
};
