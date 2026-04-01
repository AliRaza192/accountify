# Tasks: Phase 1 Critical Modules

**Input**: Design documents from `/specs/1-phase-1-critical-modules/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Tests are OPTIONAL and NOT included in this task list. Focus on implementation first.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5, US6, US7)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/app/`, `frontend/src/app/dashboard/`
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create directory structure for 5 new modules (backend/app/routers/, models/, schemas/)
- [X] T002 Create directory structure for frontend pages (frontend/src/app/dashboard/fixed-assets/, cost-centers/, tax/, banking/reconciliation/, crm/)
- [X] T003 [P] Add Python dependencies to backend/requirements.txt (all already present, verify)
- [X] T004 [P] Add npm dependencies to frontend/package.json (all already present, verify)
- [X] T005 [P] Create migration file backend/app/migrations/002_phase_1_modules.sql with all 15 new tables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Run database migration 002_phase_1_modules.sql in Supabase
- [X] T007 [P] Create seed script backend/app/scripts/seed_phase_1.py for tax rates, asset categories, loyalty tiers
- [ ] T008 Run seed script to populate FBR tax rates and asset categories
- [ ] T009 [P] Update backend/app/main.py to include 5 new routers (fixed_assets, cost_centers, tax_management, bank_reconciliation, crm)
- [X] T010 [P] Create shared database client import in all new model files (from app.database import get_db)
- [ ] T011 [P] Create shared authentication dependency (from app.core.auth import get_current_user, get_company_id)
- [X] T012 [P] Create base Pydantic schema class in backend/app/schemas/base.py with company_id, created_at, updated_at
- [X] T013 [P] Create base SQLAlchemy model class in backend/app/models/base.py with common columns
- [ ] T014 Setup Supabase Storage bucket for asset_photos and documents
- [X] T015 [P] Create shared AI service backend/app/services/gemini_service.py for bank matching, lead scoring, asset categorization

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Fixed Asset Registration & Depreciation (Priority: P1) 🎯 MVP

**Goal**: Register fixed assets, calculate monthly depreciation (SLM/WDV), create auto journal entries, track maintenance, handle disposal

**Independent Test**: Can be fully tested by registering an asset, running monthly depreciation, and verifying journal entries are created with correct debit/credit amounts

### Implementation for User Story 1

- [X] T016 [P] [US1] Create FixedAsset SQLAlchemy model in backend/app/models/fixed_assets.py
- [X] T017 [P] [US1] Create AssetCategory SQLAlchemy model in backend/app/models/fixed_assets.py
- [X] T018 [P] [US1] Create AssetDepreciation SQLAlchemy model in backend/app/models/fixed_assets.py
- [X] T019 [P] [US1] Create AssetMaintenance SQLAlchemy model in backend/app/models/fixed_assets.py
- [X] T020 [P] [US1] Create FixedAsset Pydantic schemas in backend/app/schemas/fixed_assets.py (Create, Update, Response)
- [X] T021 [P] [US1] Create AssetCategory Pydantic schemas in backend/app/schemas/fixed_assets.py
- [X] T022 [US1] Create FixedAssetService in backend/app/services/fixed_asset_service.py with CRUD operations
- [X] T023 [US1] Implement depreciation calculation methods (SLM, WDV) in FixedAssetService
- [X] T024 [US1] Implement run_monthly_depreciation method that creates journal entries
- [X] T025 [US1] Create fixed_assets router in backend/app/routers/fixed_assets.py with GET /api/v1/fixed-assets endpoint
- [X] T026 [US1] Add POST /api/v1/fixed-assets endpoint for asset creation
- [X] T027 [US1] Add GET /api/v1/fixed-assets/{id} endpoint for asset detail
- [X] T028 [US1] Add PUT /api/v1/fixed-assets/{id} endpoint for asset update
- [X] T029 [US1] Add DELETE /api/v1/fixed-assets/{id} endpoint for asset disposal
- [X] T030 [US1] Add POST /api/v1/fixed-assets/{id}/maintenance endpoint for maintenance logging
- [X] T031 [US1] Add POST /api/v1/fixed-assets/run-depreciation endpoint for monthly depreciation run
- [X] T032 [US1] Add GET /api/v1/fixed-assets/reports/register endpoint for Fixed Asset Register report
- [X] T033 [US1] Add GET /api/v1/fixed-assets/reports/depreciation-schedule endpoint
- [X] T034 [US1] Add GET /api/v1/asset-categories endpoint with seed data
- [X] T035 [P] [US1] Create AssetForm component in frontend/src/components/fixed-assets/asset-form.tsx
- [X] T036 [P] [US1] Create AssetCard component in frontend/src/components/fixed-assets/asset-card.tsx
- [X] T037 [P] [US1] Create DepreciationTable component in frontend/src/components/fixed-assets/depreciation-table.tsx
- [X] T038 [US1] Create asset list page in frontend/src/app/dashboard/fixed-assets/page.tsx
- [X] T039 [US1] Create new asset page in frontend/src/app/dashboard/fixed-assets/new/page.tsx
- [X] T040 [US1] Create asset detail page in frontend/src/app/dashboard/fixed-assets/[id]/page.tsx
- [X] T041 [US1] Create depreciation schedule page in frontend/src/app/dashboard/fixed-assets/depreciation/page.tsx
- [X] T042 [US1] Add Fixed Assets navigation link to frontend/src/components/layout/Sidebar.tsx
- [X] T043 [US1] Add error handling and loading states to all fixed asset pages
- [X] T044 [US1] Add API client functions in frontend/src/lib/api/fixed-assets.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - users can register assets, run depreciation, view reports

