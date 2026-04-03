# Accountify Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-02

## Active Technologies

**Backend**:
- Python 3.12
- FastAPI (web framework)
- SQLAlchemy (ORM)
- Pydantic (data validation)
- Supabase (PostgreSQL, Auth)
- Passlib + bcrypt (password/OTP hashing)
- Google Gemini 2.0 Flash (AI integration)

**Frontend**:
- Next.js 16 (App Router)
- React 19
- TypeScript 5.x
- Tailwind CSS
- shadcn/ui (component library)
- React Hook Form
- Zod (schema validation)
- Recharts (data visualization)

**Database**:
- PostgreSQL 15 (Supabase)
- Row-Level Security (RLS) policies
- Materialized views (budget vs actual)
- Table partitioning (audit_logs by month)
- JSONB columns (flexible schemas)

**Testing**:
- Backend: pytest
- Frontend: Jest + React Testing Library

## Project Structure

```text
backend/
├── app/
│   ├── routers/
│   │   ├── branches.py         # Module 1: Multi-branch endpoints
│   │   ├── approvals.py        # Module 2: Workflow & approvals
│   │   ├── budgets.py          # Module 3: Budget management
│   │   ├── roles.py            # Module 4: RBAC endpoints
│   │   ├── audit.py            # Module 4: Audit trail endpoints
│   │   └── manufacturing.py    # Module 5: BOM & production
│   ├── models/
│   │   ├── branch.py           # Branch, BranchSettings models
│   │   ├── approval.py         # ApprovalWorkflow, ApprovalRequest, ApprovalAction
│   │   ├── budget.py           # Budget, BudgetLine models
│   │   ├── role.py             # Role, UserRole models
│   │   ├── audit.py            # AuditLog, LoginHistory, OTPToken
│   │   └── manufacturing.py    # BOMHeader, BOMLine, ProductionOrder, etc.
│   ├── schemas/
│   │   ├── branch.py           # Pydantic schemas for branches
│   │   ├── approval.py         # Schemas for approval workflows
│   │   ├── budget.py           # Budget schemas
│   │   ├── role.py             # RBAC schemas
│   │   ├── audit.py            # Audit log schemas
│   │   └── manufacturing.py    # BOM & production schemas
│   └── services/
│       ├── branch_service.py   # Branch logic, consolidation
│       ├── approval_engine.py  # Approval workflow engine
│       ├── budget_service.py   # Budget calculations, alerts
│       ├── rbac_service.py     # Permission checks, 2FA
│       ├── audit_service.py    # Audit logging
│       └── manufacturing_service.py  # BOM, MRP, cost calc
└── tests/
    ├── test_branches.py
    ├── test_approvals.py
    ├── test_budgets.py
    ├── test_roles.py
    ├── test_audit.py
    └── test_manufacturing.py

frontend/
└── src/
    └── app/
        └── dashboard/
            ├── branches/           # Module 1: Branch management UI
            │   ├── page.tsx        # Branch list
            │   ├── [id]/           # Branch detail
            │   └── transfer/       # Inter-branch transfer
            ├── approvals/          # Module 2: Approval dashboard
            │   ├── page.tsx        # Pending approvals
            │   ├── [id]/           # Approval detail
            │   └── workflows/      # Workflow configuration
            ├── budgets/            # Module 3: Budget management
            │   ├── page.tsx        # Budget list
            │   ├── [id]/           # Budget detail, vs actual
            │   └── create/         # Budget creation
            ├── roles/              # Module 4: RBAC UI
            │   ├── page.tsx        # Role management
            │   └── [id]/           # Role permissions
            ├── manufacturing/      # Module 5: Production UI
            │   ├── bom/            # BOM management
            │   ├── orders/         # Production orders
            │   └── mrp/            # MRP planning
            └── layout.tsx          # Header with branch selector
```

## Commands

**Backend**:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pytest tests/ -v
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
npm test
```

**Database**:
```bash
cd backend
python -m app.db.migrations.phase2
```

## Code Style

**Python (Backend)**:
- Type hints required for all functions
- Pydantic schemas for all request/response models
- Services contain business logic, routers are thin
- Use dependency injection for current user, branch context
- Black formatting, Ruff linting

**TypeScript (Frontend)**:
- Strict mode enabled
- Functional components with hooks
- React Query for API calls
- Zod schemas for form validation
- ESLint + Prettier formatting

**Database**:
- All tables have `id`, `created_at`, `updated_at`
- Foreign keys with cascading deletes where appropriate
- Indexes on all foreign keys and frequently queried columns
- RLS policies for branch data segregation
- Audit triggers on all transactional tables

## Recent Changes

**Phase 2 Modules (001-phase-2-modules)** - 2026-04-02:
- Added 15 new tables: branches, approval_workflows, approval_requests, approval_actions, budgets, budget_lines, roles, user_roles, audit_logs, login_history, otp_tokens, bom_headers, bom_lines, production_orders, production_materials, production_output, scrap_records
- Added Row-Level Security for branch data segregation
- Created approval workflow engine with multi-level support
- Implemented RBAC with 9 predefined roles
- Added BOM and production tracking for manufacturing
- Created materialized view for budget vs actual calculations

**Phase 1 Modules** - Previous:
- Fixed Assets, Cost Centers, Tax Management, Bank Reconciliation, CRM
- 34 existing tables in PostgreSQL
- Next.js 16 frontend on Vercel
- FastAPI backend on Fly.io

## Architecture Patterns

**Row-Level Security (RLS)**:
All transactional tables include `branch_id` column. RLS policies automatically filter data by current user's branch:
```sql
CREATE POLICY branch_isolation ON sales_invoices 
USING (branch_id = current_setting('app.current_branch')::int);
```

**Approval Workflow State Machine**:
Documents transition through states: `pending` → `approved` (all levels) or `rejected` (any level):
```python
# State transitions enforced by database check constraint
status CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
```

**JWT Permission Claims**:
Permissions embedded in JWT token, validated by middleware:
```json
{
  "sub": "user-123",
  "role": "Accountant",
  "permissions": {
    "modules": ["sales", "accounting", "reports"],
    "actions": {
      "sales": ["create", "read"],
      "accounting": ["read"],
      "reports": ["read", "export"]
    }
  }
}
```

**Materialized View for Performance**:
Budget vs actual pre-computed, refreshed on transaction changes:
```sql
CREATE MATERIALIZED VIEW mv_budget_vs_actual AS
SELECT budget_id, account_id, budget_amount, actual_amount, variance, variance_percent
FROM budgets JOIN budget_lines LEFT JOIN gl_entries ...
```

## Environment Variables

**Required (.env)**:
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/accountify

# Auth
JWT_SECRET=your-secret-key
OTP_EXPIRY_MINUTES=5
OTP_MAX_REQUESTS_PER_HOUR=3

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=Accountify <noreply@accountify.com>

# Branch
DEFAULT_BRANCH_ID=1
ENABLE_BRANCH_ISOLATION=true

# Audit
AUDIT_LOG_RETENTION_DAYS=90
ENABLE_AUDIT_TRAIL=true
```

---

<!-- MANUAL ADDITIONS START -->
<!-- Add team-specific conventions, project-specific patterns, or tool configurations here -->
<!-- MANUAL ADDITIONS END -->
