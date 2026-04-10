"""
BI & Analytics Dashboard Schemas
Pydantic models for BI dashboard responses.
"""

from decimal import Decimal
from datetime import date
from typing import Optional, List
from pydantic import BaseModel


class KPIMetricsResponse(BaseModel):
    """KPI cards data for dashboard overview."""
    total_revenue: Decimal = Decimal("0.00")
    total_expenses: Decimal = Decimal("0.00")
    net_profit: Decimal = Decimal("0.00")
    gross_margin_percent: Decimal = Decimal("0.00")
    net_profit_percent: Decimal = Decimal("0.00")
    current_ratio: Decimal = Decimal("0.00")
    quick_ratio: Decimal = Decimal("0.00")
    dso: Decimal = Decimal("0.00")  # Days Sales Outstanding


class TrendDataPoint(BaseModel):
    """Single data point for trend charts."""
    month: str  # ISO format: "2025-01"
    value: float = 0.0
    previous_year: float = 0.0


class ExpenseByCategory(BaseModel):
    """Expense breakdown by category."""
    category: str
    amount: Decimal = Decimal("0.00")
    percentage: Decimal = Decimal("0.00")


class ExpenseTrendResponse(BaseModel):
    """Monthly expense trends with category breakdown."""
    trends: List[TrendDataPoint] = []
    by_category: List[ExpenseByCategory] = []
    total_expenses: Decimal = Decimal("0.00")


class FinancialRatiosResponse(BaseModel):
    """All calculated financial ratios."""
    # Liquidity Ratios
    current_ratio: Decimal = Decimal("0.00")
    quick_ratio: Decimal = Decimal("0.00")
    cash_ratio: Decimal = Decimal("0.00")
    # Profitability Ratios
    gross_profit_margin: Decimal = Decimal("0.00")
    net_profit_margin: Decimal = Decimal("0.00")
    return_on_assets: Decimal = Decimal("0.00")
    return_on_equity: Decimal = Decimal("0.00")
    # Efficiency Ratios
    dso: Decimal = Decimal("0.00")  # Days Sales Outstanding
    dpo: Decimal = Decimal("0.00")  # Days Payable Outstanding
    # Leverage Ratios
    debt_to_equity: Decimal = Decimal("0.00")
    debt_ratio: Decimal = Decimal("0.00")
    # Additional Metrics
    total_revenue: Decimal = Decimal("0.00")
    total_expenses: Decimal = Decimal("0.00")
    net_profit: Decimal = Decimal("0.00")
    total_assets: Decimal = Decimal("0.00")
    total_liabilities: Decimal = Decimal("0.00")
    total_equity: Decimal = Decimal("0.00")


class CustomerMetric(BaseModel):
    """Top customer metric."""
    customer_id: str
    customer_name: str
    total_revenue: Decimal = Decimal("0.00")
    invoice_count: int = 0
    avg_invoice_value: Decimal = Decimal("0.00")
    outstanding_balance: Decimal = Decimal("0.00")


class ProductMetric(BaseModel):
    """Top product metric."""
    product_id: str
    product_name: str
    sku: Optional[str] = None
    total_sales: Decimal = Decimal("0.00")
    quantity_sold: int = 0
    avg_unit_price: Decimal = Decimal("0.00")


class ExportResponse(BaseModel):
    """Excel export response."""
    success: bool
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    message: str
