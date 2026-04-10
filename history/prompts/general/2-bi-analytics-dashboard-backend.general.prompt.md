---
id: "2"
title: "BI Analytics Dashboard Backend"
stage: "general"
date: "2026-04-10"
surface: "agent"
model: "qwen-code"
feature: "bi-analytics-dashboard"
branch: "main"
user: "aliraza"
command: "Create BI & Analytics Dashboard backend"
labels: ["bi", "analytics", "dashboard", "backend", "fastapi", "phase-3"]
links:
  spec: "null"
  ticket: "null"
  adr: "null"
  pr: "null"
files_yaml: |
  - /home/aliraza/Desktop/accountify/backend/app/schemas/bi_dashboard.py
  - /home/aliraza/Desktop/accountify/backend/app/services/bi_service.py
  - /home/aliraza/Desktop/accountify/backend/app/routers/bi_dashboard.py
  - /home/aliraza/Desktop/accountify/backend/app/main.py
tests_yaml: |
  - Verified schema imports: KPIMetricsResponse, TrendDataPoint, ExpenseTrendResponse, FinancialRatiosResponse, CustomerMetric, ProductMetric, ExportResponse
  - Verified service import: BIDashboardService
  - Verified router import: 7 routes registered
---

# BI & Analytics Dashboard Backend

## Summary
Created complete BI & Analytics Dashboard backend for the accounting software (Phase 3, User Story 2).

## Files Created/Modified

1. **`/home/aliraza/Desktop/accountify/backend/app/schemas/bi_dashboard.py`** (new)
   - `KPIMetricsResponse` - KPI cards data with all financial metrics
   - `TrendDataPoint` - {month, value, previous_year}
   - `ExpenseByCategory` - {category, amount, percentage}
   - `ExpenseTrendResponse` - Monthly expense trends with category breakdown
   - `FinancialRatiosResponse` - All calculated ratios (liquidity, profitability, efficiency, leverage)
   - `CustomerMetric` - Top customer revenue data
   - `ProductMetric` - Top product sales data
   - `ExportResponse` - Excel/CSV export response

2. **`/home/aliraza/Desktop/accountify/backend/app/services/bi_service.py`** (new)
   - `BIDashboardService` class with SQLAlchemy session-based queries
   - `get_kpi_metrics()` - Returns total revenue, expenses, net profit, margins, liquidity ratios, DSO
   - `get_revenue_trends()` - Monthly revenue with YoY comparison (12 months default)
   - `get_expense_trends()` - Monthly expenses by category with YoY comparison
   - `get_financial_ratios()` - Full ratio suite: current, quick, cash, gross margin, net margin, ROA, ROE, DSO, DPO, debt-to-equity, debt ratio
   - `get_top_customers()` - Top N customers by revenue with outstanding balances
   - `get_top_products()` - Top N products by sales with quantity and avg price
   - `export_to_excel()` - Multi-sheet Excel export (openpyxl) with CSV fallback
   - Internal helpers: `_get_total_revenue`, `_get_total_expenses`, `_get_cogs`, `_get_liquidity_ratios`, `_get_cash_ratio`, `_get_dso`, `_get_dpo`, `_get_total_assets`, `_get_total_liabilities`, `_get_expense_by_category`, `_safe_percent`

3. **`/home/aliraza/Desktop/accountify/backend/app/routers/bi_dashboard.py`** (new)
   - `GET /api/bi/dashboard` - KPI metrics dashboard
   - `GET /api/bi/revenue-trends` - Revenue trends with chart data
   - `GET /api/bi/expense-trends` - Expense trends by category
   - `GET /api/bi/ratios` - Financial ratios analysis
   - `GET /api/bi/top-customers` - Top customers list
   - `GET /api/bi/top-products` - Top products list
   - `GET /api/bi/export` - Export to Excel

4. **`/home/aliraza/Desktop/accountify/backend/app/main.py`** (modified)
   - Added BI router registration with prefix `/api/bi`

## Implementation Details
- All endpoints require authenticated user with `company_id`
- Queries actual tables: `invoices`, `bills`, `invoice_items`, `products`, `customers`, `vendors`, `accounts`, `journal_entries`, `journals`
- Handles empty data gracefully (returns zeros, not errors)
- Uses `Decimal` for monetary values throughout
- Date format: ISO 8601 (YYYY-MM-DD)
- Excel export uses openpyxl with 6 sheets (KPI, Revenue Trends, Expense Trends, Ratios, Customers, Products)
- CSV fallback when openpyxl not available
- Proper error handling with HTTPException and logging
