# Tasks: Phase 2 Modules

**Input**: Design documents from `/specs/001-phase-2-modules/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: Tests are OPTIONAL - not included in this task list. Focus on implementation first.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Verify Phase 1 modules working (Fixed Assets, Cost Centers, Tax, Bank Reconciliation, CRM)
- [x] T002 [P] Install backend dependencies: passlib[bcrypt], fastapi-pagination in backend/requirements.txt
- [x] T003 [P] Install frontend dependencies: react-hook-form, zod, recharts in frontend/package.json
- [x] T004 [P] Verify .env has SMTP configuration for email service (2FA and approvals)
- [x] T005 [P] Create migration script: backend/app/db/migrations/phase2_001_initial.sql

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create database migration for roles table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T007 Create database migration for user_roles table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T008 Create database migration for audit_logs table with partitioning in backend/app/db/migrations/phase2_001_initial.sql
- [x] T009 Create database migration for login_history table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T010 Create database migration for otp_tokens table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T011 [P] Create Role model in backend/app/models/role.py
- [x] T012 [P] Create AuditLog model in backend/app/models/audit.py
- [x] T013 [P] Create LoginHistory and OTPToken models in backend/app/models/auth.py
- [x] T014 [P] Create RBAC schemas in backend/app/schemas/role.py
- [x] T015 [P] Create RBAC middleware in backend/app/middleware/rbac.py (JWT permission extraction)
- [x] T016 Create RoleService in backend/app/services/role_service.py (permission evaluation)
- [x] T017 Create AuditService in backend/app/services/audit_service.py (audit logging)
- [x] T018 Create OTPService in backend/app/services/otp_service.py (2FA logic)
- [x] T019 Create roles router in backend/app/routers/roles.py (CRUD endpoints)
- [x] T020 Create audit router in backend/app/routers/audit.py (query endpoints)
- [x] T021 Seed predefined system roles (Super Admin, Admin, Accountant, Sales Manager, Salesperson, Store Manager, HR Manager, Cashier, Viewer) in backend/app/scripts/seed_phase2.py
- [x] T022 Add audit trigger function to auto-log all changes in backend/app/db/migrations/phase2_002_audit_triggers.sql

**Checkpoint**: Foundation ready - RBAC, 2FA, and audit trail infrastructure complete. User story implementation can now begin in parallel.

---

## Phase 3: User Story 4 - Role-Based Access Control (Priority: P1) 🎯 MVP

**Goal**: Implement complete RBAC system with 9 predefined roles, module/action permissions, and 2FA

**Independent Test**: Can be fully tested by creating users with different roles and verifying each can only access their permitted modules and perform allowed actions

### Implementation for User Story 4

- [x] T023 [US4] Create UserRole model in backend/app/models/role.py (user-role assignment)
- [x] T024 [US4] Implement user_roles CRUD in backend/app/services/role_service.py
- [x] T025 [US4] Create user_roles router in backend/app/routers/roles.py (assign roles to users)
- [x] T026 [US4] Implement 2FA send OTP endpoint in backend/app/routers/auth.py (POST /auth/2fa/send-otp)
- [x] T027 [US4] Implement 2FA verify OTP endpoint in backend/app/routers/auth.py (POST /auth/2fa/verify-otp)
- [x] T028 [US4] Update JWT generation to include permissions in claims in backend/app/services/auth_service.py
- [x] T029 [US4] Create permission check decorator in backend/app/middleware/permissions.py (@require_permission)
- [ ] T030 [US4] Apply permission checks to all existing Phase 1 routers
- [x] T031 [US4] Create roles management UI in frontend/src/app/dashboard/roles/page.tsx (list roles)
- [x] T032 [US4] Create role detail page in frontend/src/app/dashboard/roles/[id]/page.tsx (view/edit permissions)
- [ ] T033 [US4] Create user role assignment UI in frontend/src/app/dashboard/users/[id]/roles/page.tsx
- [x] T034 [US4] Add 2FA enable/disable UI in frontend/src/app/dashboard/profile/security/page.tsx
- [ ] T035 [US4] Add 2FA OTP input to login flow in frontend/src/app/dashboard/login/page.tsx
- [x] T036 [US4] Implement permission-based UI hiding in frontend/src/components/PermissionGuard.tsx
- [ ] T037 [US4] Add login history view in frontend/src/app/dashboard/users/[id]/login-history/page.tsx
- [x] T038 [US4] Add audit log viewer in frontend/src/app/dashboard/audit-logs/page.tsx

**Checkpoint**: At this point, User Story 4 (RBAC) should be fully functional - users can be assigned roles, 2FA works, permissions enforced, audit trail active.

---

## Phase 4: User Story 1 - Multi-Branch Operations (Priority: P1) 🎯

**Goal**: Implement multi-branch support with branch-wise data segregation and consolidated reporting

**Independent Test**: Can be fully tested by creating two branches, entering branch-specific transactions, and verifying that each branch only sees its own data while consolidated reports show combined data

### Implementation for User Story 1

- [x] T039 [US1] Create database migration for branches table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T040 [US1] Create database migration for branch_settings table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T041 [US1] Add branch_id column to all Phase 1 transactional tables in backend/app/db/migrations/phase2_001_initial.sql
- [x] T042 [US1] Create RLS policies for branch isolation in backend/app/db/migrations/phase2_001_initial.sql
- [x] T043 [P] [US1] Create Branch and BranchSettings models in backend/app/models/branch.py
- [x] T044 [P] [US1] Create Branch schemas in backend/app/schemas/branch.py
- [x] T045 [US1] Create BranchService in backend/app/services/branch_service.py (CRUD, consolidation logic)
- [x] T046 [US1] Create branches router in backend/app/routers/branches.py (CRUD endpoints)
- [ ] T047 [US1] Implement inter-branch transfer endpoint in backend/app/routers/branches.py (POST /branches/transfer)
- [ ] T048 [US1] Implement consolidated reports endpoint in backend/app/routers/reports.py (GET /branches/reports/consolidated)
- [ ] T049 [US1] Add branch context to JWT claims in backend/app/services/auth_service.py
- [ ] T050 [US1] Create branch context middleware in backend/app/middleware/branch_context.py (set app.current_branch)
- [ ] T051 [US1] Create branch management UI in frontend/src/app/dashboard/branches/page.tsx (list branches)
- [ ] T052 [US1] Create branch detail page in frontend/src/app/dashboard/branches/[id]/page.tsx
- [ ] T053 [US1] Create branch form component in frontend/src/app/dashboard/branches/create/page.tsx
- [ ] T054 [US1] Implement branch selector in header in frontend/src/app/dashboard/layout.tsx
- [ ] T055 [US1] Create inter-branch transfer UI in frontend/src/app/dashboard/branches/transfer/page.tsx
- [ ] T056 [US1] Create consolidated reports UI in frontend/src/app/dashboard/reports/consolidated/page.tsx
- [ ] T057 [US1] Update all Phase 1 transaction forms to include branch_id field

**Checkpoint**: At this point, User Story 1 (Multi-Branch) should be fully functional - branches can be created, data segregated by branch, consolidated reports work.

---

## Phase 5: User Story 2 - Approval Workflow Management (Priority: P1) 🎯

**Goal**: Implement approval workflow engine with multi-level approvals and email notifications

**Independent Test**: Can be fully tested by creating a purchase order above the approval limit and verifying it requires manager approval before being processed

### Implementation for User Story 2

- [x] T058 [US2] Create database migration for approval_workflows table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T059 [US2] Create database migration for approval_requests table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T060 [US2] Create database migration for approval_actions table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T061 [P] [US2] Create ApprovalWorkflow model in backend/app/models/approval.py
- [x] T062 [P] [US2] Create ApprovalRequest and ApprovalAction models in backend/app/models/approval.py
- [x] T063 [P] [US2] Create approval schemas in backend/app/schemas/approval.py
- [x] T064 [US2] Create ApprovalEngine in backend/app/services/approval_engine.py (workflow evaluation, state machine)
- [x] T065 [US2] Create approval workflows router in backend/app/routers/approvals.py (workflow CRUD)
- [x] T066 [US2] Create approval requests router in backend/app/routers/approvals.py (request endpoints)
- [x] T067 [US2] Implement approve endpoint in backend/app/routers/approvals.py (POST /approvals/requests/:id/approve)
- [x] T068 [US2] Implement reject endpoint in backend/app/routers/approvals.py (POST /approvals/requests/:id/reject)
- [ ] T069 [US2] Integrate email service for approval notifications in backend/app/services/email_service.py
- [ ] T070 [US2] Add approval status to existing Phase 1 routers (purchase orders, expenses, payments)
- [ ] T071 [US2] Create approval workflow configuration UI in frontend/src/app/dashboard/approvals/workflows/page.tsx
- [ ] T072 [US2] Create pending approvals dashboard in frontend/src/app/dashboard/approvals/page.tsx
- [ ] T073 [US2] Create approval detail page in frontend/src/app/dashboard/approvals/[id]/page.tsx
- [ ] T074 [US2] Add approval history view in frontend/src/app/dashboard/approvals/[id]/history/page.tsx
- [ ] T075 [US2] Add approval status badges to existing Phase 1 forms (purchase orders, expenses)
- [ ] T076 [US2] Implement email notification templates for approval requests in backend/app/templates/emails/approval_request.html

**Checkpoint**: At this point, User Story 2 (Approvals) should be fully functional - workflows configured, documents routed for approval, managers can approve/reject from dashboard.

---

## Phase 6: User Story 3 - Budget Management (Priority: P2)

**Goal**: Implement budget creation, tracking, and budget vs actual comparison

**Independent Test**: Can be fully tested by creating a budget, recording actual transactions, and verifying that the budget vs actual comparison shows correct variance

### Implementation for User Story 3

- [x] T077 [US3] Create database migration for budgets table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T078 [US3] Create database migration for budget_lines table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T079 [US3] Create materialized view for budget vs actual in backend/app/db/migrations/phase2_001_initial.sql
- [x] T080 [US3] Create refresh trigger for materialized view in backend/app/db/migrations/phase2_001_initial.sql
- [x] T081 [P] [US3] Create Budget and BudgetLine models in backend/app/models/budget.py
- [x] T082 [P] [US3] Create budget schemas in backend/app/schemas/budget.py
- [x] T083 [US3] Create BudgetService in backend/app/services/budget_service.py (CRUD, variance calculations)
- [x] T084 [US3] Create budgets router in backend/app/routers/budgets.py (CRUD endpoints)
- [x] T085 [US3] Implement budget vs actual endpoint in backend/app/routers/budgets.py (GET /budgets/:id/vs-actual)
- [x] T086 [US3] Implement budget variance report endpoint in backend/app/routers/budgets.py (GET /budgets/reports/variance)
- [ ] T087 [US3] Implement budget alerts service in backend/app/services/budget_alert_service.py
- [ ] T088 [US3] Create budget management UI in frontend/src/app/dashboard/budgets/page.tsx (list budgets)
- [ ] T089 [US3] Create budget detail page in frontend/src/app/dashboard/budgets/[id]/page.tsx
- [ ] T090 [US3] Create budget creation form in frontend/src/app/dashboard/budgets/create/page.tsx
- [ ] T091 [US3] Create budget vs actual chart in frontend/src/app/dashboard/budgets/[id]/vs-actual/page.tsx
- [ ] T092 [US3] Create budget variance report UI in frontend/src/app/dashboard/budgets/reports/variance/page.tsx
- [ ] T093 [US3] Add budget alert notifications in frontend/src/components/BudgetAlerts.tsx

**Checkpoint**: At this point, User Story 3 (Budget) should be fully functional - budgets created, live budget vs actual comparison, variance alerts working.

---

## Phase 7: User Story 5 - Manufacturing and BOM Management (Priority: P2)

**Goal**: Implement BOM, production orders, material tracking, and MRP

**Independent Test**: Can be fully tested by creating a BOM, issuing materials to production, recording finished goods, and verifying WIP tracking and cost calculation

### Implementation for User Story 5

- [x] T094 [US5] Create database migration for bom_headers table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T095 [US5] Create database migration for bom_lines table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T096 [US5] Create database migration for production_orders table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T097 [US5] Create database migration for production_materials table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T098 [US5] Create database migration for production_output table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T099 [US5] Create database migration for scrap_records table in backend/app/db/migrations/phase2_001_initial.sql
- [x] T100 [P] [US5] Create BOMHeader and BOMLine models in backend/app/models/manufacturing.py
- [x] T101 [P] [US5] Create ProductionOrder, ProductionMaterial, ProductionOutput, ScrapRecord models in backend/app/models/manufacturing.py
- [x] T102 [P] [US5] Create manufacturing schemas in backend/app/schemas/manufacturing.py
- [x] T103 [US5] Create ManufacturingService in backend/app/services/manufacturing_service.py (BOM, production logic)
- [x] T104 [US5] Create MRPService in backend/app/services/mrp_service.py (material requirement planning)
- [x] T105 [US5] Create manufacturing router in backend/app/routers/manufacturing.py (BOM endpoints)
- [x] T106 [US5] Implement BOM activate endpoint in backend/app/routers/manufacturing.py (POST /manufacturing/bom/:id/activate)
- [x] T107 [US5] Implement material issue endpoint in backend/app/routers/manufacturing.py (POST /manufacturing/orders/:id/materials/issue)
- [x] T108 [US5] Implement output recording endpoint in backend/app/routers/manufacturing.py (POST /manufacturing/orders/:id/output)
- [x] T109 [US5] Implement scrap recording endpoint in backend/app/routers/manufacturing.py (POST /manufacturing/orders/:id/scrap)
- [x] T110 [US5] Implement MRP endpoint in backend/app/routers/manufacturing.py (GET /manufacturing/mrp)
- [x] T111 [US5] Implement production cost calculation in backend/app/services/manufacturing_service.py
- [ ] T112 [US5] Create BOM management UI in frontend/src/app/dashboard/manufacturing/bom/page.tsx
- [ ] T113 [US5] Create BOM detail page in frontend/src/app/dashboard/manufacturing/bom/[id]/page.tsx
- [ ] T114 [US5] Create production orders UI in frontend/src/app/dashboard/manufacturing/orders/page.tsx
- [ ] T115 [US5] Create production order detail page in frontend/src/app/dashboard/manufacturing/orders/[id]/page.tsx
- [ ] T116 [US5] Create MRP planning UI in frontend/src/app/dashboard/manufacturing/mrp/page.tsx
- [ ] T117 [US5] Add WIP tracking to inventory dashboard in frontend/src/app/dashboard/inventory/page.tsx

**Checkpoint**: At this point, User Story 5 (Manufacturing) should be fully functional - BOMs created, production orders tracked, materials issued, finished goods recorded, MRP working.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T118 [P] Update quickstart.md with verified setup steps
- [ ] T119 [P] Create API documentation using FastAPI OpenAPI in backend/docs/
- [ ] T119 Add Gemini AI integration for budget auto-categorization in backend/app/services/ai_budget_service.py
- [ ] T120 Add Gemini AI for conversational report queries in backend/app/services/ai_query_service.py
- [ ] T121 [P] Add comprehensive error handling across all new endpoints
- [ ] T122 [P] Add structured logging with correlation IDs in all services
- [ ] T123 [P] Performance optimization: add indexes on frequently queried columns
- [ ] T124 [P] Security hardening: validate all inputs, sanitize outputs
- [ ] T125 [P] Update .qwen/agent-context.md with Phase 2 implementation details
- [ ] T126 Run quickstart.md validation - verify all 10 steps work
- [ ] T127 Create deployment checklist for Phase 2 modules in DEPLOYMENT.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

| User Story | Priority | Depends On | Can Start After |
|------------|----------|------------|-----------------|
| US4 (RBAC) | P1 | Foundational (Phase 2) | T022 complete |
| US1 (Multi-Branch) | P1 | Foundational (Phase 2) | T022 complete |
| US2 (Approvals) | P1 | Foundational (Phase 2), US4 | T022 complete |
| US3 (Budget) | P2 | Foundational (Phase 2), US1 | T022 complete |
| US5 (Manufacturing) | P2 | Foundational (Phase 2), US1 | T022 complete |

**Note**: While all user stories technically depend only on Foundational phase, there are soft dependencies:
- US2 (Approvals) benefits from US4 (RBAC) being complete first (approvers are roles)
- US3 (Budget) and US5 (Manufacturing) benefit from US1 (Multi-Branch) for branch-level tracking

### Within Each User Story

1. Models before services
2. Services before endpoints/routers
3. Core implementation before integration
4. Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
- T002, T003, T004, T005 can all run in parallel (different files)

**Phase 2 (Foundational)**:
- T011, T012, T013, T014, T015 can run in parallel (models, schemas, middleware)
- T006-T010 are sequential (migration order matters)

**User Stories**:
- Once Phase 2 completes, all 5 user stories can proceed in parallel with different developers
- Within each story, models (marked [P]) can be created in parallel

**Example Parallel Execution (US4 - RBAC)**:
```bash
# These can run in parallel:
T023: Create UserRole model
T024: Implement user_roles CRUD service
T025: Create user_roles router
```

---

## Parallel Example: User Story 4 (RBAC)

```bash
# Launch all models for User Story 4 together:
Task T023: "Create UserRole model in backend/app/models/role.py"
Task T024: "Implement user_roles CRUD in backend/app/services/user_role_service.py"

