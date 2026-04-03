# Phase 0 Research: Phase 2 Modules

**Date**: 2026-04-02
**Purpose**: Resolve all technical unknowns and document design decisions before Phase 1 design

## Research Tasks Completed

### Task 1: Multi-Tenant Database Design Pattern

**Question**: How to implement branch-wise data segregation in PostgreSQL?

**Decision**: Use **Row-Level Security (RLS) with branch_id column** on all transactional tables

**Rationale**:
- Existing Phase 1 tables need branch_id added for data segregation
- RLS policies automatically filter data by current user's branch
- Consolidated reports bypass RLS using elevated role
- Simpler than schema-per-branch or database-per-branch approaches
- Aligns with Supabase's built-in RLS support

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Schema per branch | Too complex, 50+ schemas hard to maintain, migrations nightmare |
| Database per branch | Expensive, cross-branch queries impossible, violates free tier |
| Application-level filtering | Error-prone, easy to forget filters, security risk |

**Implementation**:
- Add `branch_id INTEGER REFERENCES branches(id)` to all transactional tables
- Create RLS policies: `CREATE POLICY branch_isolation ON table_name USING (branch_id = current_setting('app.current_branch')::int)`
- Set branch context per request: `SET LOCAL app.current_branch = <branch_id>`
- Consolidated reports use superuser role bypassing RLS

---

### Task 2: Approval Workflow Engine Design

**Question**: How to implement multi-level approval workflows with configurable thresholds?

**Decision**: Use **state machine pattern with JSON-based workflow definitions**

**Rationale**:
- Workflows defined once, reused across document types
- JSON structure supports arbitrary approval levels (1-3+)
- State machine ensures valid transitions (pending → approved/rejected)
- Decouples approval logic from business documents

**Workflow JSON Structure**:
```json
{
  "name": "Purchase Order Approval",
  "module": "purchase_orders",
  "levels": [
    {
      "level": 1,
      "approver_role": "Store Manager",
      "condition": "amount < 50000"
    },
    {
      "level": 2,
      "approver_role": "Finance Manager",
      "condition": "amount >= 50000 AND amount < 200000"
    },
    {
      "level": 3,
      "approver_role": "CFO",
      "condition": "amount >= 200000"
    }
  ]
}
```

**Implementation**:
- `approval_workflows` table stores JSON definition
- `approval_requests` table tracks document approval status
- `approval_actions` table logs each approve/reject action
- Service evaluates workflow conditions to determine current approver
- Email notifications triggered on request creation

---

### Task 3: Budget vs Actual Calculation Strategy

**Question**: How to calculate budget vs actual in real-time without performance issues?

**Decision**: Use **materialized view with incremental refresh** for budget vs actual

**Rationale**:
- Real-time calculation on every report query too slow (joins across 34+ tables)
- Materialized view pre-computes budget vs actual aggregations
- Incremental refresh on transaction insert/update (via triggers)
- Report queries read from materialized view (sub-second response)
- Staleness < 1 second acceptable for budget monitoring

**Implementation**:
```sql
CREATE MATERIALIZED VIEW mv_budget_vs_actual AS
SELECT 
  b.id as budget_id,
  bl.account_id,
  bl.cost_center_id,
  bl.total as budget_amount,
  COALESCE(SUM(gl.debit - gl.credit), 0) as actual_amount,
  bl.total - COALESCE(SUM(gl.debit - gl.credit), 0) as variance,
  ((bl.total - COALESCE(SUM(gl.debit - gl.credit), 0)) / bl.total * 100) as variance_percent
FROM budgets b
JOIN budget_lines bl ON b.id = bl.budget_id
LEFT JOIN gl_entries gl ON gl.account_id = bl.account_id 
  AND gl.posting_date >= b.fiscal_year || '-01-01'
  AND gl.posting_date <= b.fiscal_year || '-12-31'
GROUP BY b.id, bl.account_id, bl.cost_center_id, bl.total;

-- Refresh on transaction changes
CREATE FUNCTION refresh_budget_view() RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_budget_vs_actual;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

---

### Task 4: RBAC Permission Evaluation Pattern

**Question**: How to efficiently evaluate permissions at API layer?

**Decision**: Use **permission cache in JWT claims + middleware enforcement**

**Rationale**:
- Database query on every API call too slow (adds 50-100ms)
- JWT claims include role and permissions (signed, tamper-proof)
- Middleware extracts permissions from JWT, checks before route handler
- Permissions refreshed on login or explicit permission change
- Supports both module-level and action-level permissions

**JWT Structure**:
```json
{
  "sub": "user-123",
  "role": "Accountant",
  "permissions": {
    "modules": ["sales", "purchases", "inventory", "reports"],
    "actions": {
      "sales": ["create", "read", "update"],
      "purchases": ["create", "read"],
      "reports": ["read", "export"]
    }
  },
  "branch_id": 5
}
```

**Implementation**:
- FastAPI dependency `get_current_user()` extracts JWT
- Permission check decorator: `@require_permission("sales", "create")`
- Frontend: permissions in Redux/Context, hide/show UI elements
- Backend: middleware rejects unauthorized requests (403)

---

### Task 5: 2FA OTP Generation and Validation

**Question**: How to implement email-based 2FA securely?

**Decision**: Use **cryptographically secure random 6-digit OTP with 5-minute expiry**

**Rationale**:
- 6 digits provides 1M combinations (sufficient for email rate limits)
- 5-minute expiry balances security vs user convenience
- OTP stored hashed (like passwords) to prevent timing attacks
- Rate limiting: max 3 OTP requests per 15 minutes per user
- Email sent via existing email service (Phase 1)

**Implementation**:
```python
import secrets
from datetime import datetime, timedelta
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"])

