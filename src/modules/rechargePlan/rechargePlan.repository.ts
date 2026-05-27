
import { query } from '../../shared/database';

export const RechargePlanRepository = {

 
  async getPlans(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const plans = await query(
      `SELECT * FROM recharge_plans 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalRes = await query(
      `SELECT COUNT(*) AS total FROM recharge_plans`
    );

    return {
      data: plans.rows,
      total: Number(totalRes.rows[0].total),
    };
  },

  
  async getById(id: number) {
    const res = await query(
      `SELECT * FROM recharge_plans WHERE id=$1`,
      [id]
    );
    return res.rows[0];
  },

 
  async create(data: any) {
    const res = await query(
      `INSERT INTO recharge_plans 
       (plan_name, description, validity_days, daily_price, weekly_price, monthly_price, features, is_active, tag, price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        data.planName,
        data.description,
        data.validityDays,
        data.dailyPrice ?? 0,
        data.weeklyPrice ?? 0,
        data.monthlyPrice ?? 0,
        JSON.stringify(data.features ?? []),
        data.isActive ?? true,
        data.tag || null,
        data.monthlyPrice ?? 0,
      ]
    );
    return res.rows[0];
  },


  async update(id: number, data: any) {
    const res = await query(
      `UPDATE recharge_plans
       SET plan_name = $1,
           description = $2,
           validity_days = $3,
           daily_price = $4,
           weekly_price = $5,
           monthly_price = $6,
           features = $7,
           is_active = $8,
           tag = $9,
           price = $10
       WHERE id = $11 RETURNING *`,
      [
        data.planName,
        data.description,
        data.validityDays,
        data.dailyPrice,
        data.weeklyPrice,
        data.monthlyPrice,
        JSON.stringify(data.features || []),
        data.isActive,
        data.tag || null,
        data.monthlyPrice ?? 0,
        id,
      ]
    );
    return res.rows[0];
  },


  
  async toggle(id: number, status: boolean) {
    const res = await query(
      `UPDATE recharge_plans 
       SET is_active=$1 
       WHERE id=$2 
       RETURNING *`,
      [status, id]
    );
    return res.rows[0];
  },

  async getActiveSubscriptions() {
    const res = await query(
      `SELECT 
        ds.id, 
        d.id as driver_id,
        d.full_name as driver_name, 
        d.phone_number as driver_phone, 
        rp.plan_name, 
        ds.billing_cycle, 
        ds.start_date, 
        ds.expiry_date,
        CASE 
          WHEN ds.billing_cycle IN ('DAILY', 'day') THEN rp.daily_price
          WHEN ds.billing_cycle IN ('WEEKLY', 'week') THEN rp.weekly_price
          WHEN ds.billing_cycle IN ('MONTHLY', 'month') THEN rp.monthly_price
          ELSE 0
        END as amount_paid
       FROM driver_subscriptions ds
       JOIN drivers d ON ds.driver_id = d.id
       JOIN recharge_plans rp ON ds.plan_id = rp.id
       WHERE ds.status = 'active'
       ORDER BY ds.start_date DESC`
    );
    return res.rows;
  },

  async getDriverActiveSubscription(driverId: string) {
    const res = await query(
      `SELECT 
        ds.id, 
        ds.driver_id, 
        d.full_name as driver_name, 
        d.phone_number as driver_phone,
        rp.plan_name, 
        ds.billing_cycle, 
        ds.start_date, 
        ds.expiry_date,
        (ds.expiry_date::date - CURRENT_DATE) as days_left
       FROM driver_subscriptions ds
       JOIN drivers d ON ds.driver_id = d.id
       JOIN recharge_plans rp ON ds.plan_id = rp.id
       WHERE ds.driver_id = $1 AND ds.status = 'active'
       LIMIT 1`,
      [driverId]
    );
    return res.rows[0];
  },

  async getSubscriptionStats() {
    const today = 'CURRENT_DATE';
    const week = "CURRENT_DATE - INTERVAL '7 days'";
    const month = "CURRENT_DATE - INTERVAL '30 days'";

    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE start_date >= ${today} AND status = 'active') as today_count,
        SUM(CASE 
          WHEN billing_cycle IN ('DAILY', 'day') THEN rp.daily_price
          WHEN billing_cycle IN ('WEEKLY', 'week') THEN rp.weekly_price
          WHEN billing_cycle IN ('MONTHLY', 'month') THEN rp.monthly_price
          ELSE 0
        END) FILTER (WHERE start_date >= ${today} AND status = 'active') as today_amount,
        
        COUNT(*) FILTER (WHERE start_date >= ${week} AND status = 'active') as week_count,
        SUM(CASE 
          WHEN billing_cycle IN ('DAILY', 'day') THEN rp.daily_price
          WHEN billing_cycle IN ('WEEKLY', 'week') THEN rp.weekly_price
          WHEN billing_cycle IN ('MONTHLY', 'month') THEN rp.monthly_price
          ELSE 0
        END) FILTER (WHERE start_date >= ${week} AND status = 'active') as week_amount,
        
        COUNT(*) FILTER (WHERE start_date >= ${month} AND status = 'active') as month_count,
        SUM(CASE 
          WHEN billing_cycle IN ('DAILY', 'day') THEN rp.daily_price
          WHEN billing_cycle IN ('WEEKLY', 'week') THEN rp.weekly_price
          WHEN billing_cycle IN ('MONTHLY', 'month') THEN rp.monthly_price
          ELSE 0
        END) FILTER (WHERE start_date >= ${month} AND status = 'active') as month_amount,

        COUNT(*) as lifetime_count,
        SUM(CASE 
          WHEN billing_cycle IN ('DAILY', 'day') THEN rp.daily_price
          WHEN billing_cycle IN ('WEEKLY', 'week') THEN rp.weekly_price
          WHEN billing_cycle IN ('MONTHLY', 'month') THEN rp.monthly_price
          ELSE 0
        END) as lifetime_amount
      FROM driver_subscriptions ds
      JOIN recharge_plans rp ON ds.plan_id = rp.id
    `;

    const res = await query(statsQuery);
    return res.rows[0];
  },

  async getDriverSubscriptionHistory(driverId: string) {
    const historyQuery = `
      SELECT 
        ds.id,
        rp.plan_name,
        ds.billing_cycle,
        ds.start_date,
        ds.expiry_date,
        ds.status,
        CASE 
          WHEN ds.billing_cycle IN ('DAILY', 'day') THEN rp.daily_price
          WHEN ds.billing_cycle IN ('WEEKLY', 'week') THEN rp.weekly_price
          WHEN ds.billing_cycle IN ('MONTHLY', 'month') THEN rp.monthly_price
          ELSE 0
        END as amount
      FROM driver_subscriptions ds
      JOIN recharge_plans rp ON ds.plan_id = rp.id
      WHERE ds.driver_id = $1
      ORDER BY ds.start_date DESC
    `;

    const res = await query(historyQuery, [driverId]);
    
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_subscriptions,
        SUM(CASE 
          WHEN billing_cycle IN ('DAILY', 'day') THEN rp.daily_price
          WHEN billing_cycle IN ('WEEKLY', 'week') THEN rp.weekly_price
          WHEN billing_cycle IN ('MONTHLY', 'month') THEN rp.monthly_price
          ELSE 0
        END) as total_spent
      FROM driver_subscriptions ds
      JOIN recharge_plans rp ON ds.plan_id = rp.id
      WHERE ds.driver_id = $1
    `;

    const summaryRes = await query(summaryQuery, [driverId]);

    return {
      history: res.rows,
      summary: summaryRes.rows[0]
    };
  },

  async delete(id: number) {
    await query(
      `DELETE FROM recharge_plans WHERE id=$1`,
      [id]
    );
  },

  async recordHistory(data: {
    planId: number;
    adminId: string;
    action: string;
    previousData: any;
    newData: any;
  }) {
    await query(
      `INSERT INTO recharge_plan_history (plan_id, admin_id, action, previous_data, new_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        data.planId,
        data.adminId,
        data.action,
        data.previousData ? JSON.stringify(data.previousData) : null,
        data.newData ? JSON.stringify(data.newData) : null,
      ]
    );
  },

  async getHistory(planId: number) {
    const res = await query(
      `SELECT h.*, a.name as admin_name 
       FROM recharge_plan_history h
       LEFT JOIN admin_users a ON h.admin_id = a.id
       WHERE h.plan_id = $1
       ORDER BY h.created_at DESC`,
      [planId]
    );
    return res.rows;
  },

  async getExpiringDrivers(hours: number = 24) {
    const res = await query(
      `SELECT 
        ds.driver_id,
        d.full_name as driver_name,
        ds.expiry_date,
        rp.plan_name
       FROM driver_subscriptions ds
       JOIN drivers d ON ds.driver_id = d.id
       JOIN recharge_plans rp ON ds.plan_id = rp.id
       WHERE ds.status = 'active'
       AND ds.expiry_date > NOW()
       AND ds.expiry_date <= NOW() + INTERVAL '1 hour' * $1`,
      [hours]
    );
    return res.rows;
  },

  async getAllActiveSubscribersDetailed() {
    const res = await query(
      `SELECT 
        ds.driver_id,
        d.full_name as driver_name,
        ds.expiry_date,
        rp.plan_name,
        (ds.expiry_date::date - CURRENT_DATE) as days_left
       FROM driver_subscriptions ds
       JOIN drivers d ON ds.driver_id = d.id
       JOIN recharge_plans rp ON ds.plan_id = rp.id
       WHERE ds.status = 'active' OR (ds.status = 'expired' AND ds.expiry_date >= CURRENT_DATE - INTERVAL '1 day')
       ORDER BY ds.expiry_date ASC`
    );
    return res.rows;
  },
};
