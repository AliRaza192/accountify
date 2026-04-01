# Feature Specification: Phase 1 Critical Modules

**Feature Branch**: `1-phase-1-critical-modules`
**Created**: 2026-04-01
**Status**: Draft
**Input**: Complete specification for PHASE 1 critical missing modules to compete with Splendid Accounts Pakistan

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fixed Asset Registration & Depreciation (Priority: P1)

**As a** business owner or accountant,  
**I want to** register fixed assets (vehicles, machinery, furniture, computers) and automatically calculate monthly depreciation,  
**So that** I can track asset values on my balance sheet and claim depreciation expenses for tax purposes.

**Why this priority**: Fixed assets represent significant business investments. Without proper tracking, businesses cannot produce accurate balance sheets or claim tax-deductible depreciation. This is legally required for FBR compliance.

**Independent Test**: Can be fully tested by registering an asset, running monthly depreciation, and verifying journal entries are created with correct debit (Depreciation Expense) and credit (Accumulated Depreciation) amounts.

**Acceptance Scenarios**:

1. **Given** a company has purchased a vehicle for PKR 2,000,000 with 5-year useful life and 10% residual value, **When** the user registers the asset with straight-line depreciation, **Then** the system MUST calculate monthly depreciation of PKR 30,000 and create automatic journal entries.

2. **Given** an asset is registered, **When** the month-end depreciation run is executed, **Then** ALL assets MUST have depreciation posted with proper journal entries (Dr Depreciation Expense, Cr Accumulated Depreciation).

3. **Given** an asset is fully depreciated (book value = residual value), **When** depreciation run executes, **Then** no additional depreciation MUST be charged.

4. **Given** an asset needs to be sold or disposed, **When** the user records asset disposal with sale proceeds, **Then** the system MUST calculate gain/loss on disposal and create journal entries removing the asset cost and accumulated depreciation.

---

### User Story 2 - Cost Center / Profit Center Allocation (Priority: P1)

**As a** business owner with multiple departments (Sales, Production, Admin, HR),  
**I want to** allocate income and expenses to different cost centers,  
**So that** I can see department-wise profitability and make informed decisions about resource allocation.

**Why this priority**: Businesses need to know which departments are profitable and which are cost centers. Without this, they cannot make strategic decisions about expansion, cost cutting, or performance bonuses.

**Independent Test**: Can be fully tested by creating a cost center, allocating expenses to it, and running a department-wise P&L report showing revenue, expenses, and net profit per cost center.

**Acceptance Scenarios**:

1. **Given** a company has three cost centers (Sales, Production, Admin), **When** a user records an expense, **Then** the system MUST require selection of a cost center and the expense MUST appear in that cost center's P&L.

2. **Given** multiple departments exist, **When** the user runs a department-wise P&L report, **Then** the report MUST show revenue, direct expenses, allocated overhead, and net profit for each cost center.

3. **Given** a cost center is inactive, **When** the user tries to allocate expenses to it, **Then** the system MUST warn the user but allow the transaction (historical data may need reallocation).

---

### User Story 3 - FBR Sales Tax & Withholding Tax Management (Priority: P1)

**As a** Pakistani business owner,  
**I want to** automatically calculate and track FBR sales tax (output tax), input tax, and withholding tax deductions,  
**So that** I can file accurate monthly tax returns and avoid FBR penalties.

**Why this priority**: FBR compliance is legally mandatory. Incorrect tax calculations result in penalties, audits, and business closure. This is the #1 reason Pakistani businesses use accounting software.

**Independent Test**: Can be fully tested by creating a sales invoice with 17% GST, creating a purchase bill with input tax, and verifying the monthly sales tax return shows correct output tax, input tax, and net tax payable.

**Acceptance Scenarios**:

1. **Given** a sales invoice is created for PKR 100,000 with 17% GST, **When** the invoice is posted, **Then** the system MUST create journal entries with Sales Revenue PKR 100,000 and Output Tax Payable PKR 17,000.

2. **Given** a purchase bill includes PKR 10,000 input tax, **When** the bill is posted, **Then** the system MUST record input tax receivable and net purchase amount separately.

3. **Given** a payment is made to a vendor subject to withholding tax (e.g., 6% WHT on services), **When** the payment is processed, **Then** the system MUST automatically deduct WHT, create WHT payable liability, and allow generation of WHT challan.

4. **Given** month-end tax period, **When** the user generates the sales tax return, **Then** the report MUST show total output tax, total input tax, net tax payable, and list of all taxable invoices for SRB/FBR filing.

---

### User Story 4 - Bank Reconciliation with CSV Import (Priority: P1)

