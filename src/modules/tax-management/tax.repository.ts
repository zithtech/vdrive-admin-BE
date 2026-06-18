import { query } from '../../shared/database';

export const TaxRepository = {
  async getTaxes(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const taxes = await query(
      `SELECT * FROM taxes 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalRes = await query(`SELECT COUNT(*) AS total FROM taxes`);

    return {
      taxes: taxes.rows,
      total: Number(totalRes.rows[0].total),
    };
  },

  async getById(id: string) {
    const res = await query(`SELECT * FROM taxes WHERE id=$1`, [id]);
    return res.rows[0];
  },

  async create(data: any) {
    const res = await query(
      `INSERT INTO taxes 
       (tax_name, tax_code, tax_type, percentage, description, is_active, is_default, indian_tax)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.tax_name,
        data.tax_code,
        data.tax_type,
        data.percentage,
        data.description || null,
        data.is_active ?? true,
        data.is_default ?? false,
        data.indian_tax || null,
      ]
    );
    return res.rows[0];
  },

  async update(id: string, data: any) {
    const res = await query(
      `UPDATE taxes
       SET tax_name=$1, tax_code=$2, tax_type=$3, percentage=$4, description=$5, is_active=$6, is_default=$7, indian_tax=$8
       WHERE id=$9 RETURNING *`,
      [
        data.tax_name,
        data.tax_code,
        data.tax_type,
        data.percentage,
        data.description || null,
        data.is_active ?? true,
        data.is_default ?? false,
        data.indian_tax || null,
        id,
      ]
    );
    return res.rows[0];
  },

  async toggle(id: string, status: boolean) {
    const res = await query(
      `UPDATE taxes 
       SET is_active=$1 
       WHERE id=$2 
       RETURNING *`,
      [status, id]
    );
    return res.rows[0];
  },

  async delete(id: string) {
    await query(`DELETE FROM taxes WHERE id=$1`, [id]);
  },

  async getActiveTaxes() {
    const res = await query(`SELECT * FROM taxes WHERE is_active = true`);
    return res.rows;
  },
};
