import { query } from '../../shared/database';
import { PricingFareRule, FareSummary } from './pricingFareRules.model';

// Zone-wide columns selected for a fare rule
const ZONE_COLS = `p.one_way_return_pct, p.night_charge_pct, p.night_start, p.night_end,
        p.outstation_allowance_per_day, p.is_hotspot, p.multiplier`;

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
        c.name AS country_name, c.id AS country_id,
        s.name AS state_name, s.id AS state_id,
        d.name AS district_name, d.id AS district_id,
        a.name AS area_name, a.id AS area_id, a.pincode AS pincode,
        ${ZONE_COLS},
        h.id AS hotspot_id, h.hotspot_name
        ${
          includeTimeSlots
            ? `,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', ts.id, 'day', ts.day, 'from_time', ts.from_time, 'to_time', ts.to_time,
                    'per_km_rate', ts.per_km_rate, 'per_hour_rate', ts.per_hour_rate,
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

  async getPricingFareRuleById(id: string): Promise<PricingFareRule | null> {
    const result = await query(
      `SELECT id, district_id, area_id, one_way_return_pct, night_charge_pct, night_start, night_end,
              outstation_allowance_per_day, is_hotspot, hotspot_id, multiplier
       FROM price_and_fare_rules WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Get fare summary by ID (zone row only; child collections loaded by the service)
   */
  async getFareSummaryById(id: string): Promise<FareSummary | null> {
    const queryText = `
      SELECT
        p.id,
        c.name AS country_name, c.id AS country_id,
        s.name AS state_name, s.id AS state_id,
        d.name AS district_name, d.id AS district_id,
        a.name AS area_name, a.id AS area_id, a.pincode AS pincode,
        ${ZONE_COLS},
        h.id AS hotspot_id, h.hotspot_name
      FROM price_and_fare_rules p
      LEFT JOIN areas a ON p.area_id = a.id
      JOIN districts d ON p.district_id = d.id
      JOIN states s ON d.state_id = s.id
      JOIN countries c ON s.country_id = c.id
      LEFT JOIN hotspots h ON p.hotspot_id = h.id
      WHERE p.id = $1
    `;
    const result = await query(queryText, [id]);
    return result.rows[0] || null;
  },

  async createPricingFareRule(data: {
    district_id: string;
    area_id?: string | null;
    one_way_return_pct?: number;
    night_charge_pct?: number;
    night_start?: string;
    night_end?: string;
    outstation_allowance_per_day?: number;
    is_hotspot: boolean;
    hotspot_id?: string | null;
    multiplier?: number | null;
  }): Promise<PricingFareRule> {
    const result = await query(
      `INSERT INTO price_and_fare_rules
        (district_id, area_id, one_way_return_pct, night_charge_pct, night_start, night_end,
         outstation_allowance_per_day, is_hotspot, hotspot_id, multiplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, district_id, area_id, one_way_return_pct, night_charge_pct, night_start, night_end,
                 outstation_allowance_per_day, is_hotspot, hotspot_id, multiplier`,
      [
        data.district_id,
        data.area_id || null,
        data.one_way_return_pct ?? 0,
        data.night_charge_pct ?? 0,
        data.night_start ?? '22:00:00',
        data.night_end ?? '06:00:00',
        data.outstation_allowance_per_day ?? 0,
        data.is_hotspot,
        data.hotspot_id || null,
        data.multiplier || null,
      ]
    );
    return result.rows[0];
  },

  async updatePricingFareRule(
    id: string,
    data: {
      district_id?: string;
      area_id?: string | null;
      one_way_return_pct?: number;
      night_charge_pct?: number;
      night_start?: string;
      night_end?: string;
      outstation_allowance_per_day?: number;
      is_hotspot?: boolean;
      hotspot_id?: string | null;
      multiplier?: number | null;
    }
  ): Promise<PricingFareRule> {
    const fields: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;
    const set = (col: string, val: any) => {
      fields.push(`${col} = $${paramIndex}`);
      params.push(val);
      paramIndex++;
    };

    if (data.district_id !== undefined) set('district_id', data.district_id);
    if (data.area_id !== undefined) set('area_id', data.area_id);
    if (data.one_way_return_pct !== undefined) set('one_way_return_pct', data.one_way_return_pct);
    if (data.night_charge_pct !== undefined) set('night_charge_pct', data.night_charge_pct);
    if (data.night_start !== undefined) set('night_start', data.night_start);
    if (data.night_end !== undefined) set('night_end', data.night_end);
    if (data.outstation_allowance_per_day !== undefined)
      set('outstation_allowance_per_day', data.outstation_allowance_per_day);
    if (data.is_hotspot !== undefined) set('is_hotspot', data.is_hotspot);
    if (data.hotspot_id !== undefined) set('hotspot_id', data.hotspot_id);
    if (data.multiplier !== undefined) set('multiplier', data.multiplier);

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const result = await query(
      `UPDATE price_and_fare_rules SET ${fields.join(', ')} WHERE id = $1
       RETURNING id, district_id, area_id, one_way_return_pct, night_charge_pct, night_start, night_end,
                 outstation_allowance_per_day, is_hotspot, hotspot_id, multiplier`,
      params
    );
    return result.rows[0];
  },

  async deletePricingFareRule(id: string): Promise<void> {
    const result = await query('DELETE FROM price_and_fare_rules WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      throw { statusCode: 404, message: 'Pricing fare rule not found' };
    }
  },

  async checkDuplicateArea(
    district_id: string,
    area_id: string | null,
    excludeId?: string
  ): Promise<boolean> {
    let query_text: string;
    const params: any[] = [district_id];
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
