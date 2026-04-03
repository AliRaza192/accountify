# Implementation Plan: Phase 2 Modules

**Branch**: `001-phase-2-modules` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification for Multi-Branch, Workflow & Approvals, Budget Management, User Roles & Security, Manufacturing/BOM

## Summary

Build 5 core modules for Pakistan business coverage: (1) Multi-Branch operations with branch-wise data segregation and consolidated reporting, (2) Workflow & Approvals engine with multi-level approval chains, (3) Budget Management with live budget vs actual tracking, (4) User Roles & Security with RBAC and 2FA, (5) Manufacturing with BOM and production tracking. Implementation uses existing Next.js 16 + FastAPI stack with 15 new database tables added to existing 34 tables.

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.x (frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Pydantic (backend); Next.js 16, React 19, Tailwind CSS, shadcn/ui (frontend)
**Storage**: Supabase PostgreSQL (existing 34 tables + 15 new tables), Supabase Auth
**Testing**: pytest (backend), Jest + React Testing Library (frontend)
**Target Platform**: Web application (responsive desktop/mobile)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: <200ms p95 API response, <3s page load on 3G, <1s on broadband, 500+ concurrent users
**Constraints**: Free tier limits (Supabase 500MB, Fly.io 3 shared CPUs), FBR/SRB tax compliance, PKR default currency
**Scale/Scope**: 5 modules, 15 new tables, 39 functional requirements, 9 predefined roles, multi-branch support

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Justification |
|-----------|--------|---------------|
| **1. Pakistan-First Compliance** | ✅ PASS | Multi-branch supports Pakistani businesses with multiple locations; PKR default maintained; FBR/SRB compliance via existing Phase 1 tax modules |
| **2. AI-Native Architecture** | ✅ PASS | Gemini 2.0 Flash integration planned for: auto-categorization in budget management, predictive insights for budget vs actual, conversational queries for reports |
| **3. Spec-Driven Development** | ✅ PASS | This plan derived from approved spec.md; tasks.md will be created before implementation |
| **4. Zero Manual Code** | ✅ PASS | All code will be generated via Qwen Code CLI; PHRs created for each prompt; ADRs for architectural decisions |
| **5. Free Stack Only** | ✅ PASS | Uses existing free tiers: Vercel (frontend), Fly.io (backend), Supabase (DB), Gemini (AI); 15 new tables within 500MB limit |
| **6. Double-Entry Accounting** | ✅ PASS | Branch transfers, production transactions, budget entries all create proper journal entries with debits = credits |
| **7. Production-Ready Code** | ✅ PASS | No placeholders; complete error handling; structured logging; all 39 FRs fully implemented |
| **8. Mobile-Responsive Design** | ✅ PASS | Tailwind CSS breakpoints; branch selector and approval dashboard touch-optimized; PWA capable |
| **9. Role-Based Access Control** | ✅ PASS | FR-024 to FR-031 implement full RBAC with 9 predefined roles, module/action permissions, 2FA |
| **10. Complete Audit Trail** | ✅ PASS | audit_logs table captures all changes; approval_actions tracks approval history; login_history tracks sessions |

**GATE RESULT**: ✅ PASS - All 10 principles satisfied. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-phase-2-modules/
├── spec.md                # Feature specification (completed)
├── plan.md                # This file (in progress)
├── research.md            # Phase 0 output (to be created)
├── data-model.md          # Phase 1 output (to be created)
├── quickstart.md          # Phase 1 output (to be created)
├── contracts/             # Phase 1 output (to be created)
├── checklists/
│   └── requirements.md    # Spec quality checklist (completed)
└── tasks.md               # Phase 2 output (created by /sp.tasks)
```

### Source Code (repository root)

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
│   │   ├── audit.py           # AuditLog, LoginHistory, OTPToken
│   │   └── manufacturing.py   # BOMHeader, BOMLine, ProductionOrder, etc.
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

**Structure Decision**: Web application with backend (FastAPI) + frontend (Next.js 16) structure. Backend follows layered architecture (routers → services → models). Frontend uses App Router with feature-based organization.

## Complexity Tracking

> **GATE PASSED**: Constitution Check passed with no violations. No complexity justification needed.
