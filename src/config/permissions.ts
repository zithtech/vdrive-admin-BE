/**
 * vDrive Admin Permission System Seed File
 * ─────────────────────────────────────────────────────────────────
 * Defines all permissions, modules, roles, and default role-permission
 * mappings for the vDrive Admin application.
 *
 * This file is the single source of truth for:
 * 1. All available permissions (resource.action format)
 * 2. System modules and their permission groups
 * 3. Default system roles (super_admin, admin, user)
 * 4. Default permission assignments per role
 */

// ═══════════════════════════════════════════════════════════════════
// SECTION 1: PERMISSION DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * All named permissions in the vDrive system.
 * Format: "resource.action"
 *
 * These constants are the single source of truth.
 * Every permission check in the backend MUST use these — no magic strings.
 */
export const VDrivePermissions = {
  // ─── Dashboard ────────────────────────────────────────────────────
  DASHBOARD_READ: 'dashboard.read',
  DASHBOARD_MANAGE: 'dashboard.manage', // widget configuration, custom reports

  // ─── Customers ────────────────────────────────────────────────────
  CUSTOMER_CREATE: 'customer.create',
  CUSTOMER_READ: 'customer.read',
  CUSTOMER_UPDATE: 'customer.update',
  CUSTOMER_DELETE: 'customer.delete',
  CUSTOMER_MANAGE: 'customer.manage', // bulk imports, customer segmentation, custom fields

  // ─── Drivers ───────────────────────────────────────────────────────
  DRIVER_CREATE: 'driver.create',
  DRIVER_READ: 'driver.read',
  DRIVER_UPDATE: 'driver.update',
  DRIVER_DELETE: 'driver.delete',
  DRIVER_VERIFY: 'driver.verify', // document verification, approval workflows
  DRIVER_MANAGE: 'driver.manage', // background checks, commission settings, blacklist

  // ─── Admins / Users ───────────────────────────────────────────────
  ADMIN_CREATE: 'admin.create',
  ADMIN_READ: 'admin.read',
  ADMIN_UPDATE: 'admin.update',
  ADMIN_DELETE: 'admin.delete',
  ADMIN_MANAGE: 'admin.manage', // role assignment, permission delegation

  // ─── Pricing & Fare Rules ─────────────────────────────────────────
  PRICING_CREATE: 'pricing.create',
  PRICING_READ: 'pricing.read',
  PRICING_UPDATE: 'pricing.update',
  PRICING_DELETE: 'pricing.delete',
  PRICING_MANAGE: 'pricing.manage', // surge pricing, dynamic rates, algorithm settings

  // ─── Deductions ───────────────────────────────────────────────────
  DEDUCTION_CREATE: 'deduction.create',
  DEDUCTION_READ: 'deduction.read',
  DEDUCTION_UPDATE: 'deduction.update',
  DEDUCTION_DELETE: 'deduction.delete',
  DEDUCTION_MANAGE: 'deduction.manage', // policy settings, bulk deductions, approval workflows

  // ─── Recharge / Payments ──────────────────────────────────────────
  RECHARGE_CREATE: 'recharge.create',
  RECHARGE_READ: 'recharge.read',
  RECHARGE_UPDATE: 'recharge.update',
  RECHARGE_DELETE: 'recharge.delete',
  RECHARGE_MANAGE: 'recharge.manage', // payment gateway settings, refund policies, wallets

  // ─── Taxes ────────────────────────────────────────────────────────
  TAX_CREATE: 'tax.create',
  TAX_READ: 'tax.read',
  TAX_UPDATE: 'tax.update',
  TAX_DELETE: 'tax.delete',
  TAX_MANAGE: 'tax.manage', // tax brackets, exemptions, compliance reporting

  // ─── Coupons / Promotions ─────────────────────────────────────────
  COUPON_CREATE: 'coupon.create',
  COUPON_READ: 'coupon.read',
  COUPON_UPDATE: 'coupon.update',
  COUPON_DELETE: 'coupon.delete',
  COUPON_MANAGE: 'coupon.manage', // campaign rules, redemption limits, analytics

  // ─── Notifications ────────────────────────────────────────────────
  NOTIFICATION_CREATE: 'notification.create',
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_UPDATE: 'notification.update',
  NOTIFICATION_DELETE: 'notification.delete',
  NOTIFICATION_MANAGE: 'notification.manage', // notification templates, channels, scheduling

  // ─── Settings / System ────────────────────────────────────────────
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',
  SETTINGS_MANAGE: 'settings.manage', // system configuration, branding, integrations

  // ─── Roles & Permissions (RBAC Management) ────────────────────────
  ROLE_CREATE: 'role.create',
  ROLE_READ: 'role.read',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  ROLE_ASSIGN: 'role.assign', // assign/remove roles from users

  // ─── Reports & Analytics ─────────────────────────────────────────
  REPORT_READ: 'report.read',
  REPORT_MANAGE: 'report.manage', // custom report creation, scheduled exports

  // ─── Audit & Logs ────────────────────────────────────────────────
  AUDIT_LOG_READ: 'audit_log.read',
  AUDIT_LOG_MANAGE: 'audit_log.manage', // retention, export, sensitive data redaction

  // ─── Support Tickets ─────────────────────────────────────────────
  SUPPORT_TICKET_CREATE: 'support_ticket.create',
  SUPPORT_TICKET_READ: 'support_ticket.read',
  SUPPORT_TICKET_UPDATE: 'support_ticket.update',
  SUPPORT_TICKET_DELETE: 'support_ticket.delete',
  SUPPORT_TICKET_MANAGE: 'support_ticket.manage',

  // ─── Trips ───────────────────────────────────────────────────────
  TRIP_CREATE: 'trips.create',
  TRIP_READ: 'trips.read',
  TRIP_UPDATE: 'trips.update',
  TRIP_DELETE: 'trips.delete',

  // ─── Trip Transactions ───────────────────────────────────────────
  TRIP_TRANSACTION_CREATE: 'trip_transaction.create',
  TRIP_TRANSACTION_READ: 'trip_transaction.read',
  TRIP_TRANSACTION_UPDATE: 'trip_transaction.update',
  TRIP_TRANSACTION_DELETE: 'trip_transaction.delete',

  // ─── Promos ──────────────────────────────────────────────────────
  PROMO_CREATE: 'promos.create',
  PROMO_READ: 'promos.read',
  PROMO_UPDATE: 'promos.update',
  PROMO_DELETE: 'promos.delete',

  // ─── Referrals ───────────────────────────────────────────────────
  USER_REFERRAL_CREATE: 'user_referrals.create',
  USER_REFERRAL_READ: 'user_referrals.read',
  USER_REFERRAL_UPDATE: 'user_referrals.update',
  USER_REFERRAL_DELETE: 'user_referrals.delete',
  DRIVER_REFERRAL_CREATE: 'driver_referrals.create',
  DRIVER_REFERRAL_READ: 'driver_referrals.read',
  DRIVER_REFERRAL_UPDATE: 'driver_referrals.update',
  DRIVER_REFERRAL_DELETE: 'driver_referrals.delete',

  // ─── Driver Outreach ─────────────────────────────────────────────
  DRIVER_OUTREACH_CREATE: 'drivers_outreach.create',
  DRIVER_OUTREACH_READ: 'drivers_outreach.read',
  DRIVER_OUTREACH_UPDATE: 'drivers_outreach.update',
  DRIVER_OUTREACH_DELETE: 'drivers_outreach.delete',
} as const;