**As a** business accountant,  
**I want to** import bank statements from Pakistani banks (HBL, UBL, MCB, etc.) in CSV format and automatically match transactions with system entries,  
**So that** I can reconcile my bank accounts monthly and identify discrepancies quickly.

**Why this priority**: Bank reconciliation ensures books match bank records. Without it, businesses miss fraudulent transactions, bank charges, and bounced cheques. Monthly reconciliation is a best practice and audit requirement.

**Independent Test**: Can be fully tested by importing a bank statement CSV, matching 10 transactions automatically, manually matching 2 unmatched transactions, and completing reconciliation with zero difference.

**Acceptance Scenarios**:

1. **Given** a bank statement CSV file from HBL with columns: Date, Description, Debit, Credit, Balance, **When** the user imports the CSV and maps columns, **Then** the system MUST display all bank transactions and suggest matches with system cash book entries.

2. **Given** imported bank transactions and system cash book entries, **When** the auto-match runs, **Then** transactions with same date (±3 days), same amount, and similar description MUST be matched automatically.

3. **Given** unmatched transactions after auto-match, **When** the user manually matches a bank transaction with a system entry, **Then** both entries MUST be marked as reconciled with reconciliation date.

4. **Given** all transactions are matched, **When** the user completes reconciliation, **Then** the system MUST generate a reconciliation report showing opening balance, total debits, total credits, closing balance, and difference (must be zero).

---

### User Story 5 - Post-Dated Cheque (PDC) Management (Priority: P2)

**As a** business owner dealing with cheques in Pakistan,  
**I want to** track post-dated cheques received from customers and issued to vendors,  
**So that** I know which cheques will clear on which dates and manage cash flow accordingly.

**Why this priority**: PDCs are extremely common in Pakistani business. Missing a PDC deposit date or forgetting about an issued PDC can result in bounced cheques, legal issues, and damaged business relationships.

**Independent Test**: Can be fully tested by receiving a PDC from a customer with future date, viewing the PDC aging report, depositing the cheque on due date, and tracking status change from "Received" to "Deposited" to "Cleared".

**Acceptance Scenarios**:

1. **Given** a customer payment is received via cheque dated 30 days in future, **When** the payment is recorded, **Then** the system MUST mark it as PDC and show it in the PDC Receivables report with due date.

2. **Given** PDCs are scheduled for deposit, **When** the due date arrives, **Then** the system MUST send a reminder notification to deposit the cheque.

3. **Given** a PDC is deposited in bank, **When** the user marks it as deposited, **Then** the status MUST change to "Deposited" and the cheque MUST appear in next bank reconciliation as an outstanding entry.

4. **Given** a PDC bounces (insufficient funds), **When** the user marks it as bounced, **Then** the system MUST reverse the payment entry, reinstate the customer receivable, and flag the customer for follow-up.

---

### User Story 6 - CRM Lead Management & Sales Pipeline (Priority: P2)

**As a** sales manager,  
**I want to** capture leads from multiple sources (website, WhatsApp, walk-in, referral), track follow-ups, and visualize the sales pipeline,  
**So that** I can convert more leads into customers and measure sales team performance.

**Why this priority**: Customer acquisition is critical for business growth. Without lead tracking, follow-ups are missed, conversion rates are unknown, and sales team performance cannot be measured.

**Independent Test**: Can be fully tested by creating a lead, scheduling a follow-up, converting the lead to a customer with one click, and verifying the lead-to-customer conversion report.

**Acceptance Scenarios**:

1. **Given** a new inquiry is received via WhatsApp, **When** the salesperson creates a lead with source "WhatsApp", contact details, and requirement, **Then** the system MUST create a lead record and assign it to a salesperson.

2. **Given** a lead is created with follow-up date, **When** the follow-up date arrives, **Then** the system MUST remind the salesperson to follow up and allow logging the outcome (converted, lost, pending).

3. **Given** a lead is ready to convert, **When** the user clicks "Convert to Customer", **Then** the system MUST create a customer record with all lead details and link the lead history.

4. **Given** multiple leads in pipeline, **When** the sales manager views the pipeline report, **Then** the report MUST show leads by stage (New, Contacted, Proposal Sent, Negotiation, Converted, Lost) with total expected value.

---

### User Story 7 - CRM Support Ticket Management (Priority: P3)

**As a** customer support manager,  
**I want to** log customer complaints, assign them to support staff, and track resolution time,  
**So that** no customer issue is forgotten and support quality can be measured.

**Why this priority**: Customer retention is cheaper than acquisition. Poor support leads to customer churn. Ticket tracking ensures accountability and helps identify recurring issues.

**Independent Test**: Can be fully tested by creating a support ticket, assigning it to a support agent, resolving the ticket, and generating a ticket resolution time report.

**Acceptance Scenarios**:

