# Quickstart Guide: Phase 1 Critical Modules

**Feature**: 1-phase-1-critical-modules  
**Last Updated**: 2026-04-01  
**Status**: Ready for implementation

---

## Prerequisites

Before starting, ensure you have:

- ✅ Existing Accountify setup (Supabase, FastAPI, Next.js 16)
- ✅ 19 existing tables deployed in Supabase
- ✅ Backend running on `http://localhost:8000`
- ✅ Frontend running on `http://localhost:3000`
- ✅ Supabase CLI installed (`npm install -g supabase`)
- ✅ Python 3.12 with dependencies (`pip install -r requirements.txt`)
- ✅ Node.js 18+ with dependencies (`npm install`)

**No new dependencies required** - all modules use existing stack.

---

## Step 1: Database Migrations

Run the SQL migration to create 15 new tables:

```bash
# Navigate to backend directory
cd backend

# Apply migrations via Supabase CLI
supabase db push --db-url "your-supabase-connection-string"

# OR manually run the migration script
psql "your-supabase-connection-string" -f app/migrations/002_phase_1_modules.sql
```

**Expected Output**:
```
CREATE TABLE: fixed_assets
CREATE TABLE: asset_categories
CREATE TABLE: asset_depreciation
CREATE TABLE: asset_maintenance
CREATE TABLE: cost_centers
CREATE TABLE: cost_center_allocations
CREATE TABLE: tax_rates
CREATE TABLE: tax_returns
CREATE TABLE: wht_transactions
CREATE TABLE: bank_statements
CREATE TABLE: reconciliation_sessions
CREATE TABLE: pdcs
CREATE TABLE: leads
CREATE TABLE: crm_tickets
CREATE TABLE: loyalty_programs
CREATE INDEX: 30+ indexes created
CREATE POLICY: 15 RLS policies created
```

**Verification**:
```sql
-- Count new tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'fixed_assets', 'asset_categories', 'cost_centers', 'tax_rates',
  'bank_statements', 'pdcs', 'leads', 'crm_tickets'
);
-- Expected: 8+ tables
```

---

## Step 2: Seed Data

Insert FBR tax rates and asset categories:

```bash
# Run seed script
cd backend
python -m app.scripts.seed_phase_1
```

**Seed Data Includes**:
- 6 asset categories (Buildings, Vehicles, Computers, etc.) with FBR depreciation rates
- 5 tax rates (GST 17%, WHT 153, WHT 153A, WHT 155 Rent)
- 3 loyalty program tiers (Silver, Gold, Platinum)

**Verification**:
```sql
-- Check asset categories
SELECT name, depreciation_rate_percent FROM asset_categories;
-- Expected: 6 rows

-- Check tax rates
SELECT tax_name, rate_percent FROM tax_rates WHERE is_active = true;
-- Expected: 5+ rows
```

---

## Step 3: Backend Setup

No new dependencies needed. Verify routers are imported:

```bash
# Check router imports
cd backend
grep -r "fixed_assets" app/routers/
grep -r "tax_management" app/routers/
grep -r "crm" app/routers/
```

Add new routers to `app/main.py`:

```python
from app.routers import fixed_assets, cost_centers, tax_management, bank_reconciliation, crm

app.include_router(fixed_assets.router, prefix="/api/v1/fixed-assets", tags=["Fixed Assets"])
app.include_router(cost_centers.router, prefix="/api/v1/cost-centers", tags=["Cost Centers"])
app.include_router(tax_management.router, prefix="/api/v1/tax", tags=["Tax Management"])
app.include_router(bank_reconciliation.router, prefix="/api/v1/bank-rec", tags=["Bank Reconciliation"])
app.include_router(crm.router, prefix="/api/v1/crm", tags=["CRM"])
```

**Verification**:
```bash
# Test API endpoint
curl http://localhost:8000/api/v1/fixed-assets/health
# Expected: {"status": "ok"}
```

---

## Step 4: Frontend Setup

Add navigation links to Sidebar:

```tsx
// frontend/src/components/layout/Sidebar.tsx
<SidebarGroup title="Accounting">
  <SidebarLink href="/dashboard/fixed-assets" icon={<BuildingIcon />}>
    Fixed Assets
  </SidebarLink>
  <SidebarLink href="/dashboard/cost-centers" icon={<PieChartIcon />}>
    Cost Centers
  </SidebarLink>
  <SidebarLink href="/dashboard/tax" icon={<FileTextIcon />}>
    Tax Management
  </SidebarLink>
</SidebarGroup>

<SidebarGroup title="Banking">
  <SidebarLink href="/dashboard/banking/reconciliation" icon={<RefreshCwIcon />}>
    Bank Reconciliation
  </SidebarLink>
</SidebarGroup>

<SidebarGroup title="Sales">
  <SidebarLink href="/dashboard/crm/leads" icon={<UsersIcon />}>
    CRM & Leads
  </SidebarLink>
  <SidebarLink href="/dashboard/crm/pipeline" icon={<KanbanIcon />}>
    Sales Pipeline
  </SidebarLink>
</SidebarGroup>
```

