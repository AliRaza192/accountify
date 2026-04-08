# Feature Specification: Phase 3 Value-Add Modules

**Feature Branch**: `2-phase-3-value-add-modules`  
**Created**: 2026-04-08  
**Status**: Draft  
**Input**: User requirements from SPECIFICATION.md sections 15 (Project Costing), 19 (Business Intelligence), 22 (Mobile App), 26 (Advanced Reports)

---

## User Scenarios & Testing

### User Story 1 - Project / Job Costing (Priority: P3)

**As a** project manager or contractor,  
**I want to** track project costs (materials, labor, overhead) against project budgets and milestones,  
**So that** I can monitor project profitability, identify cost overruns early, and bill clients accurately.

**Why this priority**: Construction, IT services, consulting, and event management companies need project-based cost tracking. Without it, they cannot determine project profitability or identify budget overruns.

**Independent Test**: Can be fully tested by creating a project with budget, recording expenses against it, and verifying the project profitability report shows correct revenue, costs, and profit margin.

**Acceptance Scenarios**:

1. **Given** a project is created with PKR 1,000,000 budget, **When** expenses totaling PKR 800,000 are recorded against the project, **Then** the system MUST show remaining budget of PKR 200,000 and allow cost overrun alerts.

2. **Given** a project has multiple phases/milestones, **When** costs are allocated to specific phases, **Then** the system MUST show phase-wise cost breakdown and completion percentage.

3. **Given** project revenue is recorded (invoice to client), **When** the project profitability report is generated, **Then** it MUST show revenue - costs = profit margin with percentage.

4. **Given** materials are issued from inventory to a project, **When** the material issue is recorded, **Then** inventory MUST decrease and project cost MUST increase automatically.

---

### User Story 2 - Business Intelligence & Analytics Dashboard (Priority: P3)

**As a** business owner or executive,  
**I want to** visualize key business metrics with interactive charts, trends, and forecasting,  
**So that** I can make data-driven decisions and identify business opportunities or risks.

**Why this priority**: Modern businesses need real-time analytics, not just static reports. BI dashboards enable proactive decision-making and competitive advantage.

**Independent Test**: Can be fully tested by viewing the BI dashboard, filtering by date range, drilling down into a metric, and exporting the data to Excel.

**Acceptance Scenarios**:

1. **Given** the BI dashboard is opened, **When** the user views KPI cards, **Then** they MUST see real-time metrics: Revenue, Expenses, Profit Margin, Current Ratio, Quick Ratio, DSO.

2. **Given** a date range filter is applied, **When** trend charts update, **Then** they MUST show month-over-month and year-over-year comparisons for revenue, expenses, and profit.

3. **Given** a user clicks on a KPI card, **When** the drill-down view opens, **Then** it MUST show detailed breakdown (e.g., revenue by customer, expenses by category).

4. **Given** the user exports dashboard data, **When** they click "Export to Excel", **Then** a properly formatted Excel file with all metrics MUST be downloaded.

---

### User Story 3 - Advanced Financial Reports (Priority: P3)

**As a** CFO or financial analyst,  
**I want to** generate advanced financial statements including Cash Flow, Funds Flow, Statement of Changes in Equity, and Financial Ratio Analysis,  
**So that** I can meet regulatory requirements and provide comprehensive financial analysis to stakeholders.

**Why this priority**: These reports are legally required for audits, bank loan applications, and investor presentations. Without them, businesses cannot comply with accounting standards (IFRS).

**Independent Test**: Can be fully tested by generating a Cash Flow Statement for a fiscal year and verifying it balances (opening cash + net cash flow = closing cash).

**Acceptance Scenarios**:

1. **Given** a fiscal year is selected, **When** the Cash Flow Statement is generated (indirect method), **Then** it MUST show: Operating Activities, Investing Activities, Financing Activities, and Net Change in Cash.

2. **Given** financial ratios are requested, **When** the Ratio Analysis report is generated, **Then** it MUST calculate: Current Ratio, Quick Ratio, Debt-to-Equity, Gross Margin %, Net Margin %, ROA, ROE, Inventory Turnover, DSO.

