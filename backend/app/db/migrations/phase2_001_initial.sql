-- Phase 2 Modules Database Migration
-- Modules: Multi-Branch, Approvals, Budget, RBAC, Manufacturing
-- Date: 2026-04-02
-- Description: Creates 15 new tables for Phase 2 functionality

-- ============================================================================
-- MODULE 4: USER ROLES & SECURITY (Foundation - Must be first)
-- ============================================================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    permissions_json JSONB NOT NULL DEFAULT '{"modules": [], "actions": {}}',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX idx_roles_company ON roles(company_id);
CREATE INDEX idx_roles_system ON roles(is_system);

-- User roles assignment table
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,  -- Supabase auth.users uses UUID strings
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    branch_id INTEGER,  -- Will reference branches table (created later)
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by VARCHAR(255),
    UNIQUE(user_id, role_id, branch_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_branch ON user_roles(branch_id);

-- Audit logs table (partitioned by date)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL NOT NULL,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create initial partition for 2026
CREATE TABLE IF NOT EXISTS audit_logs_2026_04 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE INDEX idx_audit_user_date ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_company_date ON audit_logs(company_id, created_at);

-- Login history table
CREATE TABLE IF NOT EXISTS login_history (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'blocked')),
    failure_reason VARCHAR(255),
    login_at TIMESTAMPTZ DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    session_id UUID
);

CREATE INDEX idx_login_user ON login_history(user_id);
CREATE INDEX idx_login_status ON login_history(status);
CREATE INDEX idx_login_date ON login_history(login_at);

-- OTP tokens table for 2FA
CREATE TABLE IF NOT EXISTS otp_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_user ON otp_tokens(user_id);
CREATE INDEX idx_otp_expires ON otp_tokens(expires_at);

-- ============================================================================
-- MODULE 1: MULTI-BRANCH
-- ============================================================================

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);

CREATE INDEX idx_branches_company ON branches(company_id);
CREATE INDEX idx_branches_code ON branches(code);
CREATE INDEX idx_branches_active ON branches(is_active);

-- Ensure one default branch per company
CREATE UNIQUE INDEX idx_branches_default ON branches(company_id) WHERE is_default = TRUE;

-- Branch settings table
CREATE TABLE IF NOT EXISTS branch_settings (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
    price_list_id INTEGER,  -- Reference to price_lists if exists
    tax_rate DECIMAL(5,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'PKR',
    fiscal_year_start DATE DEFAULT '01-01',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_branch_settings_branch ON branch_settings(branch_id);

-- ============================================================================
-- MODULE 2: WORKFLOW & APPROVALS
-- ============================================================================

-- Approval workflows table
CREATE TABLE IF NOT EXISTS approval_workflows (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    condition_amount DECIMAL(15,2),
    condition_operator VARCHAR(5) DEFAULT '>' CHECK (condition_operator IN ('>', '>=', '<', '<=', '=')),
    levels_json JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflows_company ON approval_workflows(company_id);
CREATE INDEX idx_workflows_module ON approval_workflows(module);
CREATE INDEX idx_workflows_active ON approval_workflows(is_active);

-- Approval requests table
CREATE TABLE IF NOT EXISTS approval_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    workflow_id INTEGER REFERENCES approval_workflows(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    current_level INTEGER DEFAULT 1,
    requested_by VARCHAR(255) NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    completed_by VARCHAR(255),
    UNIQUE(document_type, document_id)
);

CREATE INDEX idx_requests_company ON approval_requests(company_id);
CREATE INDEX idx_requests_status ON approval_requests(status);
CREATE INDEX idx_requests_document ON approval_requests(document_type, document_id);
CREATE INDEX idx_requests_workflow ON approval_requests(workflow_id);

-- Approval actions table
CREATE TABLE IF NOT EXISTS approval_actions (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'delegated')),
    actioned_by VARCHAR(255) NOT NULL,
    comments TEXT,
    actioned_at TIMESTAMPTZ DEFAULT NOW(),
    delegated_to VARCHAR(255)
);

CREATE INDEX idx_actions_request ON approval_actions(request_id);
CREATE INDEX idx_actions_level ON approval_actions(level);
CREATE INDEX idx_actions_user ON approval_actions(actioned_by);

-- ============================================================================
-- MODULE 3: BUDGET MANAGEMENT
-- ============================================================================

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    fiscal_year INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
    total_amount DECIMAL(15,2),
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, fiscal_year, branch_id, name)
);

CREATE INDEX idx_budgets_company ON budgets(company_id);
CREATE INDEX idx_budgets_fiscal_year ON budgets(fiscal_year);
CREATE INDEX idx_budgets_branch ON budgets(branch_id);
CREATE INDEX idx_budgets_status ON budgets(status);

