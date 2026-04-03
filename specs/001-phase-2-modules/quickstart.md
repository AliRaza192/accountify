# Quickstart Guide: Phase 2 Modules

**Date**: 2026-04-02
**Purpose**: Get developers up and running with Phase 2 modules in under 30 minutes

---

## Prerequisites

Before starting, ensure you have:

- [ ] Phase 1 modules working (Fixed Assets, Cost Centers, Tax, Bank Reconciliation, CRM)
- [ ] Node.js 20+ and Python 3.12 installed
- [ ] Supabase project configured (existing Phase 1 database)
- [ ] `.env` file configured with database credentials
- [ ] Email service configured (for 2FA and approval notifications)

---

## Step 1: Database Migration

Run the SQL migrations to create all Phase 2 tables:

```bash
# From repository root
cd backend

# Run migration script
python -m app.db.migrations.phase2
```

**What this does**:
1. Creates 15 new tables (branches, approvals, budgets, roles, audit, manufacturing)
2. Adds `branch_id` column to all Phase 1 transactional tables
3. Creates Row-Level Security policies
4. Creates materialized view for budget vs actual
5. Seeds predefined system roles (Super Admin, Admin, Accountant, etc.)

**Verify migration**:
```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'bom_%' 
OR table_name LIKE 'production_%'
OR table_name LIKE 'approval_%'
OR table_name LIKE 'budget_%'
OR table_name LIKE 'audit_%';

-- Check roles seeded
SELECT name, is_system FROM roles ORDER BY id;
```

Expected output: 20+ tables, 9 system roles

---

## Step 2: Backend Setup

### Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

New dependencies for Phase 2:
- `passlib[bcrypt]` - Password/OTP hashing
- `fastapi-pagination` - Pagination support
- `psycopg2-binary` - PostgreSQL driver

### Configure environment variables

Add to `.env`:

```env
# 2FA Configuration
OTP_EXPIRY_MINUTES=5
OTP_MAX_REQUESTS_PER_HOUR=3

# Email Configuration (verify existing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=Accountify <noreply@accountify.com>

# Branch Configuration
DEFAULT_BRANCH_ID=1
ENABLE_BRANCH_ISOLATION=true

# Audit Configuration
AUDIT_LOG_RETENTION_DAYS=90
ENABLE_AUDIT_TRAIL=true
```

### Run backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify backend is running:
```bash
curl http://localhost:8000/api/v1/health
# Expected: {"status": "healthy", "database": "connected"}
```

---

## Step 3: Frontend Setup

### Install dependencies

```bash
cd frontend
npm install
```

New dependencies for Phase 2:
- `react-hook-form` - Form handling
- `zod` - Schema validation
- `recharts` - Budget charts

### Configure environment

