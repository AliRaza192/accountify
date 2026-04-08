# Tasks: Phase 3 Value-Add Modules

**Input**: Design documents from `/specs/2-phase-3-value-add-modules/`  
**Prerequisites**: spec.md ✓, plan.md ✓

**Tests**: Tests are OPTIONAL - not included in this task list. Focus on implementation first.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] [Setup] Create directory structure for Phase 3 modules (backend/app/routers/, models/, schemas/)
- [ ] T002 [P] [Setup] Create directory structure for frontend pages (frontend/src/app/dashboard/projects/, bi/, reports/)
- [ ] T003 [P] [Setup] Verify database supports materialized views (PostgreSQL 9.3+)
- [ ] T004 [P] [Setup] Create migration file backend/app/db/migrations/phase3_001_initial.sql

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 [P] [Foundation] Create Project, ProjectPhase, ProjectCost, ProjectRevenue models in backend/app/models/project_costing.py
- [ ] T006 [P] [Foundation] Create project_costing schemas in backend/app/schemas/project_costing.py
- [ ] T007 [P] [Foundation] Create ProjectService in backend/app/services/project_service.py
- [ ] T008 [P] [Foundation] Create FinancialReportService in backend/app/services/financial_report_service.py
- [ ] T009 [P] [Foundation] Create materialized views for BI in backend/app/db/migrations/phase3_002_bi_views.sql
- [ ] T010 [Foundation] Add project_costing router registration to backend/app/main.py
- [ ] T011 [Foundation] Add financial_report router registration to backend/app/main.py

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Project / Job Costing (Priority: P3) 🎯 MVP

**Goal**: Create projects, allocate costs from multiple sources, generate profitability & Budget vs Actual reports

**Independent Test**: Can be fully tested by creating a project with budget, recording expenses against it, and verifying the project profitability report shows correct revenue, costs, and profit margin

### Implementation for User Story 1

- [ ] T012 [US1] Create database migration for projects table in backend/app/db/migrations/phase3_001_initial.sql
- [ ] T013 [US1] Create database migration for project_phases table in backend/app/db/migrations/phase3_001_initial.sql
- [ ] T014 [US1] Create database migration for project_costs table in backend/app/db/migrations/phase3_001_initial.sql
- [ ] T015 [US1] Create database migration for project_revenue table in backend/app/db/migrations/phase3_001_initial.sql
- [ ] T016 [P] [US1] Create ProjectService CRUD methods (create, update, delete, get)
- [ ] T017 [P] [US1] Implement allocate_cost method in ProjectService (from invoices, expenses, payroll, journals)
- [ ] T018 [P] [US1] Implement calculate_profitability method in ProjectService
- [ ] T019 [P] [US1] Implement get_budget_vs_actual method in ProjectService
- [ ] T020 [US1] Create project_costing router in backend/app/routers/project_costing.py
- [ ] T021 [US1] Add POST /api/v1/projects endpoint for project creation
- [ ] T022 [US1] Add GET /api/v1/projects endpoint for project list
- [ ] T023 [US1] Add GET /api/v1/projects/{id} endpoint for project detail
- [ ] T024 [US1] Add POST /api/v1/projects/{id}/costs endpoint for cost allocation
- [ ] T025 [US1] Add GET /api/v1/projects/{id}/profitability endpoint for profitability report
- [ ] T026 [US1] Add GET /api/v1/projects/{id}/budget-vs-actual endpoint for budget variance
- [ ] T027 [P] [US1] Create ProjectForm component in frontend/src/components/projects/project-form.tsx
- [ ] T028 [P] [US1] Create CostAllocationForm component in frontend/src/components/projects/cost-form.tsx
- [ ] T029 [P] [US1] Create ProfitabilityReport component in frontend/src/components/projects/profitability.tsx
- [ ] T030 [US1] Create project list page in frontend/src/app/dashboard/projects/page.tsx
- [ ] T031 [US1] Create project detail page in frontend/src/app/dashboard/projects/[id]/page.tsx
- [ ] T032 [US1] Create project costs page in frontend/src/app/dashboard/projects/[id]/costs/page.tsx
- [ ] T033 [US1] Create new project page in frontend/src/app/dashboard/projects/new/page.tsx
- [ ] T034 [US1] Create profitability report page in frontend/src/app/dashboard/projects/reports/profitability/page.tsx
- [ ] T035 [US1] Create budget vs actual page in frontend/src/app/dashboard/projects/reports/budget-vs-actual/page.tsx
- [ ] T036 [US1] Add Projects navigation link to Sidebar.tsx
- [ ] T037 [US1] Add API client functions in frontend/src/lib/api/projects.ts

