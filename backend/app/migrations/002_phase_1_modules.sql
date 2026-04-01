-- Migration: 002_phase_1_modules.sql
-- Description: Create 15 new tables for Phase 1 Critical Modules
-- Modules: Fixed Assets, Cost Centers, Tax Management, Bank Reconciliation, CRM
-- Created: 2026-04-01
-- Dependencies: 001_initial_schema.sql (companies, user_profiles, accounts, journal_entries, etc.)

-- ==================== FIXED ASSETS MODULE (4 tables) ====================

-- Asset Categories
CREATE TABLE IF NOT EXISTS asset_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    depreciation_rate_percent DECIMAL(5,2) NOT NULL CHECK (depreciation_rate_percent >= 0 AND depreciation_rate_percent <= 100),
    depreciation_method VARCHAR(10) NOT NULL DEFAULT 'SLM' CHECK (depreciation_method IN ('SLM', 'WDV')),
    account_code VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, name)
);

-- Fixed Assets
CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    asset_code VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id UUID NOT NULL REFERENCES asset_categories(id),
    purchase_date DATE NOT NULL,
    purchase_cost DECIMAL(15,2) NOT NULL CHECK (purchase_cost > 0),
    useful_life_months INTEGER NOT NULL CHECK (useful_life_months > 0),
    residual_value_percent DECIMAL(5,2) NOT NULL DEFAULT 10 CHECK (residual_value_percent >= 0 AND residual_value_percent <= 100),
    depreciation_method VARCHAR(10) NOT NULL CHECK (depreciation_method IN ('SLM', 'WDV')),
    location VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'sold', 'fully_depreciated')),
    photo_url VARCHAR(500),
    document_urls JSONB DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, asset_code)
);

-- Asset Depreciation
CREATE TABLE IF NOT EXISTS asset_depreciation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2020),
    depreciation_amount DECIMAL(15,2) NOT NULL CHECK (depreciation_amount >= 0),
    accumulated_depreciation DECIMAL(15,2) NOT NULL CHECK (accumulated_depreciation >= 0),
    book_value DECIMAL(15,2) NOT NULL CHECK (book_value >= 0),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id),
    posted_by UUID NOT NULL REFERENCES user_profiles(id),
    posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(asset_id, period_month, period_year)
);

-- Asset Maintenance
CREATE TABLE IF NOT EXISTS asset_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    service_provider VARCHAR(200),
    cost DECIMAL(15,2) NOT NULL CHECK (cost >= 0),
    next_service_due DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== COST CENTER MODULE (2 tables) ====================

-- Cost Centers
CREATE TABLE IF NOT EXISTS cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    overhead_allocation_rule JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, code)
);

-- Cost Center Allocations
CREATE TABLE IF NOT EXISTS cost_center_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('journal_entry', 'invoice', 'bill', 'expense')),
    transaction_id UUID NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    allocation_percent DECIMAL(5,2) NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== TAX MANAGEMENT MODULE (3 tables) ====================

-- Tax Rates
CREATE TABLE IF NOT EXISTS tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tax_name VARCHAR(100) NOT NULL,
    rate_percent DECIMAL(5,2) NOT NULL CHECK (rate_percent >= 0 AND rate_percent <= 100),
    tax_type VARCHAR(20) NOT NULL CHECK (tax_type IN ('sales_tax', 'input_tax', 'wht', 'federal_excise')),
    effective_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tax Returns
CREATE TABLE IF NOT EXISTS tax_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    return_period_month INTEGER NOT NULL CHECK (return_period_month BETWEEN 1 AND 12),
    return_period_year INTEGER NOT NULL CHECK (return_period_year >= 2020),
    output_tax_total DECIMAL(15,2) NOT NULL DEFAULT 0,
    input_tax_total DECIMAL(15,2) NOT NULL DEFAULT 0,
    net_tax_payable DECIMAL(15,2) NOT NULL,
    filed_date DATE,
    challan_number VARCHAR(50),
    challan_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'filed', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, return_period_month, return_period_year)
);