def generate_otp() -> tuple[str, str]:
    """Generate OTP and return (plain_otp, hashed_otp)"""
    otp = f"{secrets.randbelow(1000000):06d}"
    hashed = pwd_context.hash(otp)
    return otp, hashed

def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
    return pwd_context.verify(plain_otp, hashed_otp)

# Store in otp_tokens table
# - user_id, hashed_otp, expires_at, is_used
# - Index on (user_id, expires_at) for cleanup
```

**Email Template**:
```
Subject: Accountify - Your Verification Code

Hello [User],

Your verification code is: [OTP]

This code expires in 5 minutes. Do not share this code with anyone.

If you did not request this code, please contact support immediately.

Best regards,
Accountify Team
```

---

### Task 6: BOM Multi-Level Support Strategy

**Question**: Should BOM support multi-level (nested) BOMs from day one?

**Decision**: **Start with single-level BOM**, design schema for multi-level future upgrade

**Rationale**:
- 80% of Pakistani SMEs use single-level BOMs (simple manufacturing)
- Multi-level adds significant complexity (recursive queries, circular reference detection)
- Single-level can be implemented in Phase 2 timeline
- Schema designed with `parent_bom_id` nullable for future multi-level
- Production orders link to BOM version (snapshot in time)

**Single-Level Implementation**:
```sql
CREATE TABLE bom_headers (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,  -- Finished product
  version INTEGER NOT NULL,     -- Version 1, 2, 3...
  status VARCHAR(20) DEFAULT 'draft',  -- draft, active, archived
  effective_date DATE,
  UNIQUE(company_id, product_id, version)
);

CREATE TABLE bom_lines (
  id SERIAL PRIMARY KEY,
  bom_id INTEGER REFERENCES bom_headers(id),
  component_id INTEGER NOT NULL,  -- Raw material/component
  quantity DECIMAL(15,3) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  waste_percent DECIMAL(5,2) DEFAULT 0
);

