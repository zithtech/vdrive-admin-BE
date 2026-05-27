-- =========================================================================
-- SEED ROLES
-- =========================================================================
INSERT INTO roles (id, name, description) VALUES
('1a1a1a1a-1a1a-1a1a-1a1a-1a1a1a1a1a1a', 'super_admin', 'Full system access bypasses all checks'),
('2b2b2b2b-2b2b-2b2b-2b2b-2b2b2b2b2b2b', 'admin', 'General administrator with high level operations access'),
('3c3c3c3c-3c3c-3c3c-3c3c-3c3c3c3c3c3c', 'ops_manager', 'Operations manager focusing on fleet and driver metrics'),
('4d4d4d4d-4d4d-4d4d-4d4d-4d4d4d4d4d4d', 'finance_viewer', 'Read-only view for financial models and payouts')
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- SEED SYSTEM MODULE PERMISSIONS
-- =========================================================================
INSERT INTO permissions (module, action, description) VALUES
-- Dashboard Module
('dashboard', 'create', 'Create dashboard components/layouts'),
('dashboard', 'read', 'View dashboard metrics and summaries'),
('dashboard', 'update', 'Edit dashboard settings/configs'),
('dashboard', 'delete', 'Delete dashboard components/layouts'),

-- Customers Module
('customers', 'create', 'Create new customer records'),
('customers', 'read', 'View customer details'),
('customers', 'update', 'Edit customer attributes'),
('customers', 'delete', 'Remove customer accounts'),

-- Drivers Module
('drivers', 'create', 'Onboard and register new drivers'),
('drivers', 'read', 'View driver locations, records, and files'),
('drivers', 'update', 'Modify driver verification and statuses'),
('drivers', 'delete', 'Remove driver profiles'),

-- Drivers Outreach Module
('drivers_outreach', 'create', 'Create outreach campaigns or contacts'),
('drivers_outreach', 'read', 'View outreach records and statuses'),
('drivers_outreach', 'update', 'Modify outreach details'),
('drivers_outreach', 'delete', 'Remove outreach records'),

-- Admins Module
('admins', 'create', 'Create new administrator accounts'),
('admins', 'read', 'View administrator profiles and access levels'),
('admins', 'update', 'Modify administrator settings and assignments'),
('admins', 'delete', 'Remove administrator accounts'),

-- Pricing Module
('pricing', 'create', 'Define state/city global base fares'),
('pricing', 'read', 'View active pricing matrices'),
('pricing', 'update', 'Update multipliers and hotspot fares'),
('pricing', 'delete', 'Delete pricing fares'),

-- Deductions Module
('deductions', 'create', 'Create deduction plans and criteria'),
('deductions', 'read', 'View deduction summaries and logs'),
('deductions', 'update', 'Edit deduction amounts and policies'),
('deductions', 'delete', 'Remove deduction configurations'),

-- Recharge Module
('recharge', 'create', 'Create recharge plans and top-up models'),
('recharge', 'read', 'View recharge histories and plans'),
('recharge', 'update', 'Modify recharge plan benefits and pricing'),
('recharge', 'delete', 'Delete recharge configurations'),

-- Trips Module
('trips', 'create', 'Create new trips'),
('trips', 'read', 'View details of active and past trips'),
('trips', 'update', 'Modify trip statuses or route details'),
('trips', 'delete', 'Cancel or remove trip records'),

-- Trip Transaction Module
('trip_transaction', 'create', 'Create transactions for trips'),
('trip_transaction', 'read', 'View trip payment and invoice transactions'),
('trip_transaction', 'update', 'Modify trip transaction records'),
('trip_transaction', 'delete', 'Delete trip transaction records'),

-- Taxes Module
('taxes', 'create', 'Create tax brackets and rules'),
('taxes', 'read', 'View active tax settings and details'),
('taxes', 'update', 'Modify tax percentages and rules'),
('taxes', 'delete', 'Delete tax configurations'),

-- Coupons Module
('coupons', 'create', 'Create promo codes and coupons'),
('coupons', 'read', 'View active and expired coupons'),
('coupons', 'update', 'Modify coupon values and validity'),
('coupons', 'delete', 'Delete or disable coupons'),

-- Notifications Module
('notifications', 'create', 'Create push notifications and alerts'),
('notifications', 'read', 'View notification logs and campaigns'),
('notifications', 'update', 'Edit notification templates and triggers'),
('notifications', 'delete', 'Cancel or delete notifications'),

-- Users Module
('users', 'create', 'Create user accounts'),
('users', 'read', 'View user profiles and details'),
('users', 'update', 'Modify user profile settings and preferences'),
('users', 'delete', 'Remove user accounts'),

-- User Referrals Module
('user_referrals', 'create', 'Create referral configurations for users/customers'),
('user_referrals', 'read', 'View referral records and configurations for users/customers'),
('user_referrals', 'update', 'Modify user/customer referral setups'),
('user_referrals', 'delete', 'Remove user/customer referral configurations'),

-- Driver Referrals Module
('driver_referrals', 'create', 'Create referral configurations for drivers'),
('driver_referrals', 'read', 'View referral records and configurations for drivers'),
('driver_referrals', 'update', 'Modify driver referral setups'),
('driver_referrals', 'delete', 'Remove driver referral configurations'),

-- Promos Module
('promos', 'create', 'Create promotional campaigns and codes'),
('promos', 'read', 'View active and expired promotional campaigns'),
('promos', 'update', 'Modify promotional settings or rules'),
('promos', 'delete', 'Remove promotional configurations')
ON CONFLICT (module, action) DO NOTHING;

-- =========================================================================
-- SEED JUNCTION RELATIONSHIPS (ROLE_PERMISSIONS)
-- =========================================================================
-- Give super_admin all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Give admin general access (everything except deleting pricing)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
AND NOT (p.module = 'pricing' AND p.action = 'delete')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Give ops_manager full CRUD on drivers, customers, drivers outreach, and trips, and read-only on pricing
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ops_manager'
AND (
    (p.module IN ('drivers', 'customers', 'drivers_outreach', 'trips'))
    OR (p.module = 'pricing' AND p.action = 'read')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Give finance_viewer read access on financial modules, pricing, transactions, referrals, and promo modules
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'finance_viewer'
AND p.action = 'read'
AND p.module IN ('pricing', 'deductions', 'recharge', 'taxes', 'trip_transaction', 'user_referrals', 'driver_referrals', 'promos')
ON CONFLICT (role_id, permission_id) DO NOTHING;
