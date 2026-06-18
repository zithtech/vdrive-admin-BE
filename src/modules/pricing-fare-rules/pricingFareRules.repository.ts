import { query } from '../../shared/database';
import { PricingFareRule, FareSummary } from './pricingFareRules.model';
import { ExtraKmCheckpointsRepository } from './extraKmCheckpoints.repository';

export const PricingFareRulesRepository = {
  /**
   * Get all pricing fare rules with optional filters and pagination
   */
  async getPricingFareRules(
    filters: {
      search?: string;
      area_id?: string;
      district_id?: string;
      is_hotspot?: boolean;
    },
    page: number,
    limit: number,
    includeTimeSlots?: boolean
  ): Promise<{ data: FareSummary[]; total: number }> {
    const offset = (page - 1) * limit;
    const params: any[] = [];
    const whereConditions: string[] = [];
    let paramIndex = 1;

    // Build dynamic WHERE conditions
    if (filters.area_id) {
      whereConditions.push(`p.area_id = $${paramIndex}`);
      params.push(filters.area_id);
      paramIndex++;
    }

    if (filters.district_id) {
      whereConditions.push(`p.district_id = $${paramIndex}`);
      params.push(filters.district_id);
      paramIndex++;
    }

    if (filters.is_hotspot !== undefined) {
      whereConditions.push(`p.is_hotspot = $${paramIndex}`);
      params.push(filters.is_hotspot);
      paramIndex++;
    }

    if (filters.search) {
      whereConditions.push(
        `(d.name ILIKE $${paramIndex} OR a.name ILIKE $${paramIndex} OR h.hotspot_name ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total records
    const countQuery = `
      SELECT COUNT(*) 
      FROM price_and_fare_rules p
      LEFT JOIN areas a ON p.area_id = a.id
      LEFT JOIN districts d ON p.district_id = d.id
      LEFT JOIN hotspots h ON p.hotspot_id = h.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
    SELECT 
        p.id,
        c.name AS country_name,
        c.id AS country_id,
        s.name AS state_name,
        s.id AS state_id,
        d.name AS district_name,
        d.id AS district_id,
        a.name AS area_name,
        a.id AS area_id,
        a.pincode AS pincode,
        p.global_price,
        p.is_hotspot,
        h.id AS hotspot_id,
        h.hotspot_name,
        p.multiplier,
        p.extra_km_step,
        p.extra_km_price,
        p.extra_km_start_multiplier
        ${
          includeTimeSlots
            ? `, 
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', ts.id,
                    'day', ts.day,
                    'from_time', ts.from_time,
                    'to_time', ts.to_time,
                    'price', ts.price,
                    'driver_types', ts.driver_types
                )
            ) FILTER (WHERE ts.id IS NOT NULL), '[]'
        ) AS time_slots`
            : ''
        }
    FROM price_and_fare_rules p
    LEFT JOIN areas a ON p.area_id = a.id
    JOIN districts d ON p.district_id = d.id
    JOIN states s ON d.state_id = s.id
    JOIN countries c ON s.country_id = c.id
    LEFT JOIN hotspots h ON p.hotspot_id = h.id 
    ${includeTimeSlots ? 'LEFT JOIN driver_time_slots_pricing ts ON p.id = ts.price_and_fare_rules_id' : ''}
    ${whereClause}
    ${includeTimeSlots ? 'GROUP BY p.id, c.id, s.id, d.id, a.id, h.id' : ''}
    ORDER BY d.name, a.name
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
`;
    params.push(limit, offset);

    const dataResult = await query(dataQuery, params);
    return { data: dataResult.rows, total };
  },

  /**
   * Get a single pricing fare rule by ID
   */
  async getPricingFareRuleById(id: string): Promise<PricingFareRule | null> {
    const result = await query(
      'SELECT id, district_id, area_id, global_price, is_hotspot, hotspot_id, multiplier, extra_km_step, extra_km_price, extra_km_start_multiplier FROM price_and_fare_rules WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Get fare summary by ID (using the view logic)
   */
  async getFareSummaryById(id: string): Promise<FareSummary | null> {
    const queryText = `
      SELECT 
        p.id,
        c.name AS country_name,
        c.id AS country_id,
        s.name AS state_name,
        s.id AS state_id,
        d.name AS district_name,
        d.id AS district_id,
        a.name AS area_name,
        a.id AS area_id,
        a.pincode AS pincode,
        p.global_price,
        p.is_hotspot,
        h.id AS hotspot_id,
        h.hotspot_name,
        p.multiplier,
        p.extra_km_step,
        p.extra_km_price,
        p.extra_km_start_multiplier
      FROM price_and_fare_rules p
      LEFT JOIN areas a ON p.area_id = a.id
      JOIN districts d ON p.district_id = d.id
      JOIN states s ON d.state_id = s.id
      JOIN countries c ON s.country_id = c.id
      LEFT JOIN hotspots h ON p.hotspot_id = h.id
      WHERE p.id = $1
    `;
    const result = await query(queryText, [id]);
    const row: FareSummary | undefined = result.rows[0];
    if (!row) return null;
    row.extra_km_checkpoints = await ExtraKmCheckpointsRepository.getByPricingFareRuleId(row.id);
    return row;
  },

  /**
   * Create a new pricing fare rule
   */
  async createPricingFareRule(data: {
    district_id: string;
    area_id?: string | null;
    global_price: number;
    is_hotspot: boolean;
    hotspot_id?: string | null;
    multiplier?: number | null;
    extra_km_step?: number;
    extra_km_price?: number;
    extra_km_start_multiplier?: number;
  }): Promise<PricingFareRule> {
    const result = await query(
      `INSERT INTO price_and_fare_rules
        (district_id, area_id, global_price, is_hotspot, hotspot_id, multiplier, extra_km_step, extra_km_price, extra_km_start_multiplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, district_id, area_id, global_price, is_hotspot, hotspot_id, multiplier, extra_km_step, extra_km_price, extra_km_start_multiplier`,
      [
        data.district_id,
        data.area_id || null,
        data.global_price,
        data.is_hotspot,
        data.hotspot_id || null,
        data.multiplier || null,
        data.extra_km_step ?? 5,
        data.extra_km_price ?? 10,
        data.extra_km_start_multiplier ?? 1,
      ]
    );
    return result.rows[0];
  },

  /**
   * Update a pricing fare rule
   */
  async updatePricingFareRule(
    id: string,
    data: {
      district_id?: string;
      area_id?: string | null;
      global_price?: number;
      is_hotspot?: boolean;
      hotspot_id?: string | null;
      multiplier?: number | null;
      extra_km_step?: number;
      extra_km_price?: number;
      extra_km_start_multiplier?: number;
    }
  ): Promise<PricingFareRule> {
    const fields: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (data.district_id !== undefined) {
      fields.push(`district_id = $${paramIndex}`);
      params.push(data.district_id);
      paramIndex++;
    }
    if (data.area_id !== undefined) {
      fields.push(`area_id = $${paramIndex}`);
      params.push(data.area_id);
      paramIndex++;
    }
    if (data.global_price !== undefined) {
      fields.push(`global_price = $${paramIndex}`);
      params.push(data.global_price);
      paramIndex++;
    }
    if (data.is_hotspot !== undefined) {
      fields.push(`is_hotspot = $${paramIndex}`);
      params.push(data.is_hotspot);
      paramIndex++;
    }
    if (data.hotspot_id !== undefined) {
      fields.push(`hotspot_id = $${paramIndex}`);
      params.push(data.hotspot_id);
      paramIndex++;
    }
    if (data.multiplier !== undefined) {
      fields.push(`multiplier = $${paramIndex}`);
      params.push(data.multiplier);
      paramIndex++;
    }
    if (data.extra_km_step !== undefined) {
      fields.push(`extra_km_step = $${paramIndex}`);
      params.push(data.extra_km_step);
      paramIndex++;
    }
    if (data.extra_km_price !== undefined) {
      fields.push(`extra_km_price = $${paramIndex}`);
      params.push(data.extra_km_price);
      paramIndex++;
    }
    if (data.extra_km_start_multiplier !== undefined) {
      fields.push(`extra_km_start_multiplier = $${paramIndex}`);
      params.push(data.extra_km_start_multiplier);
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const result = await query(
      `UPDATE price_and_fare_rules SET ${fields.join(', ')} WHERE id = $1 RETURNING id, district_id, area_id, global_price, is_hotspot, hotspot_id, multiplier, extra_km_step, extra_km_price, extra_km_start_multiplier`,
      params
    );
    return result.rows[0];
  },

  /**
   * Delete a pricing fare rule
   */
  async deletePricingFareRule(id: string): Promise<void> {
    const result = await query('DELETE FROM price_and_fare_rules WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      throw { statusCode: 404, message: 'Pricing fare rule not found' };
    }
  },

  /**
   * Check if a pricing fare rule exists for a given area/city combination
   */
  async checkDuplicateArea(
    district_id: string,
    area_id: string | null,
    excludeId?: string
  ): Promise<boolean> {
    let query_text: string;
    const params: any[] = [district_id];

    // Handle NULL area_id properly with IS NULL instead of = NULL
    if (area_id === null) {
      query_text = 'SELECT id FROM price_and_fare_rules WHERE district_id = $1 AND area_id IS NULL';
    } else {
      query_text = 'SELECT id FROM price_and_fare_rules WHERE district_id = $1 AND area_id = $2';
      params.push(area_id);
    }

    if (excludeId) {
      query_text += ` AND id != $${params.length + 1}`;
      params.push(excludeId);
    }

    const result = await query(query_text, params);
    return result.rows.length > 0;
  },
};