-- Budget lines table
CREATE TABLE IF NOT EXISTS budget_lines (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    account_id INTEGER,  -- Reference to accounts table
    cost_center_id INTEGER,  -- Reference to cost_centers table
    jan DECIMAL(15,2) DEFAULT 0,
    feb DECIMAL(15,2) DEFAULT 0,
    mar DECIMAL(15,2) DEFAULT 0,
    apr DECIMAL(15,2) DEFAULT 0,
    may DECIMAL(15,2) DEFAULT 0,
    jun DECIMAL(15,2) DEFAULT 0,
    jul DECIMAL(15,2) DEFAULT 0,
    aug DECIMAL(15,2) DEFAULT 0,
    sep DECIMAL(15,2) DEFAULT 0,
    oct DECIMAL(15,2) DEFAULT 0,
    nov DECIMAL(15,2) DEFAULT 0,
    dec DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    CONSTRAINT check_budget_line_entity CHECK (account_id IS NOT NULL OR cost_center_id IS NOT NULL)
);

CREATE INDEX idx_budget_lines_budget ON budget_lines(budget_id);
CREATE INDEX idx_budget_lines_account ON budget_lines(account_id);
CREATE INDEX idx_budget_lines_cost_center ON budget_lines(cost_center_id);

-- Materialized view for budget vs actual
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_budget_vs_actual AS
SELECT 
    b.id as budget_id,
    bl.id as budget_line_id,
    bl.account_id,
    bl.cost_center_id,
    bl.total as budget_amount,
    COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as actual_amount,
    bl.total - COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as variance,
    CASE 
        WHEN bl.total > 0 THEN 
            ((bl.total - COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0)) / bl.total * 100)
        ELSE 0 
    END as variance_percent
FROM budgets b
JOIN budget_lines bl ON b.id = bl.budget_id
LEFT JOIN journal_entries gl ON gl.account_id = bl.account_id 
    AND gl.posting_date >= DATE(b.fiscal_year || '-01-01')
    AND gl.posting_date < DATE((b.fiscal_year + 1) || '-01-01')
GROUP BY b.id, bl.id, bl.account_id, bl.cost_center_id, bl.total;

CREATE UNIQUE INDEX idx_mv_budget_vs_actual ON mv_budget_vs_actual(budget_line_id);
CREATE INDEX idx_mv_budget_account ON mv_budget_vs_actual(account_id);

-- ============================================================================
-- MODULE 5: MANUFACTURING / BOM
-- ============================================================================

-- BOM headers table
CREATE TABLE IF NOT EXISTS bom_headers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,  -- Reference to products table
    version INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    effective_date DATE,
    expiry_date DATE,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, product_id, version)
);

CREATE INDEX idx_bom_company ON bom_headers(company_id);
CREATE INDEX idx_bom_product ON bom_headers(product_id);
CREATE INDEX idx_bom_status ON bom_headers(status);

-- BOM lines table
CREATE TABLE IF NOT EXISTS bom_lines (
    id SERIAL PRIMARY KEY,
    bom_id INTEGER NOT NULL REFERENCES bom_headers(id) ON DELETE CASCADE,
    component_id INTEGER NOT NULL,  -- Reference to products table
    quantity DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    waste_percent DECIMAL(5,2) DEFAULT 0 CHECK (waste_percent >= 0 AND waste_percent <= 100),
    sequence INTEGER DEFAULT 0
);

CREATE INDEX idx_bom_lines_bom ON bom_lines(bom_id);
CREATE INDEX idx_bom_lines_component ON bom_lines(component_id);

-- Production orders table
CREATE TABLE IF NOT EXISTS production_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    bom_id INTEGER NOT NULL REFERENCES bom_headers(id),
    quantity DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'started', 'completed', 'cancelled')),
    cost_center_id INTEGER,  -- Reference to cost_centers table
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    actual_hours DECIMAL(10,2),
    labor_rate DECIMAL(10,2),
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_company ON production_orders(company_id);
CREATE INDEX idx_po_bom ON production_orders(bom_id);
CREATE INDEX idx_po_status ON production_orders(status);
CREATE INDEX idx_po_dates ON production_orders(start_date, end_date);

-- Production materials table
CREATE TABLE IF NOT EXISTS production_materials (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,  -- Reference to products table
    required_qty DECIMAL(15,3) NOT NULL,
    issued_qty DECIMAL(15,3) DEFAULT 0,
    issue_date TIMESTAMPTZ,
    issued_by VARCHAR(255),
    UNIQUE(production_order_id, product_id)
);