**Verification**:
```bash
# Check for TypeScript errors
cd frontend
npm run build
# Expected: No errors
```

---

## Step 5: Test API Endpoints

Test each module with Postman or curl:

### Fixed Assets
```bash
# Create asset
curl -X POST http://localhost:8000/api/v1/fixed-assets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Toyota Corolla 2024",
    "category_id": "UUID_HERE",
    "purchase_date": "2025-01-15",
    "purchase_cost": 2000000,
    "useful_life_months": 60,
    "residual_value_percent": 10,
    "depreciation_method": "WDV"
  }'
```

### Tax Management
```bash
# Get sales tax return
curl "http://localhost:8000/api/v1/tax/sales-tax/return?period_month=1&period_year=2025" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### CRM
```bash
# Create lead
curl -X POST http://localhost:8000/api/v1/crm/leads \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ali Khan",
    "contact_phone": "0300-1234567",
    "contact_email": "ali@example.com",
    "source": "website",
    "estimated_value": 500000,
    "probability_percent": 70
  }'
```

---

## Step 6: AI Integration (Optional)

Configure Gemini 2.0 Flash for AI features:

```bash
# Add to backend .env
GEMINI_API_KEY=your_google_ai_api_key
```

**AI Features**:
- Bank transaction categorization suggestions
- Lead scoring (0-100)
- Asset category auto-suggestion
- Ticket priority prediction

**Test AI Service**:
```bash
cd backend
python -m app.services.test_gemini
# Expected: AI service connected, 15 requests/minute limit
```

---

## Common Issues & Solutions

### Issue: RLS Policy Error
```
ERROR: permission denied for table fixed_assets
```
**Solution**: Enable RLS on new tables:
```sql
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
-- Repeat for all 15 tables
```

### Issue: Migration Already Run
```
ERROR: relation "fixed_assets" already exists
```
**Solution**: Migration is idempotent. Safe to re-run or skip.

### Issue: JWT Token Missing company_id
```
ERROR: company_id not found in token
```
**Solution**: Ensure auth token includes `company_id` claim. Re-login if needed.

### Issue: Bank CSV Import Fails
```
ERROR: Invalid CSV format
```
**Solution**: Use Type A (HBL/UBL) or Type B (MCB) format. Check column mapping.

---

## Next Steps

After setup completion:

1. ✅ Run `/sp.tasks 1-phase-1-critical-modules` to generate implementation tasks
2. ✅ Start with Fixed Assets module (least dependencies)
3. ✅ Test depreciation calculation manually
4. ✅ Verify tax reports match manual calculations
5. ✅ Test bank rec with sample CSV from HBL/UBL/MCB

---

## File Structure Reference

```
backend/
├── app/
│   ├── routers/
│   │   ├── fixed_assets.py          # NEW
│   │   ├── cost_centers.py          # NEW
│   │   ├── tax_management.py        # NEW
│   │   ├── bank_reconciliation.py   # NEW
│   │   └── crm.py                   # NEW
│   ├── models/
│   │   ├── fixed_assets.py          # NEW
│   │   ├── cost_centers.py          # NEW
│   │   ├── tax_management.py        # NEW
│   │   ├── bank_reconciliation.py   # NEW
│   │   └── crm.py                   # NEW
│   └── schemas/
│       ├── fixed_assets.py          # NEW
│       ├── cost_centers.py          # NEW
│       ├── tax_management.py        # NEW
│       ├── bank_reconciliation.py   # NEW
│       └── crm.py                   # NEW

frontend/
├── src/
│   ├── app/
│   │   └── dashboard/
│   │       ├── fixed-assets/        # NEW
│   │       ├── cost-centers/        # NEW
│   │       ├── tax/                 # NEW
│   │       ├── banking/reconciliation/ # NEW
│   │       └── crm/                 # NEW
│   └── components/
│       ├── fixed-assets/            # NEW
│       ├── cost-centers/            # NEW
│       ├── tax/                     # NEW
│       ├── bank-rec/                # NEW
│       └── crm/                     # NEW
```

---

**Ready for Implementation!** 🚀
