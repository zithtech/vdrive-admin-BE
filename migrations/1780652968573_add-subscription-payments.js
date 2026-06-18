/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('subscription_payments', {
    id: { type: 'uuid', default: pgm.func('gen_random_uuid()'), primaryKey: true },
    driver_id: { type: 'uuid', references: '"drivers"', onDelete: 'CASCADE', notNull: true },
    subscription_id: { type: 'integer', references: '"driver_subscriptions"', onDelete: 'CASCADE', notNull: false },
    plan_id: { type: 'integer', references: '"recharge_plans"', onDelete: 'CASCADE', notNull: true },
    amount: { type: 'numeric(10,2)', notNull: true },
    payment_status: { type: 'varchar(50)', notNull: true, default: 'SUCCESS' },
    payment_method: { type: 'varchar(50)', notNull: true, default: 'ONLINE' },
    transaction_id: { type: 'varchar(255)', notNull: false },
    receipt_url: { type: 'varchar(500)', notNull: false },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('subscription_payments', 'driver_id');
  pgm.createIndex('subscription_payments', 'payment_status');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('subscription_payments');
};