---

## Phase 4: User Story 2 - Cost Center / Profit Center Allocation (Priority: P1)

**Goal**: Create cost centers, allocate income/expenses to departments, generate department-wise P&L reports

**Independent Test**: Can be fully tested by creating a cost center, allocating an expense to it, and running a department-wise P&L report showing revenue, expenses, and net profit per cost center

### Implementation for User Story 2

- [X] T045 [P] [US2] Create CostCenter SQLAlchemy model in backend/app/models/cost_centers.py
- [X] T046 [P] [US2] Create CostCenterAllocation SQLAlchemy model in backend/app/models/cost_centers.py
- [X] T047 [P] [US2] Create CostCenter Pydantic schemas in backend/app/schemas/cost_centers.py
- [X] T048 [US2] Create CostCenterService in backend/app/services/cost_center_service.py with CRUD operations
- [X] T049 [US2] Implement allocate_overhead method in CostCenterService
- [X] T050 [US2] Implement get_department_pl method for department-wise P&L
- [X] T051 [US2] Create cost_centers router in backend/app/routers/cost_centers.py with GET /api/v1/cost-centers endpoint
- [X] T052 [US2] Add POST /api/v1/cost-centers endpoint
- [X] T053 [US2] Add GET /api/v1/cost-centers/{id} endpoint
- [X] T054 [US2] Add GET /api/v1/cost-centers/{id}/profit-loss endpoint for department P&L
- [X] T055 [US2] Add POST /api/v1/cost-centers/allocate endpoint for overhead allocation
- [X] T056 [US2] Add GET /api/v1/cost-centers/reports/summary endpoint
- [X] T057 [P] [US2] Create CostCenterForm component in frontend/src/components/cost-centers/cost-center-form.tsx
- [X] T058 [P] [US2] Create DepartmentPL component in frontend/src/components/cost-centers/department-pl.tsx
- [X] T059 [US2] Create cost center list page in frontend/src/app/dashboard/accounting/cost-centers/page.tsx
- [X] T060 [US2] Create cost center detail page in frontend/src/app/dashboard/accounting/cost-centers/[id]/page.tsx
- [X] T061 [US2] Add Cost Centers navigation link to Sidebar.tsx
- [X] T062 [US2] Add API client functions in frontend/src/lib/api/cost-centers.ts
- [X] T063 [US2] Update expense creation form to include cost center selection dropdown
- [X] T064 [US2] Update invoice creation to include cost center allocation
- [X] T065 [US2] Add error handling and loading states

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - FBR Sales Tax & Withholding Tax Management (Priority: P1)

