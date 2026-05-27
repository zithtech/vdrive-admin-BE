/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  // Create roles table
  pgm.createTable(
    'roles',
    {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      name: {
        type: 'varchar(50)',
        notNull: true,
        unique: true,
      },
      description: {
        type: 'text',
      },
      created_at: {
        type: 'timestamp with time zone',
        notNull: true,
        default: pgm.func('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: 'timestamp with time zone',
        notNull: true,
        default: pgm.func('CURRENT_TIMESTAMP'),
      },
    },
    { ifNotExists: true }
  );

  // Create permissions table
  pgm.createTable(
    'permissions',
    {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      module: {
        type: 'varchar(50)',
        notNull: true,
      },
      action: {
        type: 'varchar(50)',
        notNull: true,
      },
      description: {
        type: 'text',
      },
      created_at: {
        type: 'timestamp with time zone',
        notNull: true,
        default: pgm.func('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: 'timestamp with time zone',
        notNull: true,
        default: pgm.func('CURRENT_TIMESTAMP'),
      },
    },
    { ifNotExists: true }
  );

  // Add unique constraint for module and action
  pgm.addConstraint('permissions', 'unique_module_action', {
    unique: ['module', 'action'],
  });

  // Create role_permissions junction table
  pgm.createTable(
    'role_permissions',
    {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      role_id: {
        type: 'uuid',
        notNull: true,
        references: 'roles(id)',
        onDelete: 'CASCADE',
      },
      permission_id: {
        type: 'uuid',
        notNull: true,
        references: 'permissions(id)',
        onDelete: 'CASCADE',
      },
      created_at: {
        type: 'timestamp with time zone',
        notNull: true,
        default: pgm.func('CURRENT_TIMESTAMP'),
      },
    },
    { ifNotExists: true }
  );

  // Add unique constraint for role_id and permission_id
  pgm.addConstraint('role_permissions', 'unique_role_permission', {
    unique: ['role_id', 'permission_id'],
  });

  // Modify admin_users table to link with roles
  pgm.addColumn('admin_users', {
    role_id: {
      type: 'uuid',
      references: 'roles(id)',
      onDelete: 'SET NULL',
    },
  });

  // Create indexes for optimization
  pgm.createIndex('permissions', 'module');
  pgm.createIndex('role_permissions', 'role_id');
  pgm.createIndex('admin_users', 'role_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  // Drop indexes
  pgm.dropIndex('admin_users', 'role_id', { ifExists: true });
  pgm.dropIndex('role_permissions', 'role_id', { ifExists: true });
  pgm.dropIndex('permissions', 'module', { ifExists: true });

  // Drop role_id column from admin_users
  pgm.dropColumn('admin_users', 'role_id', { ifExists: true });

  // Drop tables
  pgm.dropTable('role_permissions', { ifExists: true });
  pgm.dropTable('permissions', { ifExists: true });
  pgm.dropTable('roles', { ifExists: true });
};