CREATE INDEX idx_pm_po ON production_materials(production_order_id);
CREATE INDEX idx_pm_product ON production_materials(product_id);

-- Production output table
CREATE TABLE IF NOT EXISTS production_output (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,  -- Reference to products table
    quantity DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    cost DECIMAL(15,2),
    unit_cost DECIMAL(15,2),
    output_date TIMESTAMPTZ DEFAULT NOW(),
    recorded_by VARCHAR(255)
);

CREATE INDEX idx_po_output_po ON production_output(production_order_id);
CREATE INDEX idx_po_output_product ON production_output(product_id);

-- Scrap records table
CREATE TABLE IF NOT EXISTS scrap_records (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,  -- Reference to products table
    quantity DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    reason VARCHAR(100),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_by VARCHAR(255)
);

CREATE INDEX idx_scrap_po ON scrap_records(production_order_id);
CREATE INDEX idx_scrap_reason ON scrap_records(reason);

-- ============================================================================
-- SEED DATA: Predefined System Roles
-- ============================================================================

-- Insert predefined system roles (will be expanded by seed script)
INSERT INTO roles (company_id, name, permissions_json, is_system) VALUES
(NULL, 'Super Admin', '{"modules": ["*"], "actions": {"*": ["create", "read", "update", "delete", "approve", "export"]}}', TRUE),
(NULL, 'Admin', '{"modules": ["sales", "purchases", "inventory", "accounting", "reports", "crm", "hr"], "actions": {"*": ["create", "read", "update", "delete", "approve", "export"]}}', TRUE),
(NULL, 'Accountant', '{"modules": ["accounting", "reports", "tax"], "actions": {"accounting": ["create", "read", "update"], "reports": ["read", "export"], "tax": ["create", "read", "update"]}}', TRUE),
(NULL, 'Sales Manager', '{"modules": ["sales", "crm", "reports"], "actions": {"sales": ["create", "read", "update", "delete", "approve"], "crm": ["create", "read", "update"], "reports": ["read", "export"]}}', TRUE),
(NULL, 'Salesperson', '{"modules": ["sales", "crm"], "actions": {"sales": ["create", "read"], "crm": ["create", "read", "update"]}}', TRUE),
(NULL, 'Store Manager', '{"modules": ["inventory", "purchases"], "actions": {"inventory": ["create", "read", "update", "approve"], "purchases": ["create", "read", "update", "approve"]}}', TRUE),
(NULL, 'HR Manager', '{"modules": ["hr", "payroll"], "actions": {"hr": ["create", "read", "update", "delete", "approve"], "payroll": ["create", "read", "update"]}}', TRUE),
(NULL, 'Cashier', '{"modules": ["pos", "sales"], "actions": {"pos": ["create", "read"], "sales": ["create", "read"]}}', TRUE),
(NULL, 'Viewer', '{"modules": ["reports"], "actions": {"reports": ["read"]}}', TRUE);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE roles IS 'User roles with JSON-based permissions';
COMMENT ON TABLE user_roles IS 'Assignment of roles to users';
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all data changes (partitioned by month)';
COMMENT ON TABLE login_history IS 'User login session tracking';
COMMENT ON TABLE otp_tokens IS '2FA OTP tokens with expiry';
COMMENT ON TABLE branches IS 'Company branches/locations';
COMMENT ON TABLE branch_settings IS 'Branch-specific configuration';
COMMENT ON TABLE approval_workflows IS 'Configurable approval workflows';
COMMENT ON TABLE approval_requests IS 'Documents pending approval';
COMMENT ON TABLE approval_actions IS 'Individual approval/reject actions';
COMMENT ON TABLE budgets IS 'Annual budgets by company/branch';
COMMENT ON TABLE budget_lines IS 'Budget line items by account/cost center';
COMMENT ON MATERIALIZED VIEW mv_budget_vs_actual IS 'Pre-computed budget vs actual comparison';
COMMENT ON TABLE bom_headers IS 'Bill of Materials headers';
COMMENT ON TABLE bom_lines IS 'BOM components/raw materials';
COMMENT ON TABLE production_orders IS 'Production job orders';
COMMENT ON TABLE production_materials IS 'Materials issued to production';
COMMENT ON TABLE production_output IS 'Finished goods from production';
COMMENT ON TABLE scrap_records IS 'Production scrap/waste tracking';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- This migration creates the foundation for Phase 2 modules.
-- Next steps:
-- 1. Run seed script to populate roles
-- 2. Add branch_id to existing Phase 1 tables
-- 3. Create RLS policies for branch isolation
-- 4. Implement audit triggers