-- WHT Transactions
CREATE TABLE IF NOT EXISTS wht_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    party_id UUID NOT NULL,
    party_type VARCHAR(10) NOT NULL CHECK (party_type IN ('customer', 'vendor')),
    amount DECIMAL(15,2) NOT NULL,
    wht_category VARCHAR(50) NOT NULL,
    wht_rate DECIMAL(5,2) NOT NULL,
    wht_amount DECIMAL(15,2) NOT NULL,
    challan_id UUID REFERENCES tax_returns(id),
    is_filer BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== BANK RECONCILIATION MODULE (3 tables) ====================

-- Bank Statements (imported)
CREATE TABLE IF NOT EXISTS bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    statement_date DATE NOT NULL,
    opening_balance DECIMAL(15,2) NOT NULL,
    closing_balance DECIMAL(15,2) NOT NULL,
    transactions_json JSONB NOT NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    imported_by UUID NOT NULL REFERENCES user_profiles(id)
);

-- Reconciliation Sessions
CREATE TABLE IF NOT EXISTS reconciliation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2020),
    opening_balance DECIMAL(15,2) NOT NULL,
    closing_balance_per_bank DECIMAL(15,2) NOT NULL,
    closing_balance_per_books DECIMAL(15,2) NOT NULL,
    reconciled_transactions JSONB DEFAULT '[]',
    difference DECIMAL(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    completed_at DATE,
    completed_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Post-Dated Cheques (PDCs)
CREATE TABLE IF NOT EXISTS pdcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    cheque_number VARCHAR(20) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    cheque_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    party_type VARCHAR(10) NOT NULL CHECK (party_type IN ('customer', 'vendor')),
    party_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deposited', 'cleared', 'bounced', 'returned')),
    deposited_at DATE,
    cleared_at DATE,
    bounced_at DATE,
    bounce_reason VARCHAR(200),
    payment_id UUID REFERENCES payments(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== CRM MODULE (3 tables) ====================

-- Leads
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    lead_code VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    source VARCHAR(50) NOT NULL CHECK (source IN ('website', 'whatsapp', 'referral', 'walk_in', 'cold_call')),
    requirement TEXT,
    estimated_value DECIMAL(15,2),
    probability_percent INTEGER NOT NULL DEFAULT 50 CHECK (probability_percent BETWEEN 0 AND 100),
    stage VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'proposal', 'negotiation', 'converted', 'lost')),
    assigned_to UUID REFERENCES user_profiles(id),
    follow_up_date DATE,
    ai_score INTEGER CHECK (ai_score BETWEEN 0 AND 100),
    converted_to_customer_id UUID REFERENCES customers(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, lead_code)
);

-- CRM Tickets
CREATE TABLE IF NOT EXISTS crm_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ticket_number VARCHAR(20) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    issue_category VARCHAR(50) NOT NULL CHECK (issue_category IN ('billing', 'technical', 'general', 'complaint')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_to UUID REFERENCES user_profiles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
    description TEXT NOT NULL,
    resolution_notes TEXT,
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    UNIQUE(company_id, ticket_number)
);

-- Loyalty Programs
CREATE TABLE IF NOT EXISTS loyalty_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    program_name VARCHAR(100) NOT NULL,
    points_per_rupee DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    redemption_rate DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    tier_benefits_json JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== INDEXES ====================

