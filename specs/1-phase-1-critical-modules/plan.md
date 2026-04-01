# Implementation Plan: Phase 1 Critical Modules

**Branch**: `1-phase-1-critical-modules` | **Date**: 2026-04-01 | **Spec**: [specs/1-phase-1-critical-modules/spec.md](spec.md)
**Input**: Complete specification for 5 critical modules (Fixed Assets, Cost Centers, Tax Management, Bank Reconciliation, CRM)

## Summary

Build 5 critical missing modules for Accountify to compete with Splendid Accounts Pakistan:
1. **Fixed Assets**: Asset registration, SLM/WDV depreciation, disposal, maintenance tracking
2. **Cost Centers**: Department-wise P&L allocation and reporting
3. **Tax Management**: FBR/SRB compliance with GST, WHT, input/output tax tracking
4. **Bank Reconciliation**: CSV import, auto-match algorithm, PDC management
5. **CRM**: Lead management, sales pipeline, support tickets, loyalty program

**Technical Approach**: Leverage existing Next.js 16 + FastAPI + Supabase stack. Add 15 new tables with RLS policies. Reuse existing auth, journal entry system, and UI components. AI integration via Gemini 2.0 Flash for data entry assistance.

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.x (frontend), Next.js 16
**Primary Dependencies**: FastAPI, Supabase (PostgreSQL + Auth), SQLAlchemy, Pydantic v2, Tailwind CSS, shadcn/ui, Recharts
**Storage**: Supabase PostgreSQL (existing 19 tables + 15 new tables), Supabase Storage for asset photos/documents
**Testing**: pytest (backend), React Testing Library (frontend), integration tests for API contracts
**Target Platform**: Web application (responsive desktop/mobile), Vercel (frontend), Fly.io (backend)
**Project Type**: Web application with separate frontend/backend
**Performance Goals**: <200ms p95 API response, <3s page load on 3G, bank rec auto-match 80%+ transactions, tax report <10s generation
**Constraints**: Supabase free tier (500MB DB, 2GB bandwidth), Fly.io free tier (3 shared CPU VMs), Gemini API rate limits, FBR/SRB compliance mandatory
**Scale/Scope**: 10k users, 5 modules, 15 new tables, ~50 API endpoints, ~25 frontend pages, Pakistan tax compliance

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle Compliance Assessment

| Principle | Status | Justification |
|-----------|--------|---------------|
| **I. Pakistan-First Compliance** | ✅ PASS | FBR/SRB tax compliance built-in (GST 17%, WHT schedules), PKR default, Urdu/English support in UI/reports, Pakistani bank CSV formats |
| **II. AI-Native Architecture** | ✅ PASS | Gemini 2.0 Flash integration planned for: asset data auto-complete, bank transaction matching suggestions, lead scoring, ticket categorization |
| **III. Spec-Driven Development** | ✅ PASS | This plan follows approved spec (spec.md). Tasks will be generated via `/sp.tasks`. Code generation via Qwen CLI only. |
| **IV. Zero Manual Code** | ✅ PASS | All code will be generated via Qwen Code CLI. PHRs created for all prompts. ADRs for architectural decisions. |
| **V. Free Stack Only** | ✅ PASS | Uses existing Vercel + Fly.io + Supabase free tiers. No new paid services required. |
| **VI. Double-Entry Accounting** | ✅ PASS | Fixed Assets auto-create depreciation journal entries. Cost Centers allocate to existing journal lines. Tax creates tax payable journal entries. |
| **VII. Production-Ready Code** | ✅ PASS | No placeholders/TODOs. Complete error handling. Real data structures. Logging included. |
| **VIII. Mobile-Responsive Design** | ✅ PASS | All new pages use existing Tailwind/shadcn responsive components. Kanban board touch-friendly. |
| **IX. Role-Based Access** | ✅ PASS | New tables include RLS policies. Endpoints use company_id from auth token. RBAC enforced. |
| **X. Complete Audit Trail** | ✅ PASS | All tables have created_at, updated_at, created_by. Asset disposal, tax adjustments, reconciliation logged. |

**GATE STATUS**: ✅ ALL PASS - Proceed to Phase 0 research

## Project Structure

### Documentation (this feature)

