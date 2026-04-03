# Feature Specification: Phase 2 Modules

**Feature Branch**: `001-phase-2-modules`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "PHASE 2 MODULES TO BUILD: MODULE 1: MULTI-BRANCH / MULTI-COMPANY, MODULE 2: WORKFLOW & APPROVALS, MODULE 3: BUDGET MANAGEMENT, MODULE 4: USER ROLES & SECURITY, MODULE 5: MANUFACTURING / BOM"

## User Scenarios & Testing

### User Story 1 - Multi-Branch Operations (Priority: P1)

As a **Company Administrator**, I want to manage multiple branches under a single company so that I can operate businesses across different locations with segregated data while maintaining consolidated oversight.

**Why this priority**: Multi-branch support is foundational for businesses operating in multiple locations. Without this, companies cannot properly segregate financial data, inventory, or reporting by location, making it impossible to track branch-level performance.

**Independent Test**: Can be fully tested by creating two branches, entering branch-specific transactions, and verifying that each branch only sees its own data while consolidated reports show combined data.

**Acceptance Scenarios**:

1. **Given** a company with multiple branches, **When** a user switches to a specific branch using the header selector, **Then** they see only data and reports for that branch
2. **Given** two branches with separate inventory, **When** an inter-branch stock transfer is initiated, **Then** inventory decreases in source branch and increases in destination branch with proper audit trail
3. **Given** branch-level transactions exist, **When** a branch-wise P&L is generated, **Then** it shows only revenues and expenses for that specific branch
4. **Given** multiple branches with financial data, **When** a consolidated report is requested, **Then** it aggregates data across all branches into a single view

---

### User Story 2 - Approval Workflow Management (Priority: P1)

As a **Manager**, I want to approve or reject documents (purchase orders, expenses, payments, discounts) based on configurable approval rules so that financial controls are enforced and unauthorized transactions are prevented.

**Why this priority**: Approval workflows are critical for financial controls and fraud prevention. Businesses need to ensure that transactions above certain thresholds receive proper authorization before execution.

**Independent Test**: Can be fully tested by creating a purchase order above the approval limit and verifying it requires manager approval before being processed.

**Acceptance Scenarios**:

1. **Given** a purchase order below the approval limit, **When** it is submitted, **Then** it is automatically approved without manager intervention
2. **Given** a purchase order above the approval limit, **When** it is submitted, **Then** it is routed to the manager for approval and cannot proceed until approved
3. **Given** a pending approval request, **When** a manager reviews it from the dashboard, **Then** they can approve or reject with comments and the document status updates accordingly
4. **Given** an approval request is submitted, **When** the request is processed, **Then** an email notification is sent to the appropriate approver
5. **Given** a document with approval history, **When** a user views the document, **Then** they can see the complete approval trail including who approved/rejected and when

---

### User Story 3 - Budget Creation and Monitoring (Priority: P2)

As a **Finance Manager**, I want to create annual budgets by account or department and compare them against actual spending in real-time so that I can monitor budget utilization and prevent overspending.

**Why this priority**: Budget management enables financial planning and control. Without budget tracking, businesses cannot proactively manage spending or identify when departments are exceeding their allocations.

**Independent Test**: Can be fully tested by creating a budget, recording actual transactions, and verifying that the budget vs actual comparison shows correct variance.

**Acceptance Scenarios**:

1. **Given** a fiscal year, **When** a budget is created for specific accounts or departments, **Then** it is stored with approval workflow and can be tracked against actual transactions
2. **Given** active budgets with actual transactions, **When** a budget vs actual report is generated, **Then** it shows live comparison with variance amounts and percentages
3. **Given** a budget threshold is defined, **When** actual spending approaches or exceeds the budget, **Then** alerts are triggered to notify responsible managers
4. **Given** budget and actual data, **When** a budget variance report is requested, **Then** it shows utilization rates and identifies over/under budget categories

---

### User Story 4 - Role-Based Access Control (Priority: P1)

As a **System Administrator**, I want to assign predefined roles to users with specific module and action permissions so that users can only access and perform actions appropriate to their job responsibilities.

**Why this priority**: Security and access control are fundamental for data protection and compliance. Without RBAC, sensitive financial data could be accessed or modified by unauthorized personnel.

**Independent Test**: Can be fully tested by creating users with different roles and verifying each can only access their permitted modules and perform allowed actions.

**Acceptance Scenarios**:

1. **Given** a user with the "Cashier" role, **When** they log in, **Then** they can only see and access modules/actions permitted for cashiers (e.g., sales transactions, but not financial reports)
2. **Given** a user with the "Accountant" role, **When** they attempt to delete a posted transaction, **Then** the action is blocked if their role doesn't have delete permission
3. **Given** a user with export permissions, **When** they view a report, **Then** they can export data; users without export permission cannot see the export option
4. **Given** 2FA is enabled, **When** a user logs in, **Then** they must enter an email OTP before gaining access to the system
5. **Given** a user performs any transaction, **When** the audit trail is viewed, **Then** it shows who performed what action and when with complete details

