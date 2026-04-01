<!--
SYNC IMPACT REPORT
==================
Version Change: 0.0.0 → 1.0.0 (Initial constitution creation)
Modified Principles: N/A (Initial creation)
Added Sections:
  - Core Principles (10 principles defined)
  - Governance & Compliance
  - Development Workflow
  - Technical Standards
Removed Sections: N/A (Initial creation)
Templates Requiring Updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check section compatible)
  - ✅ .specify/templates/spec-template.md (No constitution-specific constraints)
  - ✅ .specify/templates/tasks-template.md (Task categorization compatible)
Follow-up TODOs: None
-->

# Accountify Constitution

## Core Principles

### I. Pakistan-First Compliance
Accountify MUST prioritize Pakistani business requirements above all else. Every feature MUST support:
- **FBR/SRB Tax Compliance**: Sales tax, withholding tax, and provincial revenue board requirements built-in
- **PKR Currency Default**: All financial transactions default to Pakistani Rupee with multi-currency as optional
- **Urdu/English Bilingual**: User interface, reports, and communications MUST support both languages
- **Local Banking Integration**: Pakistani bank formats, IBAN, and payment methods

**Rationale**: QuickBooks and Xero fail Pakistani businesses because they treat Pakistan as an afterthought. Accountify wins by being Pakistan-first.

### II. AI-Native Architecture
Gemini 2.0 Flash AI MUST be integrated into every module, not as an add-on but as a core layer. Every feature MUST:
- **AI-Assisted Data Entry**: Auto-complete, smart suggestions, OCR for receipts/invoices
- **Conversational Interface**: Users can ask questions in natural language (Urdu/English)
- **Predictive Insights**: Cash flow forecasts, anomaly detection, payment reminders
- **Automated Categorization**: Expenses, accounts, and transactions auto-categorized

**Rationale**: Traditional accounting software requires manual data entry. Accountify differentiates by making AI the primary interface.

### III. Spec-Driven Development
Every feature MUST follow the spec-driven development process:
1. **Specification First**: `/sp.spec` command creates detailed spec in `specs/<feature>/spec.md`
2. **Architecture Plan**: `/sp.plan` command produces technical design in `specs/<feature>/plan.md`
3. **Task Breakdown**: `/sp.tasks` command generates testable tasks in `specs/<feature>/tasks.md`
4. **Implementation**: Code ONLY after specs are approved
5. **Validation**: Tests MUST pass before merge

**Rationale**: Zero manual code requires zero ambiguity. Specs are the contract between intent and implementation.

### IV. Zero Manual Code (Qwen CLI Only)
All production code MUST be generated via Qwen Code CLI with Spec-Kit-Plus:
- **No Hand-Written Code**: Developers write specs, Qwen writes code
- **Specs as Source of Truth**: If code doesn't match spec, fix the code, not the spec
- **PHR Documentation**: Every user prompt creates a Prompt History Record in `history/prompts/`
- **ADR for Decisions**: Architectural decisions documented in `history/adr/`

**Rationale**: Manual code introduces human error and inconsistency. Spec-driven AI code ensures repeatability and auditability.

### V. Free Stack Only
Accountify MUST operate entirely on free tiers until profitability:
- **Frontend**: Vercel Hobby (Next.js 16, free SSL, global CDN)
- **Backend**: Fly.io free tier (FastAPI, 3 shared CPU VMs)
- **Database**: Supabase free tier (PostgreSQL, 500MB, auth, realtime)
- **AI**: Google Gemini 2.0 Flash (free tier within limits)
- **Monitoring**: Vercel Analytics + Fly.io metrics

**Rationale**: Pakistani startups fail by overspending on infrastructure. Free tiers force discipline and validate product-market fit before scaling costs.

### VI. Double-Entry Accounting
Every financial transaction MUST create proper journal entries with debits equal to credits:
- **No Single-Entry Exceptions**: Even simple payments create full journal entries
- **Chart of Accounts**: Hierarchical structure with account types (Asset, Liability, Equity, Income, Expense)
- **Automatic Journaling**: Sales, purchases, payments auto-generate entries
- **Balance Validation**: System rejects any transaction where debits ≠ credits
- **Audit Trail**: Every entry logged with who/when/what

**Rationale**: QuickBooks and Xero succeed because double-entry is accounting law. Accountify MUST match their rigor while simplifying the interface.

### VII. Production-Ready Code
No placeholder code, no TODOs, no "will implement later":
- **Complete Features**: Every merged feature is fully functional with error handling
- **No Mock Data**: Production code uses real data structures from day one
- **Error Handling**: Every API call has try/catch, every user action has feedback
- **Logging**: All operations logged with appropriate severity levels
- **Documentation**: Code comments explain "why", not "what"

**Rationale**: Pakistani businesses cannot afford buggy software. Production-ready from day one builds trust and reduces technical debt.