3. **Given** Statement of Changes in Equity is requested, **When** the report is generated, **Then** it MUST show: Opening Equity + Net Profit - Dividends + Additional Capital = Closing Equity.

4. **Given** a Funds Flow Statement is generated, **When** the report is viewed, **Then** it MUST show sources and applications of working capital during the period.

---

### User Story 4 - Mobile App Access (Priority: P3)

**As a** business owner on the go,  
**I want to** access critical business data (dashboard, invoices, payments) and approve transactions from my mobile phone,  
**So that** I can manage my business from anywhere without needing a laptop.

**Why this priority**: Business owners frequently travel and need real-time access. Approval delays occur when owners are away from desk. Mobile access improves responsiveness.

**Independent Test**: Can be fully tested by installing the mobile app, logging in, viewing the dashboard, approving a pending invoice, and generating a customer statement.

**Acceptance Scenarios**:

1. **Given** the mobile app is installed, **When** the user logs in with credentials, **Then** they MUST see a mobile-optimized dashboard with KPI cards.

2. **Given** a pending approval exists, **When** the user opens the approvals screen, **Then** they MUST see the approval details and can approve/reject with one tap.

3. **Given** the user wants to view an invoice, **When** they search by invoice number, **Then** the invoice details MUST display with customer, amount, due date, and status.

4. **Given** the user generates a customer statement, **When** they tap "Send via WhatsApp", **Then** a PDF statement MUST be generated and shared via WhatsApp.

---

### Edge Cases

- **What happens when a project is completed but has pending expenses?** System MUST allow recording post-completion expenses (warranty costs, final payments) and lock project budget.

- **How does BI dashboard handle large datasets (100,000+ transactions)?** System MUST use materialized views and caching to ensure dashboard loads in <5 seconds.

- **What if Cash Flow Statement doesn't balance?** System MUST highlight discrepancy and show possible causes (missing transactions, incorrect categorization).

- **How does mobile app handle offline mode?** System MUST cache recent data and sync when connectivity returns, with conflict resolution.

---

## Requirements

### Functional Requirements

#### Project Costing Module

- **FR-PC-001**: System MUST allow project creation with fields: project name, code, client, start/end dates, budget, project manager, status (Active, On Hold, Completed, Cancelled).

- **FR-PC-002**: System MUST support project phases/milestones with start/end dates, budget allocation, and completion tracking.

- **FR-PC-003**: System MUST allow cost allocation from multiple sources: purchase invoices, expenses, payroll (labor), inventory (materials), journal entries.

- **FR-PC-004**: System MUST track project revenue from sales invoices linked to project.

- **FR-PC-005**: System MUST generate Project Profitability Report showing: Revenue, Direct Costs, Allocated Overhead, Gross Profit, Net Profit, Profit Margin %.

- **FR-PC-006**: System MUST generate Budget vs Actual report for projects with variance analysis.

- **FR-PC-007**: System MUST support milestone-based billing with automatic invoice generation.

#### Business Intelligence & Analytics

- **FR-BI-001**: System MUST provide interactive dashboard with customizable KPI cards: Revenue, Expenses, Profit Margin, Current Ratio, Quick Ratio, DSO.

- **FR-BI-002**: System MUST support trend analysis with month-over-month and year-over-year comparisons using line/bar charts.

- **FR-BI-003**: System MUST allow drill-down from KPI to detailed breakdown (e.g., revenue by customer, expenses by category).

- **FR-BI-004**: System MUST support custom date range filtering for all metrics and charts.

- **FR-BI-005**: System MUST export any dashboard/metric to Excel (.xlsx) and PDF formats.

- **FR-BI-006**: System MUST provide financial ratios dashboard with: Liquidity ratios, Profitability ratios, Efficiency ratios, Solvency ratios.

- **FR-BI-007**: System MUST forecast future trends based on historical data (sales forecast, cash flow forecast).

#### Advanced Financial Reports

- **FR-AFR-001**: System MUST generate Cash Flow Statement using indirect method: Operating Activities (Net Income + Non-cash expenses ± Working capital changes), Investing Activities, Financing Activities.