# Launch UI components in parallel:
Task T031: "Create roles management UI in frontend/src/app/dashboard/roles/page.tsx"
Task T032: "Create role detail page in frontend/src/app/dashboard/roles/[id]/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 4 - RBAC Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T022) - **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 4 (T023-T038)
4. **STOP and VALIDATE**: Test RBAC independently
   - Create test users with different roles
   - Verify permission enforcement
   - Test 2FA flow
   - Verify audit trail logging
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready (RBAC, audit, 2FA infrastructure)
2. Add User Story 4 (RBAC) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 1 (Multi-Branch) → Test independently → Deploy/Demo
4. Add User Story 2 (Approvals) → Test independently → Deploy/Demo
5. Add User Story 3 (Budget) → Test independently → Deploy/Demo
6. Add User Story 5 (Manufacturing) → Test independently → Deploy/Demo

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T022)
2. Once Foundational is done:
   - Developer A: User Story 4 (RBAC) - T023-T038
   - Developer B: User Story 1 (Multi-Branch) - T039-T057
   - Developer C: User Story 2 (Approvals) - T058-T076
3. After P1 stories complete:
   - Developer A: User Story 3 (Budget) - T077-T093
   - Developer B: User Story 5 (Manufacturing) - T094-T117
4. All developers: Polish phase (T118-T127)