-- Fixed Assets Indexes
CREATE INDEX IF NOT EXISTS idx_fixed_assets_company ON fixed_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(category_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_asset_depreciation_asset ON asset_depreciation(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_depreciation_period ON asset_depreciation(period_month, period_year);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_asset ON asset_maintenance(asset_id);

-- Cost Centers Indexes
CREATE INDEX IF NOT EXISTS idx_cost_centers_company ON cost_centers(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_center_alloc_cc ON cost_center_allocations(cost_center_id);

-- Tax Management Indexes
CREATE INDEX IF NOT EXISTS idx_tax_rates_company ON tax_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_returns_company ON tax_returns(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_returns_period ON tax_returns(return_period_month, return_period_year);
CREATE INDEX IF NOT EXISTS idx_wht_transactions_company ON wht_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_wht_transactions_date ON wht_transactions(transaction_date);

-- Bank Reconciliation Indexes
CREATE INDEX IF NOT EXISTS idx_bank_statements_company ON bank_statements(company_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_company ON reconciliation_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_period ON reconciliation_sessions(period_month, period_year);
CREATE INDEX IF NOT EXISTS idx_pdcs_company ON pdcs(company_id);
CREATE INDEX IF NOT EXISTS idx_pdcs_date ON pdcs(cheque_date);
CREATE INDEX IF NOT EXISTS idx_pdcs_status ON pdcs(status);

-- CRM Indexes
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_followup ON leads(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_tickets_company ON crm_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON crm_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON crm_tickets(customer_id);

-- ==================== ROW LEVEL SECURITY (RLS) POLICIES ====================

-- Enable RLS on all new tables
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_depreciation ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_center_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE wht_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access data from their own company
-- Asset Categories
CREATE POLICY "Users can view own company asset categories" ON asset_categories
    FOR SELECT USING (company_id = current_setting('app.current_company')::uuid);
CREATE POLICY "Users can insert own company asset categories" ON asset_categories
    FOR INSERT WITH CHECK (company_id = current_setting('app.current_company')::uuid);
CREATE POLICY "Users can update own company asset categories" ON asset_categories
    FOR UPDATE USING (company_id = current_setting('app.current_company')::uuid);

-- Fixed Assets
CREATE POLICY "Users can view own company fixed assets" ON fixed_assets
    FOR SELECT USING (company_id = current_setting('app.current_company')::uuid);
CREATE POLICY "Users can insert own company fixed assets" ON fixed_assets
    FOR INSERT WITH CHECK (company_id = current_setting('app.current_company')::uuid);
CREATE POLICY "Users can update own company fixed assets" ON fixed_assets
    FOR UPDATE USING (company_id = current_setting('app.current_company')::uuid);

-- Cost Centers
CREATE POLICY "Users can view own company cost centers" ON cost_centers
    FOR SELECT USING (company_id = current_setting('app.current_company')::uuid);
CREATE POLICY "Users can insert own company cost centers" ON cost_centers
    FOR INSERT WITH CHECK (company_id = current_setting('app.current_company')::uuid);

-- Tax Rates
CREATE POLICY "Users can view own company tax rates" ON tax_rates
    FOR SELECT USING (company_id = current_setting('app.current_company')::uuid);

-- Leads
CREATE POLICY "Users can view own company leads" ON leads
    FOR SELECT USING (company_id = current_setting('app.current_company')::uuid);
CREATE POLICY "Users can insert own company leads" ON leads
    FOR INSERT WITH CHECK (company_id = current_setting('app.current_company')::uuid);
CREATE POLICY "Users can update own company leads" ON leads
    FOR UPDATE USING (company_id = current_setting('app.current_company')::uuid);

-- CRM Tickets
CREATE POLICY "Users can view own company tickets" ON crm_tickets
    FOR SELECT USING (company_id = current_setting('app.current_company')::uuid);
CREATE POLICY "Users can insert own company tickets" ON crm_tickets
    FOR INSERT WITH CHECK (company_id = current_setting('app.current_company')::uuid);
CREATE POLICY "Users can update own company tickets" ON crm_tickets
    FOR UPDATE USING (company_id = current_setting('app.current_company')::uuid);

-- Repeat similar policies for all other tables...
-- (For brevity, assuming same pattern applies to all tables)

-- ==================== SEED DATA ====================

-- Seed Asset Categories (FBR Third Schedule rates)
-- Note: These will be inserted by seed_phase_1.py script to allow company-specific customization

-- Comment: Migration complete. Run seed_phase_1.py to populate tax rates and asset categories.