Verify `.env.local` has:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_ENABLE_2FA=true
NEXT_PUBLIC_DEFAULT_CURRENCY=PKR
```

### Run frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3000

---

## Step 4: Test Multi-Branch Setup

### Create first branch

1. Login as Super Admin
2. Navigate to **Settings → Branches**
3. Click **New Branch**
4. Fill in:
   - Name: "Karachi Head Office"
   - Code: "KHI-01"
   - Address: "Your address"
   - Check "Is Default"
5. Save

### Create second branch

1. Click **New Branch** again
2. Fill in:
   - Name: "Lahore Branch"
   - Code: "LHR-01"
   - Uncheck "Is Default"
3. Save

### Test branch selector

1. Look at header - you should see branch dropdown
2. Switch between "Karachi Head Office" and "Lahore Branch"
3. Verify dashboard data changes based on selected branch

**Expected**: Branch selector shows current branch, data filters accordingly

---

## Step 5: Test RBAC

### Create test user

1. Navigate to **Settings → Users**
2. Click **New User**
3. Create user:
   - Name: "Test Cashier"
   - Email: "cashier@test.com"
   - Role: "Cashier"
   - Branch: "Karachi Head Office"
4. Save

### Test permissions

1. Logout
2. Login as "cashier@test.com"
3. Verify:
   - ✅ Can see Sales module
   - ✅ Can create sales invoices
   - ❌ Cannot see Reports module (hidden)
   - ❌ Cannot delete invoices (no delete permission)

**Expected**: UI shows/hides modules based on role permissions

---

## Step 6: Test 2FA

### Enable 2FA

1. Login as any user
2. Navigate to **Profile → Security**
3. Click **Enable 2FA**
4. System sends OTP to email

### Verify 2FA

1. Logout
2. Login with username/password
3. System prompts for OTP
4. Check email for 6-digit code
5. Enter OTP
6. Verify successful login

**Expected**: OTP required, expires in 5 minutes

---

## Step 7: Test Approval Workflow

### Create approval workflow

1. Login as Admin
2. Navigate to **Settings → Approval Workflows**
3. Click **New Workflow**
4. Configure:
   - Name: "Purchase Order Approval"
   - Module: "Purchase Orders"
   - Condition: Amount >= 50,000
   - Level 1: Store Manager (auto-approve below 10,000)
   - Level 2: Finance Manager (50,000 - 200,000)
   - Level 3: CFO (>= 200,000)
5. Save

### Test approval flow

1. Create purchase order for Rs. 75,000
2. Submit for approval
3. Logout
4. Login as Store Manager
5. See pending approval in dashboard
6. Approve with comments
7. System routes to Finance Manager (Level 2)
8. Logout
9. Login as Finance Manager
10. Approve final level
11. Purchase order status changes to "Approved"

**Expected**: Multi-level approval chain works, email notifications sent

---

## Step 8: Test Budget Management

### Create budget

1. Navigate to **Budgets → New Budget**
2. Configure:
   - Fiscal Year: 2026
   - Name: "Annual Budget 2026"
   - Add lines:
     - Account: Marketing Expenses, Jan-Dec: 100,000/month
     - Account: Travel Expenses, Jan-Dec: 40,000/month
3. Submit for approval
4. Admin approves budget

### Test budget vs actual

1. Record actual expenses (create transactions in Marketing account)
2. Navigate to **Budgets → 2026 Annual Budget**
3. Click **Vs Actual** tab
4. Verify:
   - Budget amount shown
   - Actual spending shown
   - Variance calculated
   - Over-budget alerts triggered if applicable

**Expected**: Live budget vs actual comparison, variance alerts

---

## Step 9: Test BOM & Production

### Create BOM

1. Navigate to **Manufacturing → BOM**
2. Click **New BOM**
3. Select Product: "Finished Product A"
4. Add components:
   - Raw Material X: 2.5 KG, 5% waste
   - Raw Material Y: 1 PCS
5. Save and Activate

### Create production order

1. Navigate to **Manufacturing → Production Orders**
2. Click **New Order**
3. Select BOM: "Finished Product A v1"
4. Quantity: 100 units
5. Dates: 2026-04-01 to 2026-04-05
6. Save

### Issue materials

1. Open production order
2. Click **Issue Materials**
3. System shows required materials from BOM
4. Confirm issue
5. Verify inventory reduced

### Record output

1. Click **Record Output**
2. Quantity: 95 units (5 less than planned)
3. Actual hours: 24.5
4. Save
5. Verify:
   - Finished goods inventory increased by 95
   - WIP reduced
   - Production cost calculated

**Expected**: Full production lifecycle tracked, costs calculated

---

## Step 10: Test Audit Trail

### View audit logs

1. Navigate to **Settings → Audit Logs**
2. Filter by:
   - Table: "sales_invoices"
   - Date: Today
3. Verify logs show:
   - Who created/updated invoices
   - Old values vs new values
   - Timestamp and IP address

**Expected**: Complete audit trail of all changes

---

## Common Issues & Solutions

### Issue: Migration fails with "relation already exists"

**Solution**: Tables already created. Drop and re-run:
```sql
DROP TABLE IF EXISTS audit_logs, approval_actions, approval_requests, ... CASCADE;
-- Then re-run migration
```

### Issue: 2FA OTP not received

**Solution**:
1. Check email configuration in `.env`
2. Verify SMTP credentials are correct
3. Check spam folder
4. Test email service: `curl http://localhost:8000/api/v1/health/email`

### Issue: Branch selector not showing

**Solution**:
1. Verify user has branch_id assigned in user_roles table
2. Check if branches table has data
3. Clear browser cache and reload

### Issue: Permission denied errors

**Solution**:
1. Verify user has role assigned
2. Check role has required permissions in permissions_json
3. Logout and login again to refresh JWT claims

### Issue: Budget vs actual shows null values

**Solution**:
1. Refresh materialized view:
```sql
REFRESH MATERIALIZED VIEW mv_budget_vs_actual;
```
2. Verify GL entries exist for the fiscal year
3. Check account_id mapping in budget_lines

---

## Next Steps

After completing quickstart:

1. **Read API Contracts**: See `contracts/api-contracts.md` for endpoint details
2. **Review Data Model**: See `data-model.md` for entity relationships
3. **Start Development**: Run `/sp.tasks` to get implementation tasks
4. **Test Integration**: Write integration tests for your module

---

## Development Tips

### Backend

- Use Pydantic schemas for request/response validation
- Services contain business logic, routers are thin
- Use dependency injection for current user, branch context
- Log all errors with correlation IDs

### Frontend

- Use React Query for API calls (caching, retries)
- Permissions in Redux store, update on login
- Branch selector in header, persists selection
- Use shadcn/ui components for consistency

### Testing

```bash
# Backend tests
cd backend
pytest tests/test_approvals.py -v

# Frontend tests
cd frontend
npm test -- approvals.test.tsx
```

---

**Status**: ✅ Quickstart complete - Ready for implementation
