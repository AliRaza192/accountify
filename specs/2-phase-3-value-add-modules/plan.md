# Implementation Plan: Phase 3 Value-Add Modules

**Input**: spec.md (Phase 3 specification)  
**Created**: 2026-04-08  
**Status**: Draft

---

## Architecture Overview

### Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Backend** | FastAPI + SQLAlchemy (existing) | Consistency with Phase 1 & 2 |
| **Frontend** | Next.js 16 + React (existing) | Consistency with Phase 1 & 2 |
| **Charts** | Recharts (existing) + Apache ECharts | Advanced visualizations |
| **Mobile App** | React Native (Expo) | Cross-platform, shares TypeScript |
| **Caching** | Redis (optional) | BI dashboard performance |
| **Database** | PostgreSQL (existing) | Materialized views for BI |

---

## Module Design

### 1. Project Costing Module

**Backend:**
- Models: Project, ProjectPhase, ProjectCost, ProjectRevenue
- Service: ProjectService (CRUD, profitability calculation, budget tracking)
- Router: /api/v1/projects/* (CRUD, reports, cost allocation)

**Frontend:**
- `/dashboard/projects` - Project list
- `/dashboard/projects/[id]` - Project detail with cost breakdown
- `/dashboard/projects/[id]/costs` - Cost allocation
- `/dashboard/projects/reports/profitability` - Profitability report
- `/dashboard/projects/reports/budget-vs-actual` - Budget variance

**Database Tables:**
```sql
projects (id, code, name, client_id, start_date, end_date, budget, status, manager_id)
project_phases (id, project_id, name, start_date, end_date, budget_allocated, completion_pct)
project_costs (id, project_id, phase_id, cost_source_type, cost_source_id, amount, category, allocated_date)
project_revenue (id, project_id, invoice_id, amount, recognized_date)
```

---

### 2. Business Intelligence & Analytics

**Backend:**
- Service: BI Service (aggregations, trend analysis, forecasting)
- Materialized Views: mv_revenue_trends, mv_expense_trends, mv_kpi_metrics
- Router: /api/v1/bi/* (dashboard data, trends, exports)

**Frontend:**
- `/dashboard/bi` - Main BI dashboard
- `/dashboard/bi/kpi/[metric]` - KPI drill-down
- `/dashboard/bi/trends` - Trend analysis
- `/dashboard/bi/forecast` - Forecasting

**Key Metrics:**
- Revenue (current, MTD, YTD, YoY growth)
- Expenses (current, MTD, YTD, budget variance)
- Profit Margin (gross, net)
- Current Ratio, Quick Ratio
- DSO (Days Sales Outstanding)
- Inventory Turnover

---

### 3. Advanced Financial Reports

**Backend:**
- Service: FinancialReportService (cash flow, funds flow, equity, ratios)
- Router: /api/v1/reports/advanced/* (all advanced reports)

**Frontend:**
- `/dashboard/reports/cash-flow` - Cash Flow Statement
- `/dashboard/reports/funds-flow` - Funds Flow Statement
- `/dashboard/reports/equity` - Statement of Changes in Equity
- `/dashboard/reports/ratios` - Financial Ratio Analysis

**Report Logic:**
- Cash Flow: Indirect method (Net Income + Non-cash ± Working Capital)
- Funds Flow: Sources & Applications of working capital
- Equity: Opening + Profit - Dividends + Capital = Closing
- Ratios: Liquidity, Profitability, Efficiency, Solvency

---

### 4. Mobile App (React Native)

**Technology:** Expo (React Native framework)

**Screens:**
- Login & 2FA
- Dashboard (KPI cards, recent transactions)
- Approvals (pending list, approve/reject)
- Invoices (list, detail, status)
- Reports (customer/vendor statements)
- Share (WhatsApp, Email)

**Architecture:**
```
mobile/
├── app/
│   ├── (auth)/login.tsx
│   ├── (tabs)/
│   │   ├── dashboard.tsx
│   │   ├── approvals.tsx
│   │   ├── invoices.tsx
│   │   └── profile.tsx
│   └── invoice/[id].tsx
├── components/
│   ├── KPICard.tsx
│   ├── ApprovalCard.tsx
│   └── InvoiceCard.tsx
├── lib/
│   ├── api.ts (REST client)
│   └── auth.ts
└── app.json (Expo config)
```

---

## Implementation Strategy

### MVP Scope (Phase 3A)

Focus on **highest-impact, lowest-effort** items first:

1. **Project Costing** - Backend + Frontend (critical for service businesses)
2. **Advanced Financial Reports** - Backend + Frontend (legally required)
3. **BI Dashboard** - Basic KPI cards + trend charts (nice-to-have)

### Full Scope (Phase 3B)

4. **BI Advanced** - Forecasting, drill-down, custom dashboards
5. **Mobile App** - React Native app (iOS first, Android later)

---

## Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| BI dashboard slow with large datasets | High | Materialized views, pagination, caching |
| Mobile app requires significant effort | High | Start with responsive web, native later |
| Advanced reports need complex accounting logic | Medium | Use standard formulas, test thoroughly |
| Project costing needs integration with existing modules | Medium | Use existing invoices, expenses, payroll |

---

## Success Criteria

- ✅ Project profitability report <5 seconds
- ✅ BI dashboard loads <3 seconds (with 100K transactions)
- ✅ Cash Flow Statement balances 100%
- ✅ Mobile app launches <5 seconds
- ✅ All reports export to Excel/PDF

---

## Timeline Estimate

| Phase | Scope | Estimated Effort |
|-------|-------|-----------------|
| Phase 3A (MVP) | Project Costing + Advanced Reports + Basic BI | 2-3 weeks |
| Phase 3B (Full) | BI Advanced + Mobile App | 3-4 weeks |
| **Total Phase 3** | **All modules** | **5-7 weeks** |

---

## Dependencies

- ✅ Phase 1 modules complete
- ✅ Phase 2 modules complete
- ⏳ Redis setup (optional, for BI caching)
- ⏳ Expo CLI installed (for mobile app)

---

## Next Steps

1. Create tasks.md (detailed task breakdown)
2. Start with Project Costing (highest priority P3 module)
3. Implement Advanced Financial Reports
4. Build BI Dashboard
5. Develop Mobile App (optional, can defer)