```text
specs/1-phase-1-critical-modules/
├── plan.md              # This file
├── spec.md              # Feature specification (already created)
├── research.md          # Phase 0 output (technical research)
├── data-model.md        # Phase 1 output (database schema)
├── quickstart.md        # Phase 1 output (setup guide)
├── contracts/           # Phase 1 output (API schemas)
│   ├── fixed_assets.yaml
│   ├── cost_centers.yaml
│   ├── tax_management.yaml
│   ├── bank_reconciliation.yaml
│   └── crm.yaml
└── tasks.md             # Phase 2 output (/sp.tasks command)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── routers/
│   │   ├── fixed_assets.py          # NEW: Fixed assets endpoints
│   │   ├── cost_centers.py          # NEW: Cost center endpoints
│   │   ├── tax_management.py        # NEW: Tax endpoints
│   │   ├── bank_reconciliation.py   # NEW: Bank rec endpoints
│   │   └── crm.py                   # NEW: CRM endpoints
│   ├── models/
│   │   ├── fixed_assets.py          # NEW: SQLAlchemy models
│   │   ├── cost_centers.py          # NEW
│   │   ├── tax_management.py        # NEW
│   │   ├── bank_reconciliation.py   # NEW
│   │   └── crm.py                   # NEW
│   ├── schemas/
│   │   ├── fixed_assets.py          # NEW: Pydantic schemas
│   │   ├── cost_centers.py          # NEW
│   │   ├── tax_management.py        # NEW
│   │   ├── bank_reconciliation.py   # NEW
│   │   └── crm.py                   # NEW
│   └── database.py                  # EXISTING: Supabase client
└── tests/
    ├── contract/
    │   ├── test_fixed_assets.py     # NEW: API contract tests
    │   ├── test_cost_centers.py     # NEW
    │   ├── test_tax_management.py   # NEW
    │   ├── test_bank_reconciliation.py # NEW
    │   └── test_crm.py              # NEW
    └── integration/
        ├── test_depreciation_flow.py    # NEW: End-to-end flows
        ├── test_bank_rec_flow.py        # NEW
        └── test_tax_compliance.py       # NEW

frontend/
├── src/
│   ├── app/
│   │   └── dashboard/
│   │       ├── fixed-assets/
│   │       │   ├── page.tsx             # NEW: Asset list
│   │       │   ├── new/
│   │       │   │   └── page.tsx         # NEW: Create asset
│   │       │   ├── [id]/
│   │       │   │   └── page.tsx         # NEW: Asset detail
│   │       │   └── depreciation/
│   │       │       └── page.tsx         # NEW: Depreciation schedule
│   │       ├── cost-centers/
│   │       │   ├── page.tsx             # NEW: Cost center list
│   │       │   └── [id]/
│   │       │       └── page.tsx         # NEW: Cost center P&L
│   │       ├── tax/
│   │       │   ├── page.tsx             # NEW: Tax dashboard
│   │       │   ├── sales-tax/
│   │       │   │   └── page.tsx         # NEW: Sales tax return
│   │       │   └── wht/
│   │       │       └── page.tsx         # NEW: WHT report
│   │       ├── banking/
│   │       │   └── reconciliation/
│   │       │       └── page.tsx         # NEW: Bank rec UI
│   │       └── crm/
│   │           ├── page.tsx             # NEW: CRM dashboard
│   │           ├── leads/
│   │           │   └── page.tsx         # NEW: Leads list
│   │           ├── pipeline/
│   │           │   └── page.tsx         # NEW: Kanban board
│   │           └── tickets/
│   │               └── page.tsx         # NEW: Support tickets
│   ├── components/
│   │   ├── ui/                          # EXISTING: shadcn components
│   │   ├── fixed-assets/
│   │   │   ├── asset-form.tsx           # NEW
│   │   │   ├── depreciation-table.tsx   # NEW
│   │   │   └── asset-card.tsx           # NEW
│   │   ├── cost-centers/
│   │   │   ├── cost-center-form.tsx     # NEW
│   │   │   └── department-pl.tsx        # NEW
│   │   ├── tax/
│   │   │   ├── tax-return-form.tsx      # NEW
│   │   │   └── tax-summary.tsx          # NEW
│   │   ├── bank-rec/
│   │   │   ├── csv-importer.tsx         # NEW
│   │   │   ├── transaction-matcher.tsx  # NEW
│   │   │   └── reconciliation-statement.tsx # NEW
│   │   └── crm/
│   │       ├── lead-form.tsx            # NEW
│   │       ├── pipeline-kanban.tsx      # NEW
│   │       └── ticket-board.tsx         # NEW
│   └── lib/
│       ├── api/
│       │   ├── fixed-assets.ts          # NEW: API client
│       │   ├── cost-centers.ts          # NEW
│       │   ├── tax.ts                   # NEW
│       │   ├── bank-rec.ts              # NEW
│       │   └── crm.ts                   # NEW
│       └── supabase/                    # EXISTING
└── tests/
    ├── components/
    │   ├── fixed-assets/
    │   ├── cost-centers/
    │   ├── tax/
    │   ├── bank-rec/
    │   └── crm/
    └── e2e/
        ├── fixed-assets-flow.spec.ts    # NEW: Playwright e2e
        ├── bank-rec-flow.spec.ts        # NEW
        └── crm-flow.spec.ts             # NEW
```

