-- Phase 3: Project Costing Module
-- Tables: projects, project_phases, project_costs, project_revenue

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    project_code VARCHAR(20) UNIQUE NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    client_id UUID REFERENCES customers(id),
    start_date DATE NOT NULL,
    end_date DATE,
    budget NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
    manager_id UUID REFERENCES users(id),
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Phases Table
CREATE TABLE IF NOT EXISTS project_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    budget_allocated NUMERIC(15, 2) NOT NULL DEFAULT 0,
    completion_pct INTEGER NOT NULL DEFAULT 0 CHECK (completion_pct >= 0 AND completion_pct <= 100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, phase_name)
);

-- Project Costs Table
CREATE TABLE IF NOT EXISTS project_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
    cost_source_type VARCHAR(20) NOT NULL CHECK (cost_source_type IN ('invoice', 'expense', 'payroll', 'journal', 'inventory')),
    cost_source_id UUID NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    cost_category VARCHAR(50) NOT NULL,
    allocated_date DATE NOT NULL DEFAULT NOW(),
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Revenue Table
CREATE TABLE IF NOT EXISTS project_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id),
    amount NUMERIC(15, 2) NOT NULL,
    recognized_date DATE NOT NULL DEFAULT NOW(),
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_project_costs_project ON project_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_costs_category ON project_costs(cost_category);
CREATE INDEX IF NOT EXISTS idx_project_revenue_project ON project_revenue(project_id);

-- Comments
COMMENT ON TABLE projects IS 'Project/Job definitions with budget and timeline';
COMMENT ON TABLE project_phases IS 'Project phases/milestones with budget allocation';
COMMENT ON TABLE project_costs IS 'Costs allocated to projects from various sources';
COMMENT ON TABLE project_revenue IS 'Revenue recognized from project invoices';