**Goal**: Track GST (17%), input/output tax, WHT deductions, generate monthly sales tax returns and WHT challans

**Independent Test**: Can be fully tested by creating a sales invoice with 17% GST, creating a purchase bill with input tax, and verifying the monthly sales tax return shows correct output tax, input tax, and net tax payable

### Implementation for User Story 3

- [ ] T066 [P] [US3] Create TaxRate SQLAlchemy model in backend/app/models/tax_management.py
- [ ] T067 [P] [US3] Create TaxReturn SQLAlchemy model in backend/app/models/tax_management.py
- [ ] T068 [P] [US3] Create WHTTransaction SQLAlchemy model in backend/app/models/tax_management.py
- [ ] T069 [P] [US3] Create TaxRate, TaxReturn, WHTTransaction Pydantic schemas in backend/app/schemas/tax_management.py
- [ ] T070 [US3] Create TaxManagementService in backend/app/services/tax_management_service.py
- [ ] T071 [US3] Implement calculate_sales_tax method with FBR rates (17%, 5%, etc.)
- [ ] T072 [US3] Implement calculate_wht method with FBR schedules (Section 153, 153A, 155)
- [ ] T073 [US3] Implement generate_sales_tax_return method for SRB/FBR filing
- [ ] T074 [US3] Implement generate_wht_challan method
- [ ] T075 [US3] Create tax_management router in backend/app/routers/tax_management.py with GET /api/v1/tax/rates endpoint
- [ ] T076 [US3] Add POST /api/v1/tax/rates endpoint
- [ ] T077 [US3] Add GET /api/v1/tax/sales-tax/return endpoint for sales tax return generation
- [ ] T078 [US3] Add POST /api/v1/tax/sales-tax/return endpoint to file return
- [ ] T079 [US3] Add GET /api/v1/tax/wht/transactions endpoint
- [ ] T080 [US3] Add POST /api/v1/tax/wht/challan endpoint for WHT challan generation
- [ ] T081 [US3] Add GET /api/v1/tax/reports/input-output endpoint
- [ ] T082 [US3] Add GET /api/v1/tax/reports/reconciliation endpoint
- [ ] T083 [US3] Add POST /api/v1/tax/verify-ntn endpoint for manual NTN verification
- [ ] T084 [P] [US3] Create TaxReturnForm component in frontend/src/components/tax/tax-return-form.tsx
- [ ] T085 [P] [US3] Create TaxSummary component in frontend/src/components/tax/tax-summary.tsx
- [ ] T086 [US3] Create tax dashboard page in frontend/src/app/dashboard/tax/page.tsx
- [ ] T087 [US3] Create sales tax return page in frontend/src/app/dashboard/tax/sales-tax/page.tsx
- [ ] T088 [US3] Create WHT report page in frontend/src/app/dashboard/tax/wht/page.tsx
- [ ] T089 [US3] Add Tax Management navigation link to Sidebar.tsx
- [ ] T090 [US3] Add API client functions in frontend/src/lib/api/tax.ts
- [ ] T091 [US3] Update sales invoice form to auto-calculate GST (17%)
- [ ] T092 [US3] Update purchase bill form to auto-calculate input tax
- [ ] T093 [US3] Update payment processing to auto-deduct WHT based on category
- [ ] T094 [US3] Add error handling and loading states

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Bank Reconciliation with CSV Import (Priority: P1)

**Goal**: Import bank CSV statements (HBL/UBL/MCB formats), auto-match transactions (80%+), complete reconciliation with zero difference

**Independent Test**: Can be fully tested by importing a bank statement CSV, matching 10 transactions automatically, manually matching 2 unmatched transactions, and completing reconciliation with zero difference

### Implementation for User Story 4