---

### User Story 5 - Manufacturing and BOM Management (Priority: P2)

As a **Production Manager**, I want to create Bill of Materials (BOM) and manage production orders so that I can track material consumption, work in progress, and finished goods output throughout the manufacturing process.

**Why this priority**: Manufacturing businesses need to track the transformation of raw materials into finished goods. Without BOM and production tracking, they cannot accurately calculate production costs or manage material requirements.

**Independent Test**: Can be fully tested by creating a BOM, issuing materials to production, recording finished goods, and verifying WIP tracking and cost calculation.

**Acceptance Scenarios**:

1. **Given** a product with a defined BOM, **When** a production order is created, **Then** required materials are calculated based on the BOM and production quantity
2. **Given** a production order, **When** materials are issued to production, **Then** inventory decreases and WIP increases with proper cost tracking
3. **Given** a production order with materials issued, **When** finished goods are recorded, **Then** WIP decreases and finished goods inventory increases
4. **Given** a production process with scrap, **When** scrap/waste is recorded, **Then** it is tracked separately and included in production cost calculations
5. **Given** production orders with material requirements, **When** MRP is run, **Then** it identifies material shortages and suggests purchase requisitions

---

### Edge Cases

- What happens when a branch is deleted or deactivated? System must handle historical transactions and prevent orphaned data.
- How does system handle circular inter-branch transfers? System must detect and prevent infinite loops.
- What happens when an approver is unavailable (on leave, departed)? System must support delegate approvers or escalation paths.
- How does system handle budget adjustments mid-year? System must track original budget, revisions, and maintain audit trail.
- What happens when a user with pending approvals changes roles? System must reassign pending approvals appropriately.
- How does system handle BOM changes for ongoing production orders? System must version BOMs and link production orders to specific versions.
- What happens when production output exceeds BOM-specified quantity? System must track variances and adjust costs accordingly.

## Requirements

### Functional Requirements

#### Module 1: Multi-Branch / Multi-Company

- **FR-001**: System MUST allow creation of multiple branches under a single company with unique branch identifiers
- **FR-002**: System MUST segregate all transactional data by branch so that branch users only see their branch's data
- **FR-003**: System MUST provide a branch selector in the header allowing users to switch between branches they have access to
- **FR-004**: System MUST support inter-branch stock transfers with source and destination branch tracking
- **FR-005**: System MUST generate branch-wise P&L statements showing only revenues and expenses for the selected branch
- **FR-006**: System MUST generate branch-wise Balance Sheets showing only assets and liabilities for the selected branch
- **FR-007**: System MUST generate consolidated reports aggregating data across all branches when requested
- **FR-008**: System MUST enforce branch-level data access controls preventing unauthorized cross-branch data access

#### Module 2: Workflow & Approvals

- **FR-009**: System MUST support configurable approval limits for different document types (purchase orders, expenses, payments, discounts)
- **FR-010**: System MUST auto-approve documents below the configured approval limit without requiring manager intervention
- **FR-011**: System MUST route documents above the approval limit to the appropriate manager for approval before processing
- **FR-012**: System MUST support multi-level approval workflows (Level 1, Level 2, Level 3) based on document value or type
- **FR-013**: System MUST provide a dashboard showing pending approval requests with approve/reject actions
- **FR-014**: System MUST maintain approval history for each document showing who approved/rejected, when, and any comments
- **FR-015**: System MUST send email notifications to approvers when approval requests are submitted
- **FR-016**: System MUST support approval workflows for: Purchase Orders, Expenses, Sales Discounts, Payments, and Leave requests
- **FR-017**: System MUST prevent processing of documents requiring approval until they are approved

#### Module 3: Budget Management

- **FR-018**: System MUST allow creation of annual budgets organized by account and/or department
- **FR-019**: System MUST support budget approval workflow before budgets become active
- **FR-020**: System MUST provide live budget vs actual comparison showing budgeted amounts, actual spending, and variances
- **FR-021**: System MUST generate budget variance reports showing utilization percentages and over/under budget categories
- **FR-022**: System MUST trigger alerts when spending approaches or exceeds budget thresholds
- **FR-023**: System MUST support budget revisions with audit trail tracking original and revised budgets

#### Module 4: User Roles & Security

- **FR-024**: System MUST implement Role-Based Access Control (RBAC) with predefined roles: Super Admin, Admin, Accountant, Sales Manager, Salesperson, Store Manager, HR Manager, Cashier, Viewer
- **FR-025**: System MUST support module-level permissions allowing administrators to show/hide entire modules by role
- **FR-026**: System MUST support action-level permissions (create, edit, delete, view, approve, export) for each module by role
- **FR-027**: System MUST support Two-Factor Authentication (2FA) via email OTP
- **FR-028**: System MUST maintain an audit trail logging every transaction with who, when, and what details
- **FR-029**: System MUST track login history for all users including timestamp, IP address, and session information
- **FR-030**: System MUST support session management including session timeout and concurrent session limits
- **FR-031**: System MUST enforce permission checks before allowing any action, not just hiding UI elements

