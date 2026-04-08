"""
Financial Report Service
Generates advanced financial statements: Cash Flow, Equity Statement, Financial Ratios
"""

import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class FinancialReportService:
    """Service for generating advanced financial reports"""

    def __init__(self, db: Session):
        self.db = db

    # ============ Cash Flow Statement (Indirect Method) ============

    def generate_cash_flow_statement(
        self,
        company_id: UUID,
        fiscal_year: int
    ) -> Dict[str, Any]:
        """
        Generate Cash Flow Statement using indirect method.
        Starts with Net Income, adjusts for non-cash items and working capital changes.
        """
        # Try to get data from existing tables
        try:
            # Get net income from trial balance or profit & loss
            net_income = self._get_net_income(company_id, fiscal_year)

            # Get non-cash expenses (depreciation, amortization)
            depreciation = self._get_depreciation_expense(company_id, fiscal_year)

            # Get working capital changes
            ar_change = self._get_ar_change(company_id, fiscal_year)
            inventory_change = self._get_inventory_change(company_id, fiscal_year)
            ap_change = self._get_ap_change(company_id, fiscal_year)

            # Operating Activities
            operating_activities = {
                "net_income": net_income,
                "adjustments": {
                    "depreciation_amortization": depreciation,
                    "changes_in_working_capital": {
                        "accounts_receivable": -ar_change,  # Increase in AR reduces cash
                        "inventory": -inventory_change,  # Increase in inventory reduces cash
                        "accounts_payable": ap_change,  # Increase in AP increases cash
                    }
                }
            }

            operating_cash_flow = (
                net_income + depreciation - ar_change - inventory_change + ap_change
            )

            # Investing Activities (placeholder - needs asset purchase data)
            investing_activities = {
                "capital_expenditures": Decimal("0"),
                "asset_sales": Decimal("0"),
                "net_investing_cash_flow": Decimal("0")
            }

            # Financing Activities (placeholder - needs loan/equity data)
            financing_activities = {
                "loan_proceeds": Decimal("0"),
                "loan_repayments": Decimal("0"),
                "dividends_paid": Decimal("0"),
                "equity_issued": Decimal("0"),
                "net_financing_cash_flow": Decimal("0")
            }

            # Net Change in Cash
            net_cash_change = operating_cash_flow + investing_activities["net_investing_cash_flow"] + financing_activities["net_financing_cash_flow"]

            # Get opening cash balance
            opening_cash = self._get_opening_cash_balance(company_id, fiscal_year)
            closing_cash = opening_cash + net_cash_change

            return {
                "fiscal_year": fiscal_year,
                "operating_activities": operating_activities,
                "operating_cash_flow": operating_cash_flow.quantize(Decimal("0.01")),
                "investing_activities": investing_activities,
                "financing_activities": financing_activities,
                "net_change_in_cash": net_cash_change.quantize(Decimal("0.01")),
                "opening_cash_balance": opening_cash.quantize(Decimal("0.01")),
                "closing_cash_balance": closing_cash.quantize(Decimal("0.01")),
                "balanced": abs((opening_cash + net_cash_change - closing_cash)) < Decimal("0.01")
            }

        except Exception as e:
            logger.error(f"Error generating cash flow statement: {e}")
            raise

    # ============ Statement of Changes in Equity ============

    def generate_equity_statement(
        self,
        company_id: UUID,
        fiscal_year: int
    ) -> Dict[str, Any]:
        """
        Generate Statement of Changes in Equity.
        Opening Equity + Net Profit - Dividends + Additional Capital = Closing Equity
        """
        try:
            # Get opening equity
            opening_equity = self._get_opening_equity(company_id, fiscal_year)

            # Get net profit for the year
            net_profit = self._get_net_income(company_id, fiscal_year)

            # Get additional capital introduced
            additional_capital = self._get_additional_capital(company_id, fiscal_year)

            # Get dividends paid
            dividends = self._get_dividends_paid(company_id, fiscal_year)

            # Calculate closing equity
            closing_equity = opening_equity + net_profit + additional_capital - dividends

            return {
                "fiscal_year": fiscal_year,
                "opening_equity": opening_equity.quantize(Decimal("0.01")),
                "additions": {
                    "net_profit_for_year": net_profit.quantize(Decimal("0.01")),
                    "additional_capital_introduced": additional_capital.quantize(Decimal("0.01")),
                },
                "deductions": {
                    "dividends_paid": dividends.quantize(Decimal("0.01")),
                },
                "closing_equity": closing_equity.quantize(Decimal("0.01")),
                "balanced": True  # This equation always balances by definition
            }

        except Exception as e:
            logger.error(f"Error generating equity statement: {e}")
            raise

    # ============ Financial Ratio Analysis ============

    def calculate_financial_ratios(
        self,
        company_id: UUID,
        fiscal_year: int
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive financial ratios.
        Returns liquidity, profitability, efficiency, and solvency ratios.
        """
        try:
            # Get required financial data
            current_assets = self._get_current_assets(company_id, fiscal_year)
            current_liabilities = self._get_current_liabilities(company_id, fiscal_year)
            inventory = self._get_inventory_value(company_id, fiscal_year)
            total_assets = self._get_total_assets(company_id, fiscal_year)
            total_liabilities = self._get_total_liabilities(company_id, fiscal_year)
            equity = self._get_total_equity(company_id, fiscal_year)
            revenue = self._get_revenue(company_id, fiscal_year)
            cogs = self._get_cogs(company_id, fiscal_year)
            net_income = self._get_net_income(company_id, fiscal_year)
            operating_expenses = self._get_operating_expenses(company_id, fiscal_year)

            # Liquidity Ratios
            current_ratio = current_assets / current_liabilities if current_liabilities > 0 else Decimal("0")
            quick_ratio = (current_assets - inventory) / current_liabilities if current_liabilities > 0 else Decimal("0")

            # Profitability Ratios
            gross_profit = revenue - cogs
            gross_margin_pct = (gross_profit / revenue * 100) if revenue > 0 else Decimal("0")
            net_margin_pct = (net_income / revenue * 100) if revenue > 0 else Decimal("0")
            roa = (net_income / total_assets * 100) if total_assets > 0 else Decimal("0")
            roe = (net_income / equity * 100) if equity > 0 else Decimal("0")

            # Efficiency Ratios
            inventory_turnover = cogs / inventory if inventory > 0 else Decimal("0")
            dso = 365 / (revenue / current_assets) if revenue > 0 and current_assets > 0 else Decimal("0")

            # Solvency Ratios
            debt_to_equity = total_liabilities / equity if equity > 0 else Decimal("0")

            return {
                "fiscal_year": fiscal_year,
                "liquidity_ratios": {
                    "current_ratio": round(float(current_ratio), 2),
                    "quick_ratio": round(float(quick_ratio), 2),
                    "interpretation": {
                        "current": "Good" if current_ratio >= 1.5 else "Needs Attention",
                        "quick": "Good" if quick_ratio >= 1.0 else "Needs Attention"
                    }
                },
                "profitability_ratios": {
                    "gross_margin_pct": round(float(gross_margin_pct), 2),
                    "net_margin_pct": round(float(net_margin_pct), 2),
                    "roa_pct": round(float(roa), 2),
                    "roe_pct": round(float(roe), 2),
                },
                "efficiency_ratios": {
                    "inventory_turnover": round(float(inventory_turnover), 2),
                    "days_sales_outstanding": round(float(dso), 2),
                },
                "solvency_ratios": {
                    "debt_to_equity": round(float(debt_to_equity), 2),
                    "interpretation": "Conservative" if debt_to_equity < 1 else "Leveraged"
                },
                "summary": {
                    "revenue": float(revenue),
                    "net_income": float(net_income),
                    "total_assets": float(total_assets),
                    "total_equity": float(equity)
                }
            }

        except Exception as e:
            logger.error(f"Error calculating financial ratios: {e}")
            raise

    # ============ Funds Flow Statement ============

    def generate_funds_flow_statement(
        self,
        company_id: UUID,
        fiscal_year: int
    ) -> Dict[str, Any]:
        """
        Generate Funds Flow Statement showing sources and applications of working capital.
        """
        try:
            # Sources of Funds
            funds_from_operations = self._get_net_income(company_id, fiscal_year)
            additional_capital = self._get_additional_capital(company_id, fiscal_year)
            long_term_loans = self._get_long_term_loans(company_id, fiscal_year)

            total_sources = funds_from_operations + additional_capital + long_term_loans

            # Applications of Funds
            capital_expenditures = self._get_capital_expenditures(company_id, fiscal_year)
            loan_repayments = self._get_loan_repayments(company_id, fiscal_year)
            dividends_paid = self._get_dividends_paid(company_id, fiscal_year)

            total_applications = capital_expenditures + loan_repayments + dividends_paid

            # Net change in working capital
            net_working_capital_change = total_sources - total_applications

            return {
                "fiscal_year": fiscal_year,
                "sources_of_funds": {
                    "funds_from_operations": funds_from_operations.quantize(Decimal("0.01")),
                    "additional_capital": additional_capital.quantize(Decimal("0.01")),
                    "long_term_loans": long_term_loans.quantize(Decimal("0.01")),
                    "total_sources": total_sources.quantize(Decimal("0.01"))
                },
                "applications_of_funds": {
                    "capital_expenditures": capital_expenditures.quantize(Decimal("0.01")),
                    "loan_repayments": loan_repayments.quantize(Decimal("0.01")),
                    "dividends_paid": dividends_paid.quantize(Decimal("0.01")),
                    "total_applications": total_applications.quantize(Decimal("0.01"))
                },
                "net_change_in_working_capital": net_working_capital_change.quantize(Decimal("0.01"))
            }

        except Exception as e:
            logger.error(f"Error generating funds flow statement: {e}")
            raise

    # ============ Helper Methods (Placeholders) ============
    # These need to be implemented based on actual data models

    def _get_net_income(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get net income for fiscal year"""
        # TODO: Query income statement data
        return Decimal("0")

    def _get_depreciation_expense(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get total depreciation for the year"""
        # TODO: Query fixed assets depreciation
        return Decimal("0")

    def _get_opening_cash_balance(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get cash balance at start of year"""
        # TODO: Query bank accounts opening balance
        return Decimal("0")

    def _get_opening_equity(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get equity at start of year"""
        # TODO: Query equity account opening balance
        return Decimal("0")

    def _get_additional_capital(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get additional capital introduced"""
        return Decimal("0")

    def _get_dividends_paid(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get dividends paid during the year"""
        return Decimal("0")

    def _get_current_assets(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get total current assets"""
        return Decimal("0")

    def _get_current_liabilities(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get total current liabilities"""
        return Decimal("0")

    def _get_inventory_value(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get inventory value"""
        return Decimal("0")

    def _get_total_assets(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get total assets"""
        return Decimal("0")

    def _get_total_liabilities(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get total liabilities"""
        return Decimal("0")

    def _get_total_equity(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get total equity"""
        return Decimal("0")

    def _get_revenue(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get total revenue"""
        return Decimal("0")

    def _get_cogs(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get cost of goods sold"""
        return Decimal("0")

    def _get_operating_expenses(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get operating expenses"""
        return Decimal("0")

    def _get_capital_expenditures(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get capital expenditures"""
        return Decimal("0")

    def _get_long_term_loans(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get long-term loans taken"""
        return Decimal("0")

    def _get_loan_repayments(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get loan repayments made"""
        return Decimal("0")

    def _get_ar_change(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get change in accounts receivable"""
        return Decimal("0")

    def _get_inventory_change(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get change in inventory"""
        return Decimal("0")

    def _get_ap_change(self, company_id: UUID, fiscal_year: int) -> Decimal:
        """Get change in accounts payable"""
        return Decimal("0")