1. **Given** a customer calls with a complaint, **When** the support agent creates a ticket with issue category, priority, and description, **Then** the system MUST assign a ticket number and notify the responsible department.

2. **Given** a ticket is assigned to an agent, **When** the agent resolves the issue, **Then** the system MUST record resolution time, resolution notes, and allow customer satisfaction rating.

3. **Given** multiple tickets, **When** the support manager runs the ticket report, **Then** the report MUST show tickets by status (Open, In Progress, Resolved, Closed), average resolution time, and agent performance.

---

### Edge Cases

- What happens when depreciation is run twice in the same month? System MUST prevent duplicate depreciation entries by checking if depreciation already posted for the period.

- How does system handle assets purchased mid-month? System MUST prorate depreciation based on days remaining in month (or follow company policy: full month / no month).

- What if bank CSV format doesn't match expected columns? System MUST allow user to map CSV columns to system fields and save the mapping for future imports.

- How does system handle PDCs older than 6 months (stale cheques)? System MUST flag PDCs as "Stale" and require user action before deposit.

- What if WHT rate changes mid-year? System MUST allow effective date-based tax rates and apply correct rate based on transaction date.

- How does system handle cost center reallocation after period close? System MUST allow reallocation but require approval and create audit trail with reason.

## Requirements *(mandatory)*

### Functional Requirements

#### Fixed Assets Module

- **FR-FA-001**: System MUST allow registration of assets with fields: asset name, category (Land, Building, Vehicle, Machinery, Furniture, Computer, Intangible), purchase date, purchase cost, useful life (months/years), residual value (amount or %), depreciation method (Straight Line, Written Down Value), location (branch/department), and asset photo.

- **FR-FA-002**: System MUST automatically calculate monthly depreciation using the selected method: Straight Line = (Cost - Residual) / Useful Life; WDV = Book Value × Depreciation Rate.

- **FR-FA-003**: System MUST create automatic journal entries on depreciation run: Debit Depreciation Expense account (linked to asset category), Credit Accumulated Depreciation account.

- **FR-FA-004**: System MUST allow asset disposal/sale with fields: disposal date, sale proceeds, disposal reason, and automatically calculate gain/loss = Sale Proceeds - (Cost - Accumulated Depreciation).

- **FR-FA-005**: System MUST maintain asset maintenance log with fields: service date, service type, service provider, cost, next service due date.

- **FR-FA-006**: System MUST generate Fixed Asset Register report showing all assets with cost, accumulated depreciation, book value, and location.

#### Cost Center / Profit Center Module

- **FR-CC-001**: System MUST allow creation of cost centers with name, code, description, and status (Active/Inactive).

- **FR-CC-002**: System MUST require cost center selection on all income and expense transactions (sales invoice, purchase bill, expense entry, journal entry).

- **FR-CC-003**: System MUST generate Department-wise P&L report showing revenue, direct expenses, allocated overhead, and net profit per cost center.

- **FR-CC-004**: System MUST allow overhead allocation rules (e.g., rent allocated by area, electricity by meter, admin salary by headcount).

#### Tax Management Module

- **FR-TAX-001**: System MUST support multiple tax rates (0%, 5%, 13%, 17%, 18%) with effective dates for rate changes.

- **FR-TAX-002**: System MUST automatically calculate sales tax (output tax) on taxable sales invoices based on customer tax status (registered/unregistered).

- **FR-TAX-003**: System MUST track input tax on taxable purchase bills and allow input tax claim only for registered suppliers.

- **FR-TAX-004**: System MUST automatically deduct withholding tax on payments based on WHT category (Salary, Rent, Professional Services, Goods, etc.) and rate as per FBR schedule.

- **FR-TAX-005**: System MUST generate monthly Sales Tax Return report in SRB/FBR format showing output tax, input tax, net payable, with annexures of taxable sales and purchases.

- **FR-TAX-006**: System MUST generate WHT Deducted Report showing total WHT deducted by category, ready for challan generation.

- **FR-TAX-007**: System MUST validate NTN/STRN numbers for customers and vendors (via FBR API integration or manual entry).

#### Bank Reconciliation Module

- **FR-BR-001**: System MUST allow CSV import of bank statements with column mapping (Date, Description, Debit, Credit, Balance, Cheque Number).

- **FR-BR-002**: System MUST auto-match bank transactions with system cash book entries using rules: same amount, date within ±3 days, similar description (80% text match).

- **FR-BR-003**: System MUST allow manual matching of unmatched transactions before reconciliation completion.

- **FR-BR-004**: System MUST generate Bank Reconciliation Statement showing opening balance, add deposits in transit, less outstanding cheques, adjusted balance, and difference (must be zero to complete).

- **FR-BR-005**: System MUST save reconciliation history with date, user, and ability to view/reverse past reconciliations.

