import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase, query } from '../shared/database';
import { logger } from '../shared/logger';

dotenv.config();

const plans = [
  {
    plan_name: 'Basic Plan',
    description:
      'Entry-level plan for drivers who want to operate within their local city with zero commission.',
    ride_limit: 100, // Placeholder
    validity_days: 30, // Placeholder
    price: 0,
    daily_price: 0,
    weekly_price: 0,
    monthly_price: 0,
    features: [
      'Zero commission on all rides',
      'Access to local city rides only',
      'Accept instant ride requests',
      'Basic customer support',
      'Scheduled rides not available',
    ],
    is_active: true,
  },
  {
    plan_name: 'Elite Plan',
    description:
      'Advanced plan for drivers who want more ride options and higher earning opportunities.',
    ride_limit: 500, // Placeholder
    validity_days: 30, // Placeholder
    price: 0,
    daily_price: 0,
    weekly_price: 0,
    monthly_price: 0,
    features: [
      'Zero commission on all rides',
      'Access to all available ride types',
      'Scheduled rides enabled (only for weekly and monthly plans)',
      'Outstation trips enabled',
      'One-way trips enabled',
      'Priority ride matching',
    ],
    is_active: true,
  },
  {
    plan_name: 'Premium Plan',
    description:
      'Full-featured plan designed for high-performing drivers with maximum ride access and priority support.',
    ride_limit: 1000, // Placeholder
    validity_days: 30, // Placeholder
    price: 0,
    daily_price: 0,
    weekly_price: 0,
    monthly_price: 0,
    features: [
      'Zero commission on all rides',
      'Access to all available ride types',
      'Scheduled rides enabled (only for weekly and monthly plans)',
      'All ride categories enabled: Local rides, Outstation trips, One-way trips, Round trips',
      'Priority ride matching',
      '24/7 priority support',
    ],
    is_active: true,
  },
];

async function seed() {
  try {
    await connectDatabase();
    logger.info('Seeding plans...');

    for (const plan of plans) {
      await query(
        `INSERT INTO recharge_plans 
         (plan_name, description, ride_limit, validity_days, price, daily_price, weekly_price, monthly_price, features, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          plan.plan_name,
          plan.description,
          plan.ride_limit,
          plan.validity_days,
          plan.price,
          plan.daily_price,
          plan.weekly_price,
          plan.monthly_price,
          JSON.stringify(plan.features),
          plan.is_active,
        ]
      );
      logger.info(`- Seeded: ${plan.plan_name}`);
    }

    logger.info('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