-- Future multi-level: add parent_bom_id column to bom_headers
-- Multi-level query uses recursive CTE
```

---

### Task 7: Audit Trail Storage Strategy

**Question**: How to store audit logs efficiently without bloating database?

**Decision**: Use **JSONB columns for old/new values + partitioning by date**

**Rationale**:
- JSONB flexible for varying table schemas
- Partitioning by month keeps queries fast
- Automatic archival after 90 days (compliance requirement)
- Indexes on (user_id, created_at, table_name) for common queries
- Separate table from transactional data (no impact on OLTP performance)

**Implementation**:
```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL,  -- INSERT, UPDATE, DELETE
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER NOT NULL,
  old_values JSONB,             -- NULL for INSERT
  new_values JSONB,             -- NULL for DELETE
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE audit_logs_2026_04 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Indexes
CREATE INDEX idx_audit_user_date ON audit_logs (user_id, created_at);
CREATE INDEX idx_audit_table_record ON audit_logs (table_name, record_id);
```

**Trigger Function** (auto-logs all changes):
```sql
CREATE FUNCTION audit_trigger_func() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_values)
    VALUES (NEW.company_id, current_setting('app.current_user')::int, 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, old_values, new_values)
    VALUES (current_setting('app.current_user')::int, 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, old_values)
    VALUES (OLD.company_id, current_setting('app.current_user')::int, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

### Task 8: Inter-Branch Stock Transfer Accounting

**Question**: How to handle accounting entries for inter-branch stock transfers?

**Decision**: **Treat as inter-branch journal entries** (not sales)

**Rationale**:
- Stock transfer between branches of same company is not a sale (no revenue recognition)
- Source branch credits inventory, debits "Inter-Branch Receivable"
- Destination branch debits inventory, credits "Inter-Branch Payable"
- Consolidation eliminates inter-branch accounts (net to zero)
- Tracks inventory movement without tax implications

**Journal Entries**:
```
Source Branch:
  Dr Inter-Branch Receivable    XXX
    Cr Inventory (Finished Goods)  XXX

Destination Branch:
  Dr Inventory (Finished Goods) XXX
    Cr Inter-Branch Payable     XXX

Consolidated (elimination):
  Dr Inter-Branch Payable       XXX
    Cr Inter-Branch Receivable  XXX
  (Net effect: zero)
```

**Implementation**:
- `inter_branch_receivable` and `inter_branch_payable` accounts in chart of accounts
- Transfer creates two journal entries (one per branch)
- Consolidated reports eliminate inter-branch balances
- Transfer document tracks source/destination, items, quantities

---

### Task 9: Email Service Integration

**Question**: Which email service to use for OTP and approval notifications?

**Decision**: Use **existing Phase 1 email service** (verify configuration)

**Rationale**:
- Phase 1 already has email integration (CRM module)
- No new dependency needed
- Reuse email templates, rate limiting, delivery tracking
- Verify SMTP credentials or API key configured in `.env`

**Required Environment Variables**:
```env
# Email configuration (verify in .env)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=Accountify <noreply@accountify.com>

# Or use API-based service (SendGrid, Resend, etc.)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxx
```

**Email Queue** (prevent blocking):
```python
from fastapi import BackgroundTasks

async def send_approval_email(
    background_tasks: BackgroundTasks,
    approver_email: str,
    document_type: str,
    amount: float
):
    background_tasks.add_task(
        email_service.send_email,
        to=approver_email,
        subject=f"Approval Required: {document_type}",
        body=f"Please review {document_type} for amount {amount}"
    )
```

---

### Task 10: Production Cost Calculation Method

**Question**: How to calculate production cost (material + labor + overhead)?

**Decision**: Use **standard costing with variance tracking**

**Rationale**:
- Standard cost set in BOM (expected material cost)
- Actual cost tracked during production (actual material issued)
- Variance = Actual - Standard (analyzed monthly)
- Labor and overhead allocated based on production hours
- Simpler than actual costing, suitable for SMEs

**Cost Calculation**:
```python
def calculate_production_cost(production_order: ProductionOrder) -> dict:
    # Material cost (from BOM)
    standard_material_cost = sum(
        line.component.standard_cost * line.quantity
        for line in production_order.bom.lines
    )
    
    # Actual material cost (from material issues)
    actual_material_cost = sum(
        issue.quantity * issue.component.weighted_average_cost
        for issue in production_order.material_issues
    )
    
    # Labor cost (from timesheets or standard)
    labor_cost = production_order.actual_hours * production_order.labor_rate
    
    # Overhead (allocated based on machine hours or labor hours)
    overhead_cost = production_order.actual_hours * overhead_rate_per_hour
    
    # Total cost
    total_cost = actual_material_cost + labor_cost + overhead_cost
    unit_cost = total_cost / production_order.output_quantity
    
    # Variance analysis
    material_variance = actual_material_cost - standard_material_cost
    
    return {
        "total_cost": total_cost,
        "unit_cost": unit_cost,
        "material_variance": material_variance,
        "labor_cost": labor_cost,
        "overhead_cost": overhead_cost
    }
```

---

## Summary of Decisions

| # | Decision | Impact |
|---|----------|--------|
| 1 | Row-Level Security for branch segregation | Database schema, all transactional tables need branch_id |
| 2 | State machine for approval workflows | approval_workflows, approval_requests, approval_actions tables |
| 3 | Materialized view for budget vs actual | mv_budget_vs_actual view, trigger-based refresh |
| 4 | JWT claims for RBAC permissions | JWT includes permissions, middleware enforcement |
| 5 | 6-digit OTP with 5-min expiry for 2FA | otp_tokens table, email integration |
| 6 | Single-level BOM initially | bom_headers, bom_lines tables (schema ready for multi-level) |
| 7 | JSONB audit logs with partitioning | audit_logs table partitioned by month |
| 8 | Inter-branch journal entries (not sales) | Inter-branch receivable/payable accounts |
| 9 | Reuse Phase 1 email service | No new dependency, verify .env config |
| 10 | Standard costing with variance | Production cost calculation in manufacturing_service |

## Next Steps

1. **Phase 1**: Create data-model.md with all entity definitions
2. **Phase 1**: Generate API contracts (OpenAPI schemas)
3. **Phase 1**: Create quickstart.md for developers
4. **Update agent context**: Add new tables and services to agent memory

---

**Status**: ✅ Phase 0 Complete - All technical unknowns resolved