- [ ] T095 [P] [US4] Create BankStatement SQLAlchemy model in backend/app/models/bank_reconciliation.py
- [ ] T096 [P] [US4] Create ReconciliationSession SQLAlchemy model in backend/app/models/bank_reconciliation.py
- [ ] T097 [P] [US4] Create BankStatement, ReconciliationSession Pydantic schemas in backend/app/schemas/bank_reconciliation.py
- [ ] T098 [US4] Create BankReconciliationService in backend/app/services/bank_reconciliation_service.py
- [ ] T099 [US4] Implement parse_bank_csv method supporting Type A (HBL/UBL) and Type B (MCB) formats
- [ ] T100 [US4] Implement auto_match_transactions method with 80%+ accuracy (date ±3 days, same amount, 80% text match)
- [ ] T101 [US4] Implement manual_match_transaction method
- [ ] T102 [US4] Implement complete_reconciliation method with difference validation (must be zero)
- [ ] T103 [US4] Create bank_reconciliation router in backend/app/routers/bank_reconciliation.py
- [ ] T104 [US4] Add POST /api/v1/bank-rec/import-statement endpoint
- [ ] T105 [US4] Add GET /api/v1/bank-rec/matching-suggestions endpoint
- [ ] T106 [US4] Add POST /api/v1/bank-rec/match endpoint
- [ ] T107 [US4] Add POST /api/v1/bank-rec/complete-reconciliation endpoint
- [ ] T108 [US4] Add GET /api/v1/bank-rec/reports/statement endpoint
- [ ] T109 [P] [US4] Create CSVImporter component in frontend/src/components/bank-rec/csv-importer.tsx with column mapping
- [ ] T110 [P] [US4] Create TransactionMatcher component in frontend/src/components/bank-rec/transaction-matcher.tsx
- [ ] T111 [P] [US4] Create ReconciliationStatement component in frontend/src/components/bank-rec/reconciliation-statement.tsx
- [ ] T112 [US4] Create bank reconciliation page in frontend/src/app/dashboard/banking/reconciliation/page.tsx
- [ ] T113 [US4] Add Bank Reconciliation navigation link to Sidebar.tsx
- [ ] T114 [US4] Add API client functions in frontend/src/lib/api/bank-rec.ts
- [ ] T115 [US4] Add AI-powered transaction categorization suggestions using Gemini service
- [ ] T116 [US4] Add error handling and loading states

**Checkpoint**: At this point, User Stories 1-4 should all work independently

---

## Phase 7: User Story 5 - Post-Dated Cheque (PDC) Management (Priority: P2)

**Goal**: Track PDCs received from customers and issued to vendors, send maturity reminders, handle deposit/clear/bounce workflows

**Independent Test**: Can be fully tested by receiving a PDC from a customer with future date, viewing the PDC aging report, depositing the cheque on due date, and tracking status change from "Received" to "Deposited" to "Cleared"

### Implementation for User Story 5

- [ ] T117 [P] [US5] Create PDC SQLAlchemy model in backend/app/models/bank_reconciliation.py (add to existing file)
- [ ] T118 [P] [US5] Create PDC Pydantic schemas in backend/app/schemas/bank_reconciliation.py (add to existing file)
- [ ] T119 [US5] Extend BankReconciliationService with PDC management methods
- [ ] T120 [US5] Implement record_pdc method for receiving/issuing PDCs
- [ ] T121 [US5] Implement deposit_pdc method with status transition
- [ ] T122 [US5] Implement handle_pdc_bounce method that reinstates receivable/payable
- [ ] T123 [US5] Implement get_pdc_maturity_report method (due within 7/15/30 days, overdue)
- [ ] T124 [US5] Add GET /api/v1/bank-rec/pdcs/list endpoint to bank_reconciliation router
- [ ] T125 [US5] Add POST /api/v1/bank-rec/pdcs endpoint to create PDC
- [ ] T126 [US5] Add POST /api/v1/bank-rec/pdcs/{id}/deposit endpoint
- [ ] T127 [US5] Add GET /api/v1/bank-rec/reports/pdc-maturity endpoint
- [ ] T128 [P] [US5] Create PDCForm component in frontend/src/components/bank-rec/pdc-form.tsx
- [ ] T129 [P] [US5] Create PDCMaturityReport component in frontend/src/components/bank-rec/pdc-maturity-report.tsx
- [ ] T130 [US5] Add PDC list page in frontend/src/app/dashboard/banking/pdcs/page.tsx
- [ ] T131 [US5] Add PDC maturity report page in frontend/src/app/dashboard/banking/pdcs/maturity-report/page.tsx
- [ ] T132 [US5] Update payment creation form to mark cheques as PDC with future date
- [ ] T133 [US5] Add automated reminder system for PDCs due within 3 days (cron job or serverless function)
- [ ] T134 [US5] Add error handling and loading states