**Structure Decision**: Web application structure (Option 2) with separate `backend/` and `frontend/` directories. This matches existing project layout and allows independent deployment (Vercel frontend, Fly.io backend).

## Complexity Tracking

> **All Constitution Check gates passed - no violations to justify**

## Phase 0: Research Plan

### Unknowns to Resolve

1. **FBR Tax API Integration**: Does FBR provide public API for NTN/STRN verification?
   - Task: Research FBR API availability and integration patterns
   - Fallback: Manual NTN entry with validation checkbox

2. **Pakistani Bank CSV Formats**: What are the standard CSV export formats for HBL, UBL, MCB, etc.?
   - Task: Document column mappings for top 5 Pakistani banks
   - Output: Bank format reference table

3. **WHT Rates per FBR Schedule**: Current withholding tax rates for different transaction types?
   - Task: Research FBR WHT schedules 2025-26
   - Output: WHT rate table by category

4. **Depreciation Rates per Tax Law**: FBR-prescribed depreciation rates for asset categories?
   - Task: Research Income Tax Ordinance depreciation rules
   - Output: Tax depreciation rate table

5. **Gemini API Best Practices**: Rate limits, prompt patterns for financial data?
   - Task: Document Gemini 2.0 Flash limits and optimization techniques
   - Output: AI integration guidelines

**Research Output**: `research.md` with all decisions, rationales, and alternatives

## Phase 1: Design Deliverables

### 1. Database Schema (`data-model.md`)

**New Tables** (15 total):

**Fixed Assets (4 tables)**:
- `fixed_assets`: id, company_id, asset_code, name, category_id, purchase_date, purchase_cost, useful_life_months, residual_value_percent, depreciation_method, location, status, created_by, created_at, updated_at
- `asset_categories`: id, company_id, name, depreciation_rate_percent, account_code, created_at
- `asset_depreciation`: id, asset_id, period_month, period_year, depreciation_amount, accumulated_depreciation, book_value, journal_entry_id, posted_by, posted_at
- `asset_maintenance`: id, asset_id, service_date, service_type, service_provider, cost, next_service_due, notes, created_at

**Cost Centers (2 tables)**:
- `cost_centers`: id, company_id, code, name, description, status, overhead_allocation_rule, created_at
- `cost_center_allocations`: id, cost_center_id, transaction_type, transaction_id, amount, allocation_percent, created_at

**Tax Management (3 tables)**:
- `tax_rates`: id, company_id, tax_name, rate_percent, tax_type, effective_date, end_date, is_active
- `tax_returns`: id, company_id, return_period_month, return_period_year, output_tax_total, input_tax_total, net_tax_payable, filed_date, challan_number, status
- `wht_transactions`: id, company_id, transaction_date, party_id, amount, wht_category, wht_rate, wht_amount, challan_id, created_at

**Bank Reconciliation (3 tables)**:
- `bank_statements`: id, company_id, bank_account_id, statement_date, opening_balance, closing_balance, imported_at, imported_by
- `reconciliation_sessions`: id, company_id, bank_account_id, period_month, period_year, opening_balance, closing_balance_per_bank, closing_balance_per_books, difference, status, completed_at, completed_by
- `pdcs`: id, company_id, cheque_number, bank_name, cheque_date, amount, party_type, party_id, status, deposited_at, cleared_at, bounced_at, created_at

**CRM (3 tables)**:
- `leads`: id, company_id, lead_code, name, contact_phone, contact_email, source, requirement, estimated_value, probability_percent, stage, assigned_to, follow_up_date, converted_to_customer_id, created_at, updated_at
- `crm_tickets`: id, company_id, ticket_number, customer_id, issue_category, priority, assigned_to, status, description, resolution_notes, created_at, resolved_at, satisfaction_rating
- `loyalty_programs`: id, company_id, program_name, points_per_rupee, redemption_rate, tier_benefits_json, is_active

**Total**: 15 new tables, ~180 columns, 15 RLS policies, 30+ indexes

### 2. API Contracts (`contracts/*.yaml`)

**Fixed Assets** (12 endpoints):
- `GET /api/v1/fixed-assets` - List all assets
- `POST /api/v1/fixed-assets` - Create asset
- `GET /api/v1/fixed-assets/{id}` - Get asset detail
- `PUT /api/v1/fixed-assets/{id}` - Update asset
- `DELETE /api/v1/fixed-assets/{id}` - Dispose asset
- `POST /api/v1/fixed-assets/{id}/maintenance` - Log maintenance
- `POST /api/v1/fixed-assets/run-depreciation` - Run monthly depreciation
- `GET /api/v1/fixed-assets/reports/register` - Fixed Asset Register
- `GET /api/v1/fixed-assets/reports/depreciation-schedule` - Depreciation Schedule
- `GET /api/v1/fixed-assets/reports/disposal` - Asset Disposal Report