- **FR-AFR-002**: System MUST generate Funds Flow Statement showing Sources and Applications of working capital.

- **FR-AFR-003**: System MUST generate Statement of Changes in Equity: Opening Equity + Net Profit - Dividends + Additional Capital = Closing Equity.

- **FR-AFR-004**: System MUST generate Financial Ratio Analysis Report with: Current Ratio, Quick Ratio, Debt-to-Equity, Gross Margin %, Net Margin %, ROA, ROE, Inventory Turnover, DSO, Days Payable Outstanding.

- **FR-AFR-005**: System MUST allow date range and fiscal year selection for all advanced reports.

- **FR-AFR-006**: System MUST export all advanced reports to Excel (.xlsx), PDF, and CSV formats.

#### Mobile App

- **FR-MA-001**: System MUST provide mobile app (iOS & Android) with React Native or native development.

- **FR-MA-002**: System MUST authenticate users via email/password with optional 2FA.

- **FR-MA-003**: System MUST display mobile-optimized dashboard with KPI cards and recent transactions.

- **FR-MA-004**: System MUST allow viewing and approving pending approvals (purchase orders, expenses, payments).

- **FR-MA-005**: System MUST allow viewing invoices, bills, and customer/vendor statements.

- **FR-MA-006**: System MUST support offline data caching with automatic sync when connectivity returns.

- **FR-MA-007**: System MUST allow sharing documents via WhatsApp, email, or other apps installed on device.

---

### Key Entities

- **Project**: Represents a job or engagement with defined scope, budget, and timeline. Key attributes: project code, name, client, start date, end date, budget, status, project manager.

- **Project Phase**: Represents a stage within a project. Key attributes: phase name, start date, end date, budget allocation, completion percentage.

- **Project Cost**: Represents a cost allocated to a project. Key attributes: cost source (invoice, expense, payroll, journal), amount, allocation date, cost category.

- **KPI Metric**: Represents a business performance indicator. Key attributes: metric name, current value, target value, trend (up/down), calculation formula.

- **Cash Flow Entry**: Represents a cash inflow or outflow categorized by activity type. Key attributes: date, description, amount, activity type (Operating, Investing, Financing).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Project profitability report MUST generate in under 5 seconds for projects with up to 1,000 cost entries.

- **SC-002**: BI dashboard MUST load in under 3 seconds with up to 100,000 historical transactions (using materialized views/caching).

- **SC-003**: Cash Flow Statement MUST balance (opening cash + net cash flow = closing cash) with zero variance 100% of the time.

- **SC-004**: Financial ratios MUST be calculated accurately as per standard accounting formulas (verified against manual calculations for 20 test cases).

- **SC-005**: Mobile app MUST launch and display dashboard in under 5 seconds on 4G connectivity.

- **SC-006**: Approval actions from mobile app MUST reflect in web dashboard in real-time (<2 second sync).

- **SC-007**: Offline mode MUST support viewing cached data for up to 24 hours without connectivity.

- **SC-008**: Export to Excel MUST complete in under 10 seconds for reports with up to 10,000 rows.

---

## Assumptions

- **A-001**: Project costing is discrete (job-order based) not process-based.

- **A-002**: BI dashboard uses existing transactional data from Phase 1 & 2 modules.

- **A-003**: Advanced financial reports assume Chart of Accounts and Journal Entries are properly configured.

- **A-004**: Mobile app uses existing REST API from backend (no new backend endpoints required).

- **A-005**: Cash Flow Statement uses indirect method (starting from Net Income).

- **A-006**: Mobile app initially supports iOS only; Android may follow in future iteration.

---

## Dependencies

- **D-001**: Phase 1 modules (Fixed Assets, Cost Centers, Tax, Bank Rec, CRM) must be operational.

- **D-002**: Phase 2 modules (Multi-Branch, Approvals, Budget, Manufacturing) must be operational.

- **D-003**: Chart of Accounts and Journal Entries must be configured for advanced financial reports.

- **D-004**: Backend REST API must be accessible for mobile app integration.

- **D-005**: React Native or mobile development framework must be set up for mobile app.
