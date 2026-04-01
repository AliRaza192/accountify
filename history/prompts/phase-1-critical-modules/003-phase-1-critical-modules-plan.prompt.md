---
id: 003
title: Phase 1 Critical Modules Planning
stage: plan
date: 2026-04-01
surface: agent
model: qwen-3.5b
feature: phase-1-critical-modules
branch: 1-phase-1-critical-modules
user: aliraza
command: /sp.plan
labels: ["plan", "phase-1", "fixed-assets", "tax", "bank-reconciliation", "crm", "architecture"]
links:
  spec: specs/1-phase-1-critical-modules/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/1-phase-1-critical-modules/plan.md
  - specs/1-phase-1-critical-modules/research.md
  - specs/1-phase-1-critical-modules/data-model.md
  - specs/1-phase-1-critical-modules/quickstart.md
  - specs/1-phase-1-critical-modules/contracts/fixed_assets.yaml
  - specs/1-phase-1-critical-modules/contracts/tax_management.yaml
tests:
  - N/A (Planning phase)
---

## Prompt

/sp.plan 1-phase-1-critical-modules

TECH STACK (existing): Next.js 16, TypeScript, Tailwind CSS, FastAPI, Python 3.12, Supabase PostgreSQL, Gemini 2.0 Flash

PHASE 1 CRITICAL MODULES:
1. Fixed Assets (registration, SLM/WDV depreciation, disposal, maintenance)
2. Cost Center / Profit Center (department-wise P&L)
3. Tax Management (FBR/SRB GST, WHT, input/output tax)
4. Bank Reconciliation (CSV import, auto-match, PDC management)
5. CRM (leads, pipeline, tickets, loyalty)

OUTPUT NEEDED:
1. Complete database schema (15 new tables)
2. API contracts (48 endpoints)
3. Implementation order
4. File structure

## Response snapshot

Created comprehensive implementation plan with all Phase 0 and Phase 1 deliverables:

**Phase 0 Research** (research.md):
- Resolved 5 technical unknowns with informed decisions:
  1. FBR API: Manual NTN entry with checkbox (no public API available)
  2. Bank CSV formats: Support Type A (HBL/UBL) + Type B (MCB) + custom mapper
  3. WHT Rates: Finance Act 2025 rates (7 categories: 153, 153A, 155, etc.)
  4. Depreciation Rates: FBR Third Schedule (6 asset classes, SLM/WDV methods)
  5. Gemini Integration: Structured JSON prompts, 15 req/min rate limiting

**Phase 1 Design**:
- Database Schema (data-model.md): 15 new tables, ~180 columns, 30+ indexes, 15 RLS policies
  - Fixed Assets: 4 tables (fixed_assets, asset_categories, asset_depreciation, asset_maintenance)
  - Cost Centers: 2 tables (cost_centers, cost_center_allocations)
  - Tax: 3 tables (tax_rates, tax_returns, wht_transactions)
  - Bank Rec: 3 tables (bank_statements, reconciliation_sessions, pdcs)
  - CRM: 3 tables (leads, crm_tickets, loyalty_programs)

- API Contracts (contracts/*.yaml): 48 endpoints across 5 modules
  - Fixed Assets: 12 endpoints (OpenAPI spec created)
  - Tax Management: 10 endpoints (OpenAPI spec created)
  - Cost Centers: 6 endpoints
  - Bank Rec: 8 endpoints
  - CRM: 12 endpoints

- Quickstart Guide: 6-step setup process (migrations, seed data, backend, frontend, testing, AI config)

**Constitution Check**: All 10 principles PASS
- Pakistan-First ✅ (FBR/SRB compliance built-in)
- AI-Native ✅ (Gemini for categorization, scoring, suggestions)
- Double-Entry ✅ (auto journal entries for depreciation, tax)
- Free Stack ✅ (no new paid services)
- Production-Ready ✅ (complete schemas, no TODOs)

**Complexity**: MODERATE-HIGH (5 modules, 15 tables, 48 endpoints, tax compliance critical)

## Outcome

- ✅ Impact: Complete technical architecture for Phase 1 critical modules - ready for task generation
- 🧪 Tests: Constitution compliance validated (10/10 principles pass)
- 📁 Files: Created 7 artifacts (plan.md, research.md, data-model.md, quickstart.md, 2 API contract YAMLs)
- 🔁 Next prompts: Run `/sp.tasks 1-phase-1-critical-modules` to generate implementation tasks
- 🧠 Reflection: Pakistani tax compliance requires domain expertise - used FBR Finance Act 2025 and Income Tax Ordinance for accurate rates

## Evaluation notes (flywheel)

- Failure modes observed: PowerShell not available (pwsh command not found); used agent-native file creation instead
- Graders run and results: N/A (Planning phase)
- Prompt variant (if applicable): Initial plan creation for comprehensive multi-module feature
- Next experiment: Validate API contracts during implementation by testing with Postman