**Cost Centers** (6 endpoints):
- `GET /api/v1/cost-centers` - List cost centers
- `POST /api/v1/cost-centers` - Create cost center
- `GET /api/v1/cost-centers/{id}` - Get cost center detail
- `GET /api/v1/cost-centers/{id}/profit-loss` - Department P&L
- `POST /api/v1/cost-centers/allocate` - Allocate overhead
- `GET /api/v1/cost-centers/reports/summary` - Cost Center Summary

**Tax Management** (10 endpoints):
- `GET /api/v1/tax/rates` - List tax rates
- `POST /api/v1/tax/rates` - Create tax rate
- `GET /api/v1/tax/sales-tax/return` - Generate sales tax return
- `GET /api/v1/tax/wht/transactions` - List WHT transactions
- `POST /api/v1/tax/wht/challan` - Generate WHT challan
- `GET /api/v1/tax/reports/input-output` - Input/Output Tax Report
- `GET /api/v1/tax/reports/reconciliation` - Tax Reconciliation
- `POST /api/v1/tax/verify-ntn` - Verify NTN/STRN
- `GET /api/v1/tax/reports/sales-summary` - Sales Summary for Tax
- `GET /api/v1/tax/reports/purchase-summary` - Purchase Summary for Tax

**Bank Reconciliation** (8 endpoints):
- `POST /api/v1/bank-rec/import-statement` - Import CSV bank statement
- `GET /api/v1/bank-rec/matching-suggestions` - Get auto-match suggestions
- `POST /api/v1/bank-rec/match` - Match transactions
- `POST /api/v1/bank-rec/complete-reconciliation` - Complete reconciliation
- `GET /api/v1/bank-rec/reports/statement` - Bank Reconciliation Statement
- `GET /api/v1/bank-rec/pdcs/list` - List PDCs
- `POST /api/v1/bank-rec/pdcs/deposit` - Deposit PDC
- `GET /api/v1/bank-rec/reports/pdc-maturity` - PDC Maturity Report

**CRM** (12 endpoints):
- `GET /api/v1/crm/leads` - List leads
- `POST /api/v1/crm/leads` - Create lead
- `PUT /api/v1/crm/leads/{id}` - Update lead
- `POST /api/v1/crm/leads/{id}/convert` - Convert to customer
- `GET /api/v1/crm/pipeline` - Get pipeline Kanban data
- `PUT /api/v1/crm/pipeline/stage` - Update lead stage
- `GET /api/v1/crm/tickets` - List tickets
- `POST /api/v1/crm/tickets` - Create ticket
- `PUT /api/v1/crm/tickets/{id}` - Update ticket
- `GET /api/v1/crm/loyalty/points` - Get loyalty points
- `POST /api/v1/crm/loyalty/redeem` - Redeem points
- `GET /api/v1/crm/reports/conversion` - Lead Conversion Report

**Total**: 48 new API endpoints

### 3. Quickstart Guide (`quickstart.md`)

**Prerequisites**:
- Existing Accountify setup (Supabase, FastAPI, Next.js)
- FBR tax rate reference (provided in plan)
- Bank CSV format samples (provided in plan)

**Setup Steps**:
1. Run SQL migrations for 15 new tables
2. Enable RLS policies in Supabase
3. Seed tax rates from FBR schedule
4. Seed asset categories with depreciation rates
5. Update backend `requirements.txt` (no new deps)
6. Update frontend `.env.local` (no new vars)
7. Add navigation links to `Sidebar.tsx`
8. Test API endpoints with Postman

**AI Integration**:
- Configure Gemini 2.0 Flash API key
- Add AI prompts for: bank transaction matching, lead scoring, asset categorization
- Test AI suggestions in UI

## Complexity Assessment

**Overall Complexity**: MODERATE-HIGH
- 5 modules with interdependencies
- 15 new tables, 48 new endpoints
- Pakistan tax compliance (legally critical)
- AI integration for user experience
- Bank CSV parsing (multiple formats)

**Risk Mitigation**:
- Start with Fixed Assets (simplest, least dependencies)
- Tax compliance tested against manual calculations
- Bank rec auto-match falls back to manual matching
- All features behind feature flags for phased rollout

---

**Next Phase**: `/sp.tasks 1-phase-1-critical-modules` to generate implementation tasks