#### Module 5: Manufacturing / BOM

- **FR-032**: System MUST allow creation of Bill of Materials (BOM) defining components and quantities required for each product
- **FR-033**: System MUST support creation of production orders (Job Orders) specifying product, quantity, and production dates
- **FR-034**: System MUST track material issuance from inventory to production, reducing inventory and increasing WIP
- **FR-035**: System MUST record finished goods output, reducing WIP and increasing finished goods inventory
- **FR-036**: System MUST track Work In Progress (WIP) showing value of materials and labor in ongoing production
- **FR-037**: System MUST track scrap/waste separately and include it in production cost calculations
- **FR-038**: System MUST calculate production costs including material costs, labor, and overhead
- **FR-039**: System MUST support Material Requirement Planning (MRP) identifying material shortages based on production orders

### Key Entities

- **Branch**: A business location or division under a company, with its own segregated data for transactions, inventory, and reporting
- **Approval Rule**: Defines approval thresholds and approvers for different document types and value ranges
- **Approval Request**: A document pending approval, tracking current approval level, approvers, and status
- **Budget**: Annual financial plan organized by account and/or department with approved amounts
- **Budget Revision**: Changes to original budget with audit trail tracking revisions
- **Role**: A collection of permissions defining what modules and actions a user can access
- **Permission**: A specific access right at module level (view module) or action level (create, edit, delete, approve, export)
- **User Session**: A user's authenticated connection to the system with login history and session metadata
- **Audit Log**: A record of every transaction/action with user, timestamp, action type, and affected data
- **Bill of Materials (BOM)**: A structured list of components, materials, and quantities required to produce a finished product
- **Production Order**: A job order authorizing production of a specific product quantity with start and completion dates
- **Work In Progress (WIP)**: Inventory that is partially completed, tracking materials and costs invested
- **Finished Goods**: Completed products ready for sale, produced from production orders
- **Material Issue**: Transaction recording materials moved from inventory to production
- **Scrap Record**: Record of waste or excess materials from production processes

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can switch between branches and see branch-specific data within 2 seconds
- **SC-002**: Inter-branch stock transfers complete successfully with accurate inventory updates in both branches 100% of the time
- **SC-003**: Approval requests are routed to correct approvers within 5 seconds of submission
- **SC-004**: Email notifications for approval requests are delivered within 30 seconds of request submission
- **SC-005**: Budget vs actual reports reflect live transaction data with less than 1-second latency
- **SC-006**: Budget overrun alerts trigger when spending reaches 90% and 100% of budgeted amounts
- **SC-007**: Role-based access controls prevent unauthorized module access and actions 100% of the time
- **SC-008**: 2FA authentication completes within 60 seconds including email OTP delivery
- **SC-009**: Audit trail captures 100% of transactions with complete who/when/what details
- **SC-010**: BOM-based material requirements are calculated accurately for production orders
- **SC-011**: Production cost calculations include all material, labor, and overhead components accurately
- **SC-012**: MRP identifies material shortages correctly for all active production orders
- **SC-013**: System supports 500+ concurrent users across multiple branches without performance degradation
- **SC-014**: Branch-wise and consolidated reports generate within 5 seconds for standard date ranges (up to 1 year)
- **SC-015**: Users can complete approval/reject actions from dashboard in under 3 clicks

## Assumptions

- **A-001**: Company structure supports one company with multiple branches (not multi-tenant across different companies)
- **A-002**: Branch users can only access one branch at a time (no cross-branch data entry in single session)
- **A-003**: Approval workflows are sequential (Level 1 → Level 2 → Level 3) not parallel
- **A-004**: Budget periods are annual aligned with fiscal year (January-December or custom fiscal year)
- **A-005**: Email service is configured and available for 2FA OTP and approval notifications
- **A-006**: Predefined roles cover common business functions; custom roles may be added in future phases
- **A-007**: BOM supports single-level structures initially; multi-level/nested BOMs may be future enhancement
- **A-008**: Production orders are discrete (job-order based) not continuous/process manufacturing
- **A-009**: All users have reliable email access for 2FA and notifications
- **A-010**: Branch data segregation applies to transactions, inventory, and reports; master data (products, customers) may be shared

## Dependencies

- **D-001**: Phase 1 modules (Fixed Assets, Cost Centers, Tax Management, Bank Reconciliation, CRM) must be operational
- **D-002**: Email service integration required for 2FA OTP and approval notifications
- **D-003**: Existing user authentication system must support 2FA extension
- **D-004**: Inventory management system from Phase 1 must support branch-level tracking
- **D-005**: Financial reporting system must support branch-level filtering and consolidation