**Checkpoint**: At this point, User Story 1 (Project Costing) should be fully functional and testable independently

---

## Phase 4: User Story 3 - Advanced Financial Reports (Priority: P3) 🎯

**Goal**: Generate Cash Flow, Funds Flow, Statement of Changes in Equity, Financial Ratio Analysis reports

**Independent Test**: Can be fully tested by generating a Cash Flow Statement for a fiscal year and verifying it balances (opening cash + net cash flow = closing cash)

### Implementation for User Story 3

- [ ] T038 [P] [US3] Implement generate_cash_flow_statement method in FinancialReportService (indirect method)
- [ ] T039 [P] [US3] Implement generate_funds_flow_statement method in FinancialReportService
- [ ] T040 [P] [US3] Implement generate_equity_statement method in FinancialReportService
- [ ] T041 [P] [US3] Implement calculate_financial_ratios method in FinancialReportService
- [ ] T042 [US3] Create financial_reports router in backend/app/routers/financial_reports.py
- [ ] T043 [US3] Add GET /api/v1/reports/advanced/cash-flow endpoint
- [ ] T044 [US3] Add GET /api/v1/reports/advanced/funds-flow endpoint
- [ ] T045 [US3] Add GET /api/v1/reports/advanced/equity endpoint
- [ ] T046 [US3] Add GET /api/v1/reports/advanced/ratios endpoint
- [ ] T047 [US3] Add export endpoints (Excel, PDF) for all advanced reports
- [ ] T048 [P] [US3] Create CashFlowStatement component in frontend/src/components/reports/cash-flow.tsx
- [ ] T049 [P] [US3] Create FundsFlowStatement component in frontend/src/components/reports/funds-flow.tsx
- [ ] T050 [P] [US3] Create EquityStatement component in frontend/src/components/reports/equity.tsx
- [ ] T051 [P] [US3] Create FinancialRatios component in frontend/src/components/reports/ratios.tsx
- [ ] T052 [US3] Create cash flow report page in frontend/src/app/dashboard/reports/cash-flow/page.tsx
- [ ] T053 [US3] Create funds flow report page in frontend/src/app/dashboard/reports/funds-flow/page.tsx
- [ ] T054 [US3] Create equity report page in frontend/src/app/dashboard/reports/equity/page.tsx
- [ ] T055 [US3] Create ratios report page in frontend/src/app/dashboard/reports/ratios/page.tsx
- [ ] T056 [US3] Add export buttons (Excel, PDF) to all advanced report pages
- [ ] T057 [US3] Add Advanced Reports to reports submenu in Sidebar.tsx
- [ ] T058 [US3] Add API client functions in frontend/src/lib/api/financial-reports.ts

**Checkpoint**: At this point, User Stories 1 AND 3 should both work independently

---

## Phase 5: User Story 2 - Business Intelligence & Analytics (Priority: P3)

**Goal**: Interactive BI dashboard with KPI cards, trend charts, drill-down, and export

**Independent Test**: Can be fully tested by viewing the BI dashboard, filtering by date range, drilling down into a metric, and exporting the data to Excel

### Implementation for User Story 2