### VIII. Mobile-Responsive Design
Accountify MUST work flawlessly on all screen sizes:
- **Responsive First**: Tailwind CSS breakpoints for mobile, tablet, desktop
- **Touch-Friendly**: Buttons, inputs, tables optimized for touch interaction
- **Progressive Enhancement**: Core features work on 3G, enhance on faster connections
- **PWA Capable**: Installable on mobile devices, offline support for critical features

**Rationale**: Pakistani business owners use mobile phones as primary devices. Desktop-only software excludes the target market.

### IX. Role-Based Access Control (RBAC)
Multi-user system with granular permissions:
- **Predefined Roles**: Admin, Accountant, Sales Manager, Salesperson, Viewer
- **Custom Roles**: Admin can create custom role with specific permissions
- **Permission Granularity**: Create, Read, Update, Delete per module
- **User Assignment**: Users assigned to roles, not individual permissions
- **Session Management**: Concurrent sessions, session timeout, force logout

**Rationale**: Businesses have multiple employees with different responsibilities. Single-user software doesn't scale beyond sole proprietors.

### X. Complete Audit Trail
Every change logged with who/when/what:
- **Data Changes**: Old value, new value, field changed, timestamp, user
- **User Actions**: Login, logout, failed login, permission changes
- **System Events**: Batch jobs, integrations, data imports/exports
- **Immutable Logs**: Audit logs cannot be modified or deleted
- **Audit Reports**: Filterable by date, user, module, action type

**Rationale**: Accounting software is legally required to maintain audit trails. FBR audits demand complete transaction history.

## Governance & Compliance

### Amendment Process
This constitution can be amended through the following process:
1. **Proposal**: Any team member can propose an amendment via GitHub issue
2. **Discussion**: 48-hour discussion period for team feedback
3. **Approval**: Requires consensus from all core developers
4. **Documentation**: Approved amendments create PHR and ADR
5. **Implementation**: Related templates and guidance updated within 24 hours

### Versioning Policy
Constitution versions follow semantic versioning:
- **MAJOR** (X.0.0): Backward-incompatible changes (principle removal, redefinition)
- **MINOR** (1.X.0): New principles, sections, or material expansions
- **PATCH** (1.0.X): Clarifications, wording improvements, typo fixes

### Compliance Review
Every feature MUST pass constitution compliance check during `/sp.plan`:
- **Principle Alignment**: Feature aligns with all 10 principles
- **Template Validation**: Plan/spec/tasks templates reference correct principles
- **Gate Enforcement**: Features violating principles rejected before implementation

## Development Workflow

### Spec-Driven Process
1. **Constitution**: This file defines governing principles
2. **Specification**: `/sp.spec <feature>` creates user stories and requirements
3. **Planning**: `/sp.plan <feature>` produces technical architecture
4. **Tasks**: `/sp.tasks <feature>` generates testable implementation tasks
5. **Implementation**: Qwen CLI generates code per tasks
6. **Validation**: Tests pass, constitution check passes
7. **Documentation**: PHR created, ADR if architectural decision

### Quality Gates
- **Spec Gate**: Specification approved before planning
- **Plan Gate**: Architecture passes constitution check before tasks
- **Task Gate**: Tasks are testable and independent before implementation
- **Code Gate**: Generated code passes linting and tests
- **Merge Gate**: PHR created, all gates passed

### Documentation Requirements
- **PHR**: Every user prompt creates record in `history/prompts/`
- **ADR**: Architectural decisions documented in `history/adr/`
- **Specs**: Every feature has `spec.md`, `plan.md`, `tasks.md`
- **Quickstart**: User-facing docs in `docs/` or feature folder

## Technical Standards

### Code Quality
- **Type Safety**: TypeScript strict mode, Python type hints
- **Linting**: ESLint, Prettier (frontend); Black, Ruff (backend)
- **Testing**: Integration tests for API contracts; unit tests optional
- **Error Handling**: Structured errors with error codes
- **Logging**: JSON logs with correlation IDs

### Security
- **Authentication**: Supabase Auth with JWT
- **Authorization**: RBAC enforced at API and UI layer
- **Data Encryption**: TLS in transit, encryption at rest
- **Secrets Management**: `.env` files, never committed
- **Input Validation**: Zod (frontend), Pydantic (backend)

### Performance
- **Frontend**: <3s page load on 3G, <1s on broadband
- **Backend**: <200ms p95 API response time
- **Database**: Indexed queries, <100ms query time
- **AI**: <5s Gemini response time with streaming

### Observability
- **Logging**: Structured logs (JSON) with request IDs
- **Metrics**: API latency, error rates, AI usage
- **Tracing**: Request tracing across frontend/backend
- **Alerting**: Error rate >1%, latency >1s p95

---

**Version**: 1.0.0 | **Ratified**: 2026-04-01 | **Last Amended**: 2026-04-01