#### PDC Management Module

- **FR-PDC-001**: System MUST allow recording of PDCs received from customers and issued to vendors with fields: cheque number, bank, date, amount, party, status (Received/Issued, Deposited/Cleared, Bounced, Returned).

- **FR-PDC-002**: System MUST generate PDC Aging Report showing cheques due within 7 days, 15 days, 30 days, and overdue.

- **FR-PDC-003**: System MUST send automated reminders for PDCs due within 3 days.

- **FR-PDC-004**: System MUST handle PDC deposit by changing status to "Deposited" and creating bank reconciliation entry.

- **FR-PDC-005**: System MUST handle PDC bounce by reversing payment, reinstating receivable/payable, and flagging the party.

#### CRM Module

- **FR-CRM-001**: System MUST allow lead creation with fields: name, contact (phone, email, WhatsApp), source (Website, WhatsApp, Referral, Walk-in, Cold Call), requirement, estimated value, probability (%), expected close date, assigned salesperson.

- **FR-CRM-002**: System MUST support sales pipeline stages: New → Contacted → Proposal Sent → Negotiation → Converted/Lost, with drag-and-drop Kanban board.

- **FR-CRM-003**: System MUST allow scheduling follow-ups with date, time, method (Call, Meeting, WhatsApp, Email), and follow-up outcome logging.

- **FR-CRM-004**: System MUST convert leads to customers with one click, copying all relevant details and preserving lead history.

- **FR-CRM-005**: System MUST generate Sales Pipeline Report showing leads by stage, total expected value, weighted value (value × probability), and conversion rate.

- **FR-CRM-006**: System MUST allow creation of support tickets with fields: ticket number (auto), customer, issue category, priority (Low, Medium, High, Critical), assigned agent, status (Open, In Progress, Waiting on Customer, Resolved, Closed).

- **FR-CRM-007**: System MUST track ticket resolution time and allow customer satisfaction rating (1-5 stars) on resolution.

- **FR-CRM-008**: System MUST generate Ticket Report showing tickets by status, average resolution time, agent performance, and customer satisfaction score.

### Key Entities

- **Fixed Asset**: Represents a long-term tangible or intangible asset owned by the company. Key attributes: asset code, name, category, purchase date, purchase cost, useful life, residual value, depreciation method, accumulated depreciation, book value, location, status (Active, Sold, Disposed, Fully Depreciated).

- **Cost Center**: Represents a department or segment for which separate profit/loss tracking is required. Key attributes: cost center code, name, description, status, overhead allocation rules.

- **Tax Rate**: Represents a sales tax or withholding tax rate with effective date. Key attributes: tax name (e.g., "GST 17%"), rate %, tax type (Sales Tax, WHT, Federal Excise), effective date, end date (if applicable).

- **Bank Reconciliation**: Represents a monthly reconciliation of bank account. Key attributes: bank account, reconciliation period (month/year), opening balance, closing balance per bank, closing balance per books, reconciled date, status (In Progress, Completed).

- **PDC (Post-Dated Cheque)**: Represents a cheque with future date. Key attributes: cheque number, bank, date, amount, party (customer/vendor), type (Received/Issued), status (Pending, Deposited, Cleared, Bounced, Returned).

- **Lead**: Represents a potential customer in sales pipeline. Key attributes: lead code, name, contact info, source, requirement, estimated value, probability, stage, assigned salesperson, follow-up date.

- **Support Ticket**: Represents a customer complaint or support request. Key attributes: ticket number, customer, issue category, priority, assigned agent, status, created date, resolved date, resolution notes, satisfaction rating.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users MUST be able to register a fixed asset and run first month depreciation within 5 minutes of data entry.

- **SC-002**: System MUST auto-match at least 80% of bank transactions during CSV import reconciliation (measured over 100 sample transactions).

- **SC-003**: Monthly sales tax return report generation MUST complete in under 10 seconds for companies with up to 1,000 monthly transactions.

- **SC-004**: Users MUST be able to convert a lead to customer with one click and zero data re-entry.

- **SC-005**: Department-wise P&L report MUST balance (sum of all department profits = company total profit) with zero variance.

- **SC-006**: PDC reminder notifications MUST be sent 3 days before due date for 100% of recorded PDCs.

- **SC-007**: Support ticket creation to assignment MUST happen within 1 minute for 95% of tickets during business hours.

- **SC-008**: Users MUST be able to import and reconcile a bank statement with 100 transactions in under 3 minutes (including manual matching of 10-15% unmatched).

- **SC-009**: WHT calculation MUST be 100% accurate as per FBR schedules (verified against manual calculations for 50 test transactions).

- **SC-010**: Lead-to-customer conversion rate MUST be trackable and reportable with historical trend data (no data loss during conversion).