- [ ] T059 [P] [US2] Create materialized view for revenue trends in backend/app/db/migrations/phase3_002_bi_views.sql
- [ ] T060 [P] [US2] Create materialized view for expense trends in backend/app/db/migrations/phase3_002_bi_views.sql
- [ ] T061 [P] [US2] Create materialized view for KPI metrics in backend/app/db/migrations/phase3_002_bi_views.sql
- [ ] T062 [US2] Create BI Service in backend/app/services/bi_service.py (aggregations, trends)
- [ ] T063 [US2] Implement get_kpi_metrics method in BI Service
- [ ] T064 [US2] Implement get_revenue_trends method in BI Service
- [ ] T065 [US2] Implement get_expense_trends method in BI Service
- [ ] T066 [US2] Implement get_financial_ratios method in BI Service
- [ ] T067 [US2] Implement export_to_excel method in BI Service
- [ ] T068 [US2] Create bi_dashboard router in backend/app/routers/bi_dashboard.py
- [ ] T069 [US2] Add GET /api/v1/bi/dashboard endpoint for KPI metrics
- [ ] T070 [US2] Add GET /api/v1/bi/revenue-trends endpoint
- [ ] T071 [US2] Add GET /api/v1/bi/expense-trends endpoint
- [ ] T072 [US2] Add GET /api/v1/bi/ratios endpoint
- [ ] T073 [US2] Add GET /api/v1/bi/export endpoint for Excel export
- [ ] T074 [P] [US2] Create KPICard component in frontend/src/components/bi/kpi-card.tsx (with trend indicator)
- [ ] T075 [P] [US2] Create TrendChart component in frontend/src/components/bi/trend-chart.tsx (line/bar chart)
- [ ] T076 [P] [US2] Create RatioGauge component in frontend/src/components/bi/ratio-gauge.tsx (gauge visualization)
- [ ] T077 [US2] Create BI dashboard page in frontend/src/app/dashboard/bi/page.tsx
- [ ] T078 [US2] Create revenue trends page in frontend/src/app/dashboard/bi/trends/page.tsx
- [ ] T079 [US2] Create financial ratios page in frontend/src/app/dashboard/bi/ratios/page.tsx
- [ ] T080 [US2] Add date range filter to BI dashboard
- [ ] T081 [US2] Add export button (Excel) to BI dashboard
- [ ] T082 [US2] Add BI Dashboard navigation link to Sidebar.tsx
- [ ] T083 [US2] Add API client functions in frontend/src/lib/api/bi.ts

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Mobile App (Priority: P3) [OPTIONAL]

**Goal**: React Native mobile app with dashboard, approvals, invoices, and sharing

**Independent Test**: Can be fully tested by installing the mobile app, logging in, viewing the dashboard, approving a pending invoice, and generating a customer statement

**Note**: This is OPTIONAL and can be deferred to Phase 3B or later sprint

### Implementation for User Story 4

- [ ] T084 [US4] Initialize React Native app with Expo in mobile/ directory
- [ ] T085 [US4] Configure TypeScript and ESLint in mobile/
- [ ] T086 [US4] Setup navigation (React Navigation) with tabs
- [ ] T087 [US4] Create Login screen in mobile/app/(auth)/login.tsx
- [ ] T088 [US4] Create Dashboard screen in mobile/app/(tabs)/dashboard.tsx
- [ ] T089 [US4] Create Approvals screen in mobile/app/(tabs)/approvals.tsx
- [ ] T090 [US4] Create Invoices screen in mobile/app/(tabs)/invoices.tsx
- [ ] T091 [US4] Create API client in mobile/lib/api.ts
- [ ] T092 [US4] Create Auth context in mobile/lib/auth.ts
- [ ] T093 [US4] Create KPICard component in mobile/components/KPICard.tsx
- [ ] T094 [US4] Create ApprovalCard component in mobile/components/ApprovalCard.tsx
- [ ] T095 [US4] Implement share functionality (WhatsApp, Email) using React Native Share API
- [ ] T096 [US4] Implement offline caching with AsyncStorage
- [ ] T097 [US4] Build iOS app (expo run:ios)
- [ ] T098 [US4] [Optional] Build Android app (expo run:android)

