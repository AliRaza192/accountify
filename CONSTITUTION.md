# 📜 AI Accounts Constitution

## Project Governance & Development Principles

---

## 🎯 MISSION STATEMENT

**AI Accounts** is a spec-driven, AI-native accounting software designed for Pakistani businesses. It competes with QuickBooks, Xero, and SAP by providing enterprise-grade features with AI-powered automation.

---

## 🏗️ ARCHITECTURE PRINCIPLES

### 1. Spec-Driven Development
- **Specification is King:** All code derives from `SPECIFICATION.md`
- **No Ad-Hoc Features:** Every feature must trace back to spec
- **Living Document:** Spec evolves, but changes are documented
- **AI-First:** AI agents implement from spec, humans review

### 2. Code Quality
- **Type Safety:** TypeScript on frontend, Python type hints on backend
- **DRY (Don't Repeat Yourself):** Reuse components, utilities, schemas
- **Single Responsibility:** Each function/class does one thing well
- **Explicit Over Implicit:** Clear naming, explicit types, documented assumptions

### 3. Database Design
- **Multi-Tenancy:** Every table has `company_id` for data isolation
- **Soft Deletes:** `is_deleted` flag, never hard delete business data
- **Audit Trail:** `created_at`, `updated_at`, `created_by` on all tables
- **Referential Integrity:** Foreign keys enforced, cascading deletes documented

### 4. API Design
- **RESTful:** Resource-based URLs, proper HTTP methods
- **Consistent Response Format:** Standard success/error structures
- **Pagination:** All list endpoints support pagination
- **Filtering & Sorting:** Query parameters for data filtering
- **Versioning:** API version in URL (`/api/v1/...`)

---

## 🔒 SECURITY PRINCIPLES

### 1. Authentication & Authorization
- **JWT Tokens:** Secure, time-limited tokens
- **Role-Based Access Control (RBAC):** Every endpoint checks permissions
- **Principle of Least Privilege:** Users get minimum required access
- **Session Management:** Single session enforcement option

### 2. Data Protection
- **Row Level Security (RLS):** Database-level access control
- **Input Validation:** All inputs validated with Pydantic/Zod
- **SQL Injection Prevention:** Parameterized queries only
- **XSS Prevention:** Sanitize all user inputs

### 3. Audit & Compliance
- **Audit Trail:** Every create/update/delete logged
- **Immutable Logs:** Audit logs cannot be modified
- **Data Retention:** Configurable retention policies
- **GDPR Ready:** Data export, deletion on request

---

## 📝 DEVELOPMENT WORKFLOW

### 1. Spec-First Approach
```
SPECIFICATION → PLAN → TASKS → IMPLEMENTATION → TEST → REVIEW
```

### 2. AI Agent Workflow
1. **Read Spec:** AI reads relevant section from `SPECIFICATION.md`
2. **Clarify:** AI asks questions about ambiguities
3. **Plan:** AI creates technical implementation plan
4. **Tasks:** AI breaks plan into actionable tasks
5. **Implement:** AI executes tasks in dependency order
6. **Test:** AI writes and runs tests
7. **Review:** Human reviews and approves

### 3. Code Review Checklist
- [ ] Traces back to specification
- [ ] Follows architecture principles
- [ ] Type-safe (no `any` in TypeScript, type hints in Python)
- [ ] Error handling implemented
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No hardcoded values (use config/env)
- [ ] Security considerations addressed

---

## 🧪 TESTING STRATEGY

### 1. Test Pyramid
```
        /‾‾‾‾‾‾\
       /  E2E    \      10% - Critical user journeys
      /__________\
     /   Integration \  20% - API contracts, module integration
    /_________________\
   /    Unit Tests     \ 70% - Component, function, schema tests
  /_____________________\
```

### 2. Test Requirements
- **Unit Tests:** All business logic functions
- **Integration Tests:** All API endpoints
- **Contract Tests:** API matches OpenAPI spec
- **E2E Tests:** Critical user flows (login, invoice, payment)

### 3. Test Quality
- **Coverage Target:** >80% for critical modules
- **Fast Tests:** Test suite runs in <5 minutes
- **Reliable:** No flaky tests
- **Maintainable:** Clear test names, documented assertions

---

## 📦 CODE ORGANIZATION

### Backend (FastAPI)
```
backend/
├── app/
│   ├── config.py          # Configuration
│   ├── database.py        # Database connection
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── routers/           # API routes
│   ├── services/          # Business logic
│   └── utils/             # Helper functions
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

### Frontend (Next.js)
```
frontend/
├── src/
│   ├── app/               # Next.js app router
│   ├── components/        # Reusable components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities
│   ├── types/             # TypeScript types
│   └── stores/            # Zustand stores
└── tests/
    ├── unit/
    └── e2e/
```

---

## 🎨 UI/UX PRINCIPLES

### 1. Design System
- **shadcn/ui:** Primary component library
- **Tailwind CSS:** Utility-first styling
- **Consistent Spacing:** 4px grid system
- **Color Palette:** Professional, accessible colors

### 2. User Experience
- **Dashboard First:** Key metrics visible immediately
- **Colorful Charts:** All data visualized with charts
- **Keyboard Shortcuts:** Power user support
- **Responsive:** Works on desktop, tablet, mobile

### 3. Accessibility
- **WCAG 2.1 AA:** Minimum compliance
- **Keyboard Navigation:** All features accessible via keyboard
- **Screen Reader:** ARIA labels on interactive elements
- **Color Contrast:** Sufficient contrast ratios

---

## 🚀 DEPLOYMENT & OPERATIONS

### 1. Environment Strategy
- **Development:** Local development
- **Staging:** Pre-production testing
- **Production:** Live environment

### 2. CI/CD Pipeline
```
Code → Lint → Test → Build → Deploy → Monitor
```

### 3. Monitoring
- **Health Checks:** `/health` endpoints
- **Error Tracking:** Sentry or similar
- **Performance Monitoring:** Response times, error rates
- **User Analytics:** Feature usage tracking

---

## 📚 DOCUMENTATION STANDARDS

### 1. Code Documentation
- **Function Docstrings:** What, why, parameters, returns
- **Type Annotations:** Explicit types everywhere
- **Comments:** Why, not what (code shows what)

### 2. API Documentation
- **OpenAPI Spec:** Auto-generated from code
- **Example Requests/Responses:** For all endpoints
- **Error Codes:** Documented with meanings

### 3. User Documentation
- **In-App Help:** Contextual help tooltips
- **User Manual:** Complete feature documentation
- **Video Tutorials:** Key workflows

---

## 🔄 CHANGE MANAGEMENT

### 1. Specification Changes
1. Propose change in GitHub Issue
2. Discuss impact on existing features
3. Update `SPECIFICATION.md`
4. Update this constitution if needed
5. Communicate to team

### 2. Breaking Changes
- **Version Bump:** Semantic versioning
- **Migration Guide:** Document migration steps
- **Deprecation Period:** Minimum 30 days notice
- **Backward Compatibility:** Maintain when possible

---

## 🎯 SUCCESS METRICS

### 1. Code Quality
- ESLint/Prettier: 100% compliance
- Type errors: 0
- Test coverage: >80% critical paths

### 2. Performance
- Page load: <3 seconds
- API response: <500ms (95th percentile)
- Report generation: <10 seconds

### 3. User Experience
- Dashboard load: <2 seconds
- Time to create invoice: <30 seconds
- User satisfaction: >4.5/5

---

## 📋 COMPLIANCE CHECKLIST

### Pakistan-Specific Requirements
- [ ] FBR Tax Compliance (Sales Tax, WHT)
- [ ] SRB Integration (Sindh Revenue Board)
- [ ] EOBI/PESSI Calculations
- [ ] Urdu Language Support
- [ ] PKR Currency Formatting
- [ ] Fiscal Year Configuration (Jul-Jun option)

### International Standards
- [ ] IFRS Compliance (Financial Reporting)
- [ ] GDPR Ready (Data Protection)
- [ ] SOC 2 Ready (Security Controls)
- [ ] ISO 27001 Ready (Information Security)

---

*Last Updated: 2025*
*Version: 1.0*
*Status: Active*