export type VDrivePermission = (typeof VDrivePermissions)[keyof typeof VDrivePermissions];

// ═══════════════════════════════════════════════════════════════════
// SECTION 2: MODULE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * System modules grouped with their associated permissions.
 * Used for:
 * - UI module filtering (sidebar, navigation)
 * - Route protection (ModuleProtectedRoute)
 * - Permission picker in role management UI
 */
export const VDRIVE_MODULES = {
  dashboard: {
    label: 'Dashboard',
    icon: 'home',
    permissions: [VDrivePermissions.DASHBOARD_READ, VDrivePermissions.DASHBOARD_MANAGE],
  },
  customers: {
    label: 'Customers',
    icon: 'users',
    permissions: [
      VDrivePermissions.CUSTOMER_CREATE,
      VDrivePermissions.CUSTOMER_READ,
      VDrivePermissions.CUSTOMER_UPDATE,
      VDrivePermissions.CUSTOMER_DELETE,
      VDrivePermissions.CUSTOMER_MANAGE,
    ],
  },
  drivers: {
    label: 'Drivers',
    icon: 'steering-wheel',
    permissions: [
      VDrivePermissions.DRIVER_CREATE,
      VDrivePermissions.DRIVER_READ,
      VDrivePermissions.DRIVER_UPDATE,
      VDrivePermissions.DRIVER_DELETE,
      VDrivePermissions.DRIVER_VERIFY,
      VDrivePermissions.DRIVER_MANAGE,
    ],
  },
  admins: {
    label: 'Admins & Users',
    icon: 'shield-admin',
    permissions: [
      VDrivePermissions.ADMIN_CREATE,
      VDrivePermissions.ADMIN_READ,
      VDrivePermissions.ADMIN_UPDATE,
      VDrivePermissions.ADMIN_DELETE,
      VDrivePermissions.ADMIN_MANAGE,
    ],
  },
  pricing: {
    label: 'Pricing & Fare Rules',
    icon: 'currency-dollar',
    permissions: [
      VDrivePermissions.PRICING_CREATE,
      VDrivePermissions.PRICING_READ,
      VDrivePermissions.PRICING_UPDATE,
      VDrivePermissions.PRICING_DELETE,
      VDrivePermissions.PRICING_MANAGE,
    ],
  },
  deductions: {
    label: 'Deductions',
    icon: 'minus-circle',
    permissions: [
      VDrivePermissions.DEDUCTION_CREATE,
      VDrivePermissions.DEDUCTION_READ,
      VDrivePermissions.DEDUCTION_UPDATE,
      VDrivePermissions.DEDUCTION_DELETE,
      VDrivePermissions.DEDUCTION_MANAGE,
    ],
  },
  recharge: {
    label: 'Recharge & Payments',
    icon: 'credit-card',
    permissions: [
      VDrivePermissions.RECHARGE_CREATE,
      VDrivePermissions.RECHARGE_READ,
      VDrivePermissions.RECHARGE_UPDATE,
      VDrivePermissions.RECHARGE_DELETE,
      VDrivePermissions.RECHARGE_MANAGE,
    ],
  },
  taxes: {
    label: 'Taxes',
    icon: 'receipt',
    permissions: [
      VDrivePermissions.TAX_CREATE,
      VDrivePermissions.TAX_READ,
      VDrivePermissions.TAX_UPDATE,
      VDrivePermissions.TAX_DELETE,
      VDrivePermissions.TAX_MANAGE,
    ],
  },
  coupons: {
    label: 'Coupons & Promotions',
    icon: 'ticket',
    permissions: [
      VDrivePermissions.COUPON_CREATE,
      VDrivePermissions.COUPON_READ,
      VDrivePermissions.COUPON_UPDATE,
      VDrivePermissions.COUPON_DELETE,
      VDrivePermissions.COUPON_MANAGE,
    ],
  },
  notifications: {
    label: 'Notifications',
    icon: 'bell',
    permissions: [
      VDrivePermissions.NOTIFICATION_CREATE,
      VDrivePermissions.NOTIFICATION_READ,
      VDrivePermissions.NOTIFICATION_UPDATE,
      VDrivePermissions.NOTIFICATION_DELETE,
      VDrivePermissions.NOTIFICATION_MANAGE,
    ],
  },
  // settings: {
  //   label: 'Settings',
  //   icon: 'settings',
  //   permissions: [
  //     VDrivePermissions.SETTINGS_READ,
  //     VDrivePermissions.SETTINGS_UPDATE,
  //     VDrivePermissions.SETTINGS_MANAGE,
  //   ],
  // },
  roles: {
    label: 'Roles & Permissions',
    icon: 'shield-check',
    permissions: [
      VDrivePermissions.ROLE_CREATE,
      VDrivePermissions.ROLE_READ,
      VDrivePermissions.ROLE_UPDATE,
      VDrivePermissions.ROLE_DELETE,
      VDrivePermissions.ROLE_ASSIGN,
    ],
  },
  support_tickets: {
    label: 'Support Tickets',
    icon: 'support',
    permissions: [
      VDrivePermissions.SUPPORT_TICKET_CREATE,
      VDrivePermissions.SUPPORT_TICKET_READ,
      VDrivePermissions.SUPPORT_TICKET_UPDATE,
      VDrivePermissions.SUPPORT_TICKET_DELETE,
      VDrivePermissions.SUPPORT_TICKET_MANAGE,
    ],
  },
  trips: {
    label: 'Trips',
    icon: 'map-pin',
    permissions: [
      VDrivePermissions.TRIP_CREATE,
      VDrivePermissions.TRIP_READ,
      VDrivePermissions.TRIP_UPDATE,
      VDrivePermissions.TRIP_DELETE,
    ],
  },
  trip_transaction: {
    label: 'Trip Transactions',
    icon: 'receipt',
    permissions: [
      VDrivePermissions.TRIP_TRANSACTION_CREATE,
      VDrivePermissions.TRIP_TRANSACTION_READ,
      VDrivePermissions.TRIP_TRANSACTION_UPDATE,
      VDrivePermissions.TRIP_TRANSACTION_DELETE,
    ],
  },
  promos: {
    label: 'Promos',
    icon: 'ticket',
    permissions: [
      VDrivePermissions.PROMO_CREATE,
      VDrivePermissions.PROMO_READ,
      VDrivePermissions.PROMO_UPDATE,
      VDrivePermissions.PROMO_DELETE,
    ],
  },
  user_referrals: {
    label: 'User Referrals',
    icon: 'users',
    permissions: [
      VDrivePermissions.USER_REFERRAL_CREATE,
      VDrivePermissions.USER_REFERRAL_READ,
      VDrivePermissions.USER_REFERRAL_UPDATE,
      VDrivePermissions.USER_REFERRAL_DELETE,
    ],
  },
  driver_referrals: {
    label: 'Driver Referrals',
    icon: 'users',
    permissions: [
      VDrivePermissions.DRIVER_REFERRAL_CREATE,
      VDrivePermissions.DRIVER_REFERRAL_READ,
      VDrivePermissions.DRIVER_REFERRAL_UPDATE,
      VDrivePermissions.DRIVER_REFERRAL_DELETE,
    ],
  },
  drivers_outreach: {
    label: 'Driver Outreach',
    icon: 'steering-wheel',
    permissions: [
      VDrivePermissions.DRIVER_OUTREACH_CREATE,
      VDrivePermissions.DRIVER_OUTREACH_READ,
      VDrivePermissions.DRIVER_OUTREACH_UPDATE,
      VDrivePermissions.DRIVER_OUTREACH_DELETE,
    ],
  },
  // reports: {
  //   label: 'Reports & Analytics',
  //   icon: 'chart-bar',
  //   permissions: [VDrivePermissions.REPORT_READ, VDrivePermissions.REPORT_MANAGE],
  // },
  // audit: {
  //   label: 'Audit & Logs',
  //   icon: 'history',
  //   permissions: [VDrivePermissions.AUDIT_LOG_READ, VDrivePermissions.AUDIT_LOG_MANAGE],
  // },
} as const;