**Checkpoint**: At this point, User Stories 1-5 should all work independently

---

## Phase 8: User Story 6 - CRM Lead Management & Sales Pipeline (Priority: P2)

**Goal**: Capture leads from multiple sources, track follow-ups, visualize sales pipeline Kanban, convert leads to customers

**Independent Test**: Can be fully tested by creating a lead, scheduling a follow-up, converting the lead to a customer with one click, and verifying the lead-to-customer conversion report

### Implementation for User Story 6

- [ ] T135 [P] [US6] Create Lead SQLAlchemy model in backend/app/models/crm.py
- [ ] T136 [P] [US6] Create Lead Pydantic schemas in backend/app/schemas/crm.py
- [ ] T137 [US6] Create CRMService in backend/app/services/crm_service.py
- [ ] T138 [US6] Implement create_lead method with auto-generated lead code
- [ ] T139 [US6] Implement update_lead_stage method for pipeline movement
- [ ] T140 [US6] Implement convert_lead_to_customer method that creates customer record
- [ ] T141 [US6] Implement get_pipeline_kanban_data method
- [ ] T142 [US6] Implement ai_score_lead method using Gemini (0-100 score based on source, value, engagement)
- [ ] T143 [US6] Create crm router in backend/app/routers/crm.py with GET /api/v1/crm/leads endpoint
- [ ] T144 [US6] Add POST /api/v1/crm/leads endpoint
- [ ] T145 [US6] Add GET /api/v1/crm/leads/{id} endpoint
- [ ] T146 [US6] Add PUT /api/v1/crm/leads/{id} endpoint
- [ ] T147 [US6] Add POST /api/v1/crm/leads/{id}/convert endpoint
- [ ] T148 [US6] Add GET /api/v1/crm/pipeline endpoint for Kanban data
- [ ] T149 [US6] Add PUT /api/v1/crm/pipeline/stage endpoint for drag-drop stage updates
- [ ] T150 [US6] Add GET /api/v1/crm/reports/conversion endpoint
- [ ] T151 [P] [US6] Create LeadForm component in frontend/src/components/crm/lead-form.tsx
- [ ] T152 [P] [US6] Create PipelineKanban component in frontend/src/components/crm/pipeline-kanban.tsx with drag-drop
- [ ] T153 [US6] Create CRM dashboard page in frontend/src/app/dashboard/crm/page.tsx
- [ ] T154 [US6] Create leads list page in frontend/src/app/dashboard/crm/leads/page.tsx
- [ ] T155 [US6] Create sales pipeline page in frontend/src/app/dashboard/crm/pipeline/page.tsx
- [ ] T156 [US6] Add CRM navigation link to Sidebar.tsx
- [ ] T157 [US6] Add API client functions in frontend/src/lib/api/crm.ts
- [ ] T158 [US6] Add AI-powered lead scoring display in lead cards
- [ ] T159 [US6] Add follow-up date reminders (email/in-app notification)
- [ ] T160 [US6] Add error handling and loading states

**Checkpoint**: At this point, User Stories 1-6 should all work independently

---

## Phase 9: User Story 7 - CRM Support Ticket Management (Priority: P3)

**Goal**: Log customer complaints, assign to support staff, track resolution time, collect satisfaction ratings

**Independent Test**: Can be fully tested by creating a support ticket, assigning it to a support agent, resolving the ticket, and generating a ticket resolution time report

### Implementation for User Story 7

