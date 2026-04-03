---
id: 002
title: phase-2-modules-plan
stage: plan
date: 2026-04-02
surface: agent
model: qwen-coder
feature: phase-2-modules
branch: 001-phase-2-modules
user: aliraza
command: /sp.plan 2-phase-2-important-modules
labels: ["plan", "phase-2", "architecture", "multi-branch", "approvals", "budget", "rbac", "manufacturing"]
links:
  spec: specs/001-phase-2-modules/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-phase-2-modules/plan.md
  - specs/001-phase-2-modules/research.md
  - specs/001-phase-2-modules/data-model.md
  - specs/001-phase-2-modules/contracts/api-contracts.md
  - specs/001-phase-2-modules/quickstart.md
  - .qwen/agent-context.md
tests:
  - null
---

## Prompt

/sp.plan 2-phase-2-important-modules

TECH STACK (existing — do not change):
- Frontend: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- Backend: FastAPI (Python 3.12), Supabase (PostgreSQL)
- AI: Google Gemini 2.0 Flash
- Project Path: ~/Desktop/accountify/
- Frontend: ~/Desktop/accountify/frontend/src/app/dashboard/
- Backend: ~/Desktop/accountify/backend/app/routers/

EXISTING DATABASE (19 + 15 = 34 tables already exist)

NEW TABLES NEEDED:

MODULE 1 - MULTI-BRANCH:
- branches (id, company_id, name, code, address, phone, is_default, is_active)
- branch_settings (id, branch_id, price_list_id, tax_rate, currency)

MODULE 2 - WORKFLOW & APPROVALS:
- approval_workflows (id, company_id, name, module, condition_amount, levels_json)
- approval_requests (id, company_id, workflow_id, document_type, document_id, status, requested_by, created_at)
- approval_actions (id, request_id, level, action, actioned_by, comments, actioned_at)

MODULE 3 - BUDGET:
- budgets (id, company_id, branch_id, fiscal_year, name, status, approved_by)
- budget_lines (id, budget_id, account_id, cost_center_id, jan through dec amounts, total)

MODULE 4 - USER ROLES & SECURITY:
- roles (id, company_id, name, permissions_json, is_system)
- user_roles (id, user_id, role_id, branch_id)
- audit_logs (id, company_id, user_id, action, table_name, record_id, old_values, new_values, ip_address, created_at)
- login_history (id, user_id, ip_address, user_agent, status, created_at)
- otp_tokens (id, user_id, token, expires_at, is_used)

MODULE 5 - MANUFACTURING:
- bom_headers (id, company_id, product_id, version, status, effective_date)
- bom_lines (id, bom_id, component_id, quantity, unit, waste_percent)
- production_orders (id, company_id, bom_id, quantity, status, start_date, end_date, cost_center_id)
- production_materials (id, production_order_id, product_id, required_qty, issued_qty)
- production_output (id, production_order_id, product_id, quantity, cost)

IMPLEMENTATION ORDER:
1. Database migration SQL
2. User Roles & Security (RBAC) — foundation for everything
3. Audit Trail — log all actions
4. Multi-Branch — branch selector
5. Workflow & Approvals — approval engine
6. Budget Management
7. Manufacturing / BOM

OUTPUT NEEDED:
1. Complete SQL for all new tables
2. API contracts
3. File structure
4. Step by step implementation plan

## Response snapshot

Completed Phase 1 planning for all 5 Phase 2 modules:
- Created plan.md with technical context, constitution check (passed all 10 principles), project structure
- Created research.md resolving 10 technical unknowns (RLS for branches, approval state machine, materialized views, JWT permissions, 2FA OTP, BOM strategy, audit trail, inter-branch accounting, email service, production costing)
- Created data-model.md with 20 table definitions, relationships, validation rules
- Created contracts/api-contracts.md with 40+ API endpoints, request/response schemas, error codes
- Created quickstart.md with 10-step developer onboarding guide
- Updated .qwen/agent-context.md with Phase 2 technologies and patterns
- All Phase 1 deliverables complete, ready for /sp.tasks

## Outcome

- ✅ Impact: Complete technical architecture for Phase 2 modules ready for task breakdown
- 🧪 Tests: Constitution check passed (10/10 principles), all Phase 1 gates passed
- 📁 Files: 6 files created (plan.md, research.md, data-model.md, api-contracts.md, quickstart.md, agent-context.md)
- 🔁 Next prompts: /sp.tasks to create implementation tasks
- 🧠 Reflection: Research phase resolved all unknowns; single-level BOM decision reduces complexity; RLS pattern ensures branch security

## Evaluation notes (flywheel)

- Failure modes observed: None - planning completed successfully
- Graders run and results: Constitution check PASS (10/10 principles satisfied)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Proceed to /sp.tasks for task breakdown