export type VDriveModuleKey = keyof typeof VDRIVE_MODULES;

// ═══════════════════════════════════════════════════════════════════
// SECTION 3: PERMISSION GROUPING BY RESOURCE (for UI)
// ═══════════════════════════════════════════════════════════════════

/**
 * Flat list of all permissions grouped by resource/module.
 * Used for rendering permission picker in role management UI.
 */
export const VDRIVE_PERMISSIONS_BY_RESOURCE: Record<string, VDrivePermission[]> = {
  dashboard: [VDrivePermissions.DASHBOARD_READ, VDrivePermissions.DASHBOARD_MANAGE],
  customers: [
    VDrivePermissions.CUSTOMER_CREATE,
    VDrivePermissions.CUSTOMER_READ,
    VDrivePermissions.CUSTOMER_UPDATE,
    VDrivePermissions.CUSTOMER_DELETE,
    VDrivePermissions.CUSTOMER_MANAGE,
  ],
  drivers: [
    VDrivePermissions.DRIVER_CREATE,
    VDrivePermissions.DRIVER_READ,
    VDrivePermissions.DRIVER_UPDATE,
    VDrivePermissions.DRIVER_DELETE,
    VDrivePermissions.DRIVER_VERIFY,
    VDrivePermissions.DRIVER_MANAGE,
  ],
  admins: [
    VDrivePermissions.ADMIN_CREATE,
    VDrivePermissions.ADMIN_READ,
    VDrivePermissions.ADMIN_UPDATE,
    VDrivePermissions.ADMIN_DELETE,
    VDrivePermissions.ADMIN_MANAGE,
  ],
  pricing: [
    VDrivePermissions.PRICING_CREATE,
    VDrivePermissions.PRICING_READ,
    VDrivePermissions.PRICING_UPDATE,
    VDrivePermissions.PRICING_DELETE,
    VDrivePermissions.PRICING_MANAGE,
  ],
  deductions: [
    VDrivePermissions.DEDUCTION_CREATE,
    VDrivePermissions.DEDUCTION_READ,
    VDrivePermissions.DEDUCTION_UPDATE,
    VDrivePermissions.DEDUCTION_DELETE,
    VDrivePermissions.DEDUCTION_MANAGE,
  ],
  recharge: [
    VDrivePermissions.RECHARGE_CREATE,
    VDrivePermissions.RECHARGE_READ,
    VDrivePermissions.RECHARGE_UPDATE,
    VDrivePermissions.RECHARGE_DELETE,
    VDrivePermissions.RECHARGE_MANAGE,
  ],
  taxes: [
    VDrivePermissions.TAX_CREATE,
    VDrivePermissions.TAX_READ,
    VDrivePermissions.TAX_UPDATE,
    VDrivePermissions.TAX_DELETE,
    VDrivePermissions.TAX_MANAGE,
  ],
  coupons: [
    VDrivePermissions.COUPON_CREATE,
    VDrivePermissions.COUPON_READ,
    VDrivePermissions.COUPON_UPDATE,
    VDrivePermissions.COUPON_DELETE,
    VDrivePermissions.COUPON_MANAGE,
  ],
  notifications: [
    VDrivePermissions.NOTIFICATION_CREATE,
    VDrivePermissions.NOTIFICATION_READ,
    VDrivePermissions.NOTIFICATION_UPDATE,
    VDrivePermissions.NOTIFICATION_DELETE,
    VDrivePermissions.NOTIFICATION_MANAGE,
  ],
  settings: [
    VDrivePermissions.SETTINGS_READ,
    VDrivePermissions.SETTINGS_UPDATE,
    VDrivePermissions.SETTINGS_MANAGE,
  ],
  roles: [
    VDrivePermissions.ROLE_CREATE,
    VDrivePermissions.ROLE_READ,
    VDrivePermissions.ROLE_UPDATE,
    VDrivePermissions.ROLE_DELETE,
    VDrivePermissions.ROLE_ASSIGN,
  ],
  reports: [VDrivePermissions.REPORT_READ, VDrivePermissions.REPORT_MANAGE],
  audit: [VDrivePermissions.AUDIT_LOG_READ, VDrivePermissions.AUDIT_LOG_MANAGE],
  support_tickets: [
    VDrivePermissions.SUPPORT_TICKET_CREATE,
    VDrivePermissions.SUPPORT_TICKET_READ,
    VDrivePermissions.SUPPORT_TICKET_UPDATE,
    VDrivePermissions.SUPPORT_TICKET_DELETE,
    VDrivePermissions.SUPPORT_TICKET_MANAGE,
  ],
};