- [ ] T161 [P] [US7] Create CRMTicket SQLAlchemy model in backend/app/models/crm.py (add to existing file)
- [ ] T162 [P] [US7] Create CRMTicket Pydantic schemas in backend/app/schemas/crm.py (add to existing file)
- [ ] T163 [US7] Extend CRMService with ticket management methods
- [ ] T164 [US7] Implement create_ticket method with auto-generated ticket number
- [ ] T165 [US7] Implement assign_ticket_to_agent method
- [ ] T166 [US7] Implement resolve_ticket method with resolution notes
- [ ] T167 [US7] Implement get_ticket_summary_report method (avg resolution time, satisfaction score)
- [ ] T168 [US7] Add GET /api/v1/crm/tickets endpoint to crm router
- [ ] T169 [US7] Add POST /api/v1/crm/tickets endpoint
- [ ] T170 [US7] Add PUT /api/v1/crm/tickets/{id} endpoint
- [ ] T171 [US7] Add GET /api/v1/crm/reports/ticket-summary endpoint
- [ ] T172 [P] [US7] Create TicketBoard component in frontend/src/components/crm/ticket-board.tsx
- [ ] T173 [P] [US7] Create TicketForm component in frontend/src/components/crm/ticket-form.tsx
- [ ] T174 [US7] Create support tickets page in frontend/src/app/dashboard/crm/tickets/page.tsx
- [ ] T175 [US7] Add ticket creation modal to customer detail page
- [ ] T176 [US7] Add satisfaction rating input on ticket resolution
- [ ] T177 [US7] Add error handling and loading states

**Checkpoint**: All user stories should now be independently functional

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T178 [P] Add Urdu translations to all new pages (i18n setup)
- [ ] T179 [P] Add mobile-responsive breakpoints to all new components
- [ ] T180 [P] Add loading skeletons to all list pages
- [ ] T181 [P] Add error boundaries to all forms
- [ ] T182 [P] Create comprehensive documentation in specs/1-phase-1-critical-modules/README.md
- [ ] T183 [P] Add OpenAPI documentation annotations to all endpoints
- [ ] T184 [P] Run linters: `black backend/`, `ruff backend/`, `npm run lint` in frontend
- [ ] T185 [P] Test all API endpoints with Postman collection
- [ ] T186 [P] Test all frontend pages on mobile (320px width) and desktop
- [ ] T187 [P] Verify FBR tax calculations match manual calculations (50 test cases)
- [ ] T188 [P] Verify bank rec auto-match achieves 80%+ accuracy with sample data
- [ ] T189 [P] Verify depreciation calculations (SLM and WDV) match manual calculations
- [ ] T190 [P] Add feature flags for phased rollout (optional)
- [ ] T191 [P] Create PHR for implementation phase in history/prompts/phase-1-critical-modules/
- [ ] T192 [P] Update main README.md with new modules and setup instructions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (Fixed Assets, P1)**: Can start after Foundational - No dependencies on other stories 🎯 **MVP**
- **User Story 2 (Cost Centers, P1)**: Can start after Foundational - Independent
- **User Story 3 (Tax Management, P1)**: Can start after Foundational - Uses existing invoices/bills
- **User Story 4 (Bank Rec, P1)**: Can start after Foundational - Uses existing payments
- **User Story 5 (PDC Management, P2)**: Can start after Foundational - Extends bank rec
- **User Story 6 (CRM Leads, P2)**: Can start after Foundational - Independent
- **User Story 7 (CRM Tickets, P3)**: Can start after Foundational - Extends CRM

### Within Each User Story

- Models before services (T016-T019 → T022)
- Services before endpoints (T022 → T025-T034)
- Backend before frontend (T034 → T035-T044)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003-T005)
- All Foundational tasks marked [P] can run in parallel (T007-T013, T015)
- Once Foundational is done, all user stories can start in parallel (if team capacity allows)
- Within each story:
  - All models marked [P] can run in parallel (T016-T019, T045-T046, etc.)
  - All components marked [P] can run in parallel (T035-T037, T151-T152, etc.)
  - All API clients can run in parallel with components

---

## Parallel Execution Examples

### Fixed Assets (US1) - Parallel Models