---

## Task Summary

| Phase | Description | Task Count | Story |
|-------|-------------|------------|-------|
| Phase 1 | Setup | 5 | - |
| Phase 2 | Foundational | 17 | - |
| Phase 3 | User Story 4 (RBAC) | 16 | US4 |
| Phase 4 | User Story 1 (Multi-Branch) | 19 | US1 |
| Phase 5 | User Story 2 (Approvals) | 19 | US2 |
| Phase 6 | User Story 3 (Budget) | 17 | US3 |
| Phase 7 | User Story 5 (Manufacturing) | 24 | US5 |
| Phase 8 | Polish | 10 | - |
| **Total** | **All Phases** | **127 tasks** | **5 stories** |

### Task Count by User Story

- **US1 (Multi-Branch)**: 19 tasks (T039-T057)
- **US2 (Approvals)**: 19 tasks (T058-T076)
- **US3 (Budget)**: 17 tasks (T077-T093)
- **US4 (RBAC)**: 16 tasks (T023-T038)
- **US5 (Manufacturing)**: 24 tasks (T094-T117)

### Independent Test Criteria

| Story | Independent Test |
|-------|------------------|
| US4 | Create users with different roles, verify module/action access enforced |
| US1 | Create 2 branches, enter branch transactions, verify segregation + consolidation |
| US2 | Create PO above limit, verify approval required, approve from dashboard |
| US3 | Create budget, record transactions, verify budget vs actual shows variance |
| US5 | Create BOM, issue materials, record output, verify WIP and cost tracking |

### Suggested MVP Scope

**Minimum Viable Product**: User Story 4 (RBAC) + Foundational

- Complete RBAC with 9 predefined roles
- 2FA via email OTP
- Complete audit trail
- Login history tracking

This provides immediate value: secure, auditable system with proper access control. All other modules (branches, approvals, budget, manufacturing) then build on this foundation.

---

## Notes

- **[P]** tasks = different files, no dependencies, can run in parallel
- **[Story]** label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Format validation**: ALL 127 tasks follow the checklist format (checkbox, ID, optional [P], optional [Story], description with file path)