**Checkpoint**: At this point, mobile app should be functional for basic business operations

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T099 [P] Add loading skeletons to all new pages
- [ ] T100 [P] Add error boundaries to all forms
- [ ] T101 [P] Add mobile-responsive breakpoints to all new components
- [ ] T102 [P] Run linters: `black backend/`, `ruff backend/`, `npm run lint` in frontend
- [ ] T103 [P] Test all API endpoints with sample data
- [ ] T104 [P] Verify Cash Flow Statement balances (opening + flow = closing)
- [ ] T105 [P] Verify financial ratios match manual calculations (20 test cases)
- [ ] T106 [P] Verify project profitability calculations
- [ ] T107 [P] Create PHR for Phase 3 implementation in history/prompts/phase-3/
- [ ] T108 [P] Update main README.md with Phase 3 modules
- [ ] T109 [P] Update COMPLETION_REPORT.md with Phase 3 status

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US3 → US2 → US4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

| User Story | Priority | Depends On | Can Start After |
|------------|----------|------------|-----------------|
| US1 (Project Costing) | P3 | Foundational (Phase 2) | T011 complete |
| US3 (Advanced Reports) | P3 | Foundational (Phase 2) | T011 complete |
| US2 (BI Dashboard) | P3 | Foundational (Phase 2) | T011 complete |
| US4 (Mobile App) | P3 [Optional] | Foundational (Phase 2) | T011 complete |

### Within Each User Story

1. Models/Migrations before services
2. Services before endpoints/routers
3. Backend before frontend
4. Core implementation before integration
5. Story complete before moving to next priority

### Parallel Opportunities

**Phase 2 (Foundational)**:
- T005, T006, T007, T008, T009 can run in parallel (different files)

**User Stories**:
- Once Phase 2 completes, all 4 user stories can proceed in parallel
- Within each story, models (marked [P]) can be created in parallel

---

## Implementation Strategy

### MVP First (Project Costing Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T011) - **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 1 (T012-T037)
4. **STOP and VALIDATE**: Test Project Costing independently
   - Create test project with budget
   - Record costs from multiple sources
   - Verify profitability report accuracy
   - Verify budget vs actual report
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 (Project Costing) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 (Advanced Reports) → Test independently → Deploy/Demo
4. Add User Story 2 (BI Dashboard) → Test independently → Deploy/Demo
5. [Optional] Add User Story 4 (Mobile App) → Test independently → Deploy/Demo

Each story adds value without breaking previous stories.

---

## Task Summary

| Phase | Description | Task Count | Story |
|-------|-------------|------------|-------|
| Phase 1 | Setup | 4 | - |
| Phase 2 | Foundational | 7 | - |
| Phase 3 | User Story 1 (Project Costing) | 26 | US1 |
| Phase 4 | User Story 3 (Advanced Reports) | 21 | US3 |
| Phase 5 | User Story 2 (BI Dashboard) | 25 | US2 |
| Phase 6 | User Story 4 (Mobile App) [Optional] | 15 | US4 |
| Phase 7 | Polish | 11 | - |
| **Total** | **All Phases** | **~109 tasks** | **4 stories** |

### Task Count by User Story

- **US1 (Project Costing)**: 26 tasks (T012-T037)
- **US2 (BI Dashboard)**: 25 tasks (T059-T083)
- **US3 (Advanced Reports)**: 21 tasks (T038-T058)
- **US4 (Mobile App)**: 15 tasks (T084-T098) [Optional]

---

## Notes

- **[P]** tasks = different files, no dependencies, can run in parallel
- **[Story]** label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Mobile App is OPTIONAL** - can be deferred to later sprint
- **Format validation**: ALL ~109 tasks follow the checklist format (checkbox, ID, optional [P], optional [Story], description with file path)