```bash
# Launch all model creation together:
Task: "T016 [P] [US1] Create FixedAsset SQLAlchemy model in backend/app/models/fixed_assets.py"
Task: "T017 [P] [US1] Create AssetCategory SQLAlchemy model in backend/app/models/fixed_assets.py"
Task: "T018 [P] [US1] Create AssetDepreciation SQLAlchemy model in backend/app/models/fixed_assets.py"
Task: "T019 [P] [US1] Create AssetMaintenance SQLAlchemy model in backend/app/models/fixed_assets.py"
```

### Fixed Assets (US1) - Parallel Components

```bash
# Launch all component creation together:
Task: "T035 [P] [US1] Create AssetForm component in frontend/src/components/fixed-assets/asset-form.tsx"
Task: "T036 [P] [US1] Create AssetCard component in frontend/src/components/fixed-assets/asset-card.tsx"
Task: "T037 [P] [US1] Create DepreciationTable component in frontend/src/components/fixed-assets/depreciation-table.tsx"
```

### Tax Management (US3) - Parallel Models

```bash
# Launch all model creation together:
Task: "T066 [P] [US3] Create TaxRate SQLAlchemy model in backend/app/models/tax_management.py"
Task: "T067 [P] [US3] Create TaxReturn SQLAlchemy model in backend/app/models/tax_management.py"
Task: "T068 [P] [US3] Create WHTTransaction SQLAlchemy model in backend/app/models/tax_management.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T015)
3. Complete Phase 3: User Story 1 - Fixed Assets (T016-T044)
4. **STOP and VALIDATE**: 
   - Register an asset worth PKR 2,000,000
   - Run monthly depreciation
   - Verify journal entries created (Dr Depreciation Expense, Cr Accumulated Depreciation)
   - View Fixed Asset Register report
5. Deploy MVP if validation passes

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 (Fixed Assets) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Cost Centers) → Test independently → Deploy/Demo
4. Add User Story 3 (Tax Management) → Test independently → Deploy/Demo
5. Add User Story 4 (Bank Rec) → Test independently → Deploy/Demo
6. Add User Story 5 (PDC) → Test independently → Deploy/Demo
7. Add User Story 6 (CRM Leads) → Test independently → Deploy/Demo
8. Add User Story 7 (CRM Tickets) → Test independently → Deploy/Demo

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Fixed Assets)
   - Developer B: User Story 2 (Cost Centers)
   - Developer C: User Story 3 (Tax Management)
   - Developer D: User Story 4 (Bank Rec)
3. Stories complete and integrate independently

---

## Task Summary

| Phase | User Story | Priority | Task Count | Independent Test |
|-------|-----------|----------|------------|------------------|
| 1 | Setup | - | 5 | N/A |
| 2 | Foundational | - | 10 | N/A |
| 3 | US1: Fixed Assets | P1 | 29 | Register asset, run depreciation, verify journal entries |
| 4 | US2: Cost Centers | P1 | 21 | Create cost center, allocate expense, run department P&L |
| 5 | US3: Tax Management | P1 | 29 | Create invoice with GST, generate sales tax return |
| 6 | US4: Bank Rec | P1 | 22 | Import CSV, auto-match 80%+, complete with zero difference |
| 7 | US5: PDC Management | P2 | 18 | Record PDC, deposit on due date, track clearance |
| 8 | US6: CRM Leads | P2 | 26 | Create lead, convert to customer, view pipeline |
| 9 | US7: CRM Tickets | P3 | 17 | Create ticket, resolve, collect satisfaction rating |
| 10 | Polish | - | 15 | Cross-cutting improvements |

**Total Tasks**: 192

**MVP Scope**: Phases 1-3 (44 tasks) - Fixed Assets module only

**Parallel Opportunities**:
- 4 Setup/Foundational tasks can run in parallel
- Within each story: 3-4 model tasks can run in parallel
- Within each story: 2-3 component tasks can run in parallel
- All 7 user stories can proceed in parallel after Foundational phase

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [US1-US7] label maps task to specific user story for traceability
- Verify each story independently before moving to next
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All tasks include exact file paths
- No test tasks included (tests are OPTIONAL per template)
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
