-- Phase 2 Tables Migration (UUID version - matches Phase 1 schema)
-- Creates manufacturing, budget, approval, and branch tables
-- Safe to run multiple times (idempotent)

-- Manufacturing Tables
CREATE TABLE IF NOT EXISTS bom_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft',
    effective_date DATE,
    expiry_date DATE,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bom_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES bom_headers(id) ON DELETE CASCADE,
    component_id UUID NOT NULL,
    quantity DECIMAL(15, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    waste_percent DECIMAL(5, 2) DEFAULT 0,
    sequence INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS production_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bom_id UUID NOT NULL REFERENCES bom_headers(id),
    quantity DECIMAL(15, 3) NOT NULL,
    status VARCHAR(20) DEFAULT 'planned',
    cost_center_id UUID,
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    actual_hours DECIMAL(10, 2),
    labor_rate DECIMAL(10, 2),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget Tables
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    total_amount DECIMAL(15, 2),
    branch_id UUID,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    account_id UUID,
    cost_center_id UUID,
    jan DECIMAL(15, 2) DEFAULT 0,
    feb DECIMAL(15, 2) DEFAULT 0,
    mar DECIMAL(15, 2) DEFAULT 0,
    apr DECIMAL(15, 2) DEFAULT 0,
    may DECIMAL(15, 2) DEFAULT 0,
    jun DECIMAL(15, 2) DEFAULT 0,
    jul DECIMAL(15, 2) DEFAULT 0,
    aug DECIMAL(15, 2) DEFAULT 0,
    sep DECIMAL(15, 2) DEFAULT 0,
    oct DECIMAL(15, 2) DEFAULT 0,
    nov DECIMAL(15, 2) DEFAULT 0,
    dec DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) DEFAULT 0,
    notes TEXT
);

-- Approval Tables
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    levels INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES approval_workflows(id),
    document_type VARCHAR(100) NOT NULL,
    document_id UUID NOT NULL,
    document_title VARCHAR(255),
    document_amount DECIMAL(15, 2),
    status VARCHAR(20) DEFAULT 'pending',
    current_level INTEGER DEFAULT 1,
    requested_by UUID,
    requested_by_name VARCHAR(255),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID,
    comments TEXT
);

CREATE TABLE IF NOT EXISTS approval_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    actioned_by UUID,
    comments TEXT,
    actioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delegated_to UUID
);

-- Branch Tables
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branch_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
    price_list_id UUID,
    tax_rate INTEGER DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'PKR',
    fiscal_year_start VARCHAR(5) DEFAULT '01-01',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bom_headers_company_id ON bom_headers(company_id);
CREATE INDEX IF NOT EXISTS idx_bom_headers_status ON bom_headers(status);
CREATE INDEX IF NOT EXISTS idx_bom_lines_bom_id ON bom_lines(bom_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_company_id ON production_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_bom_id ON production_orders(bom_id);
CREATE INDEX IF NOT EXISTS idx_budgets_company_id ON budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget_id ON budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_company_id ON approval_workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_company_id ON approval_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_actions_request_id ON approval_actions(request_id);
CREATE INDEX IF NOT EXISTS idx_branches_company_id ON branches(company_id);