/** Flat list of all permissions — used for seeding and validation. */
export const ALL_VDRIVE_PERMISSIONS: VDrivePermission[] = Object.values(VDrivePermissions);

// ═══════════════════════════════════════════════════════════════════
// SECTION 4: SYSTEM ROLES
// ═══════════════════════════════════════════════════════════════════

/**
 * Default system roles.
 * Every vDrive tenant is seeded with these three roles.
 */
export const VDriveSystemRoles = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type VDriveSystemRole = (typeof VDriveSystemRoles)[keyof typeof VDriveSystemRoles];

// ═══════════════════════════════════════════════════════════════════
// SECTION 5: DEFAULT ROLE-PERMISSION MAPPINGS
// ═══════════════════════════════════════════════════════════════════

/**
 * Default permission grants for system roles.
 *
 * These mappings define what each default role can do out-of-the-box.
 * Admins can customize these in the Role Management UI.
 *
 * Super Admin: Unrestricted access (bypassed in frontend via usePermission hook)
 * Admin: Full operational access, limited system configuration
 * User: Read-only access to core data
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, VDrivePermission[]> = {
  // ─── SUPER_ADMIN ──────────────────────────────────────────────────
  // Unrestricted access to all resources.
  // Bypassed in frontend via usePermission() returning true for all checks.
  [VDriveSystemRoles.SUPER_ADMIN]: ALL_VDRIVE_PERMISSIONS,

  // ─── ADMIN ────────────────────────────────────────────────────────
  // Full operational access. Can manage most resources but not system-wide
  // roles, audit logs, or core settings.
  [VDriveSystemRoles.ADMIN]: [
    // Dashboard
    VDrivePermissions.DASHBOARD_READ,
    VDrivePermissions.DASHBOARD_MANAGE,

    // Customers
    VDrivePermissions.CUSTOMER_CREATE,
    VDrivePermissions.CUSTOMER_READ,
    VDrivePermissions.CUSTOMER_UPDATE,
    VDrivePermissions.CUSTOMER_DELETE,
    VDrivePermissions.CUSTOMER_MANAGE,

    // Drivers
    VDrivePermissions.DRIVER_CREATE,
    VDrivePermissions.DRIVER_READ,
    VDrivePermissions.DRIVER_UPDATE,
    VDrivePermissions.DRIVER_DELETE,
    VDrivePermissions.DRIVER_VERIFY,
    VDrivePermissions.DRIVER_MANAGE,

    // Pricing
    VDrivePermissions.PRICING_CREATE,
    VDrivePermissions.PRICING_READ,
    VDrivePermissions.PRICING_UPDATE,
    VDrivePermissions.PRICING_DELETE,
    VDrivePermissions.PRICING_MANAGE,

    // Deductions
    VDrivePermissions.DEDUCTION_CREATE,
    VDrivePermissions.DEDUCTION_READ,
    VDrivePermissions.DEDUCTION_UPDATE,
    VDrivePermissions.DEDUCTION_DELETE,
    VDrivePermissions.DEDUCTION_MANAGE,

    // Recharge
    VDrivePermissions.RECHARGE_CREATE,
    VDrivePermissions.RECHARGE_READ,
    VDrivePermissions.RECHARGE_UPDATE,
    VDrivePermissions.RECHARGE_DELETE,
    VDrivePermissions.RECHARGE_MANAGE,

    // Taxes
    VDrivePermissions.TAX_CREATE,
    VDrivePermissions.TAX_READ,
    VDrivePermissions.TAX_UPDATE,
    VDrivePermissions.TAX_DELETE,
    VDrivePermissions.TAX_MANAGE,

    // Coupons
    VDrivePermissions.COUPON_CREATE,
    VDrivePermissions.COUPON_READ,
    VDrivePermissions.COUPON_UPDATE,
    VDrivePermissions.COUPON_DELETE,
    VDrivePermissions.COUPON_MANAGE,

    // Notifications
    VDrivePermissions.NOTIFICATION_CREATE,
    VDrivePermissions.NOTIFICATION_READ,
    VDrivePermissions.NOTIFICATION_UPDATE,
    VDrivePermissions.NOTIFICATION_DELETE,
    VDrivePermissions.NOTIFICATION_MANAGE,

    // Reports
    VDrivePermissions.REPORT_READ,
    VDrivePermissions.REPORT_MANAGE,

    // Settings (read-only, no manage)
    VDrivePermissions.SETTINGS_READ,

    // Admins (can manage other admins but not assign roles)
    VDrivePermissions.ADMIN_READ,
    VDrivePermissions.ADMIN_CREATE,
    VDrivePermissions.ADMIN_UPDATE,
    VDrivePermissions.ADMIN_DELETE,

    // Support Tickets
    VDrivePermissions.SUPPORT_TICKET_CREATE,
    VDrivePermissions.SUPPORT_TICKET_READ,
    VDrivePermissions.SUPPORT_TICKET_UPDATE,
    VDrivePermissions.SUPPORT_TICKET_DELETE,
    VDrivePermissions.SUPPORT_TICKET_MANAGE,
  ],

  // ─── USER ────────────────────────────────────────────────────────
  // Read-only access to core data. Can view but not modify.
  // Suitable for operators, support staff, or analysts.
  user: [
    // Dashboard
    VDrivePermissions.DASHBOARD_READ,

    // Customers
    VDrivePermissions.CUSTOMER_READ,

    // Drivers
    VDrivePermissions.DRIVER_READ,

    // Pricing
    VDrivePermissions.PRICING_READ,

    // Deductions
    VDrivePermissions.DEDUCTION_READ,

    // Recharge
    VDrivePermissions.RECHARGE_READ,

    // Taxes
    VDrivePermissions.TAX_READ,

    // Coupons
    VDrivePermissions.COUPON_READ,

    // Notifications
    VDrivePermissions.NOTIFICATION_READ,

    // Reports
    VDrivePermissions.REPORT_READ,

    // Settings
    VDrivePermissions.SETTINGS_READ,

    // Support Tickets
    VDrivePermissions.SUPPORT_TICKET_READ,
  ],
};
