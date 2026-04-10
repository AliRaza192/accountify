/**
 * Financial Reports API Client
 * Handles all API calls to the advanced financial reporting endpoints
 */

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

const authHeaders = () => {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  return { Authorization: `Bearer ${token}` };
};

// ============ Types ============

export interface CashFlowStatement {
  period_start: string;
  period_end: string;
  operating_activities: {
    net_income: number;
    adjustments: {
      depreciation_amortization: number;
      changes_in_working_capital: {
        accounts_receivable: number;
        inventory: number;
        accounts_payable: number;
        other_current_assets: number;
        other_current_liabilities: number;
      };
    };
  };
  operating_cash_flow: number;
  investing_activities: {
    capital_expenditures: number;
    asset_sales: number;
    investments: number;
    net_investing_cash_flow: number;
  };
  financing_activities: {
    loan_proceeds: number;
    loan_repayments: number;
    dividends_paid: number;
    equity_issued: number;
    net_financing_cash_flow: number;
  };
  opening_cash_balance: number;
  closing_cash_balance: number;
  net_change_in_cash: number;
  balanced: boolean;
}

export interface FundsFlowStatement {
  period_start: string;
  period_end: string;
  sources: {
    net_profit: number;
    depreciation_amortization: number;
    long_term_borrowings: number;
    capital_introduced: number;
    asset_sales: number;
  };
  applications: {
    capital_expenditure: number;
    dividends_paid: number;
    tax_paid: number;
    loan_repayments: number;
  };
  working_capital: {
    change_in_current_assets: number;
    change_in_current_liabilities: number;
    net_change: number;
  };
  total_sources: number;
  total_applications: number;
  net_funds_flow: number;
  balanced: boolean;
}

export interface StatementOfEquity {
  period_start: string;
  period_end: string;
  opening_balance: {
    share_capital: number;
    reserves: number;
    retained_earnings: number;
    total: number;
  };
  changes: {
    net_profit: number;
    dividends: number;
    additional_capital: number;
    transfers_to_reserves: number;
    other_comprehensive_income: number;
    total: number;
  }[];
  closing_balance: {
    share_capital: number;
    reserves: number;
    retained_earnings: number;
    total: number;
  };
  balanced: boolean;
}

export interface FinancialRatiosResponse {
  period_start: string;
  period_end: string;
  profitability: {
    gross_margin_percent: number;
    net_margin_percent: number;
    return_on_assets: number;
    return_on_equity: number;
    earnings_per_share?: number;
  };
  liquidity: {
    current_ratio: number;
    quick_ratio: number;
    cash_ratio?: number;
  };
  efficiency: {
    inventory_turnover: number;
    receivables_turnover: number;
    payables_turnover: number;
    days_sales_outstanding: number;
    days_payable_outstanding: number;
    days_inventory_outstanding: number;
    cash_conversion_cycle: number;
  };
  leverage: {
    debt_to_equity: number;
    debt_to_assets: number;
    interest_coverage: number;
    equity_multiplier: number;
  };
  balanced: boolean;
}

// ============ API Functions ============

export async function getCashFlowStatement(
  start_date: string,
  end_date: string
): Promise<CashFlowStatement> {
  const params = new URLSearchParams();
  params.append('start_date', start_date);
  params.append('end_date', end_date);

  const response = await axios.get(`${API_BASE}/reports/advanced/cash-flow?${params.toString()}`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getFundsFlowStatement(
  start_date: string,
  end_date: string
): Promise<FundsFlowStatement> {
  const params = new URLSearchParams();
  params.append('start_date', start_date);
  params.append('end_date', end_date);

  const response = await axios.get(`${API_BASE}/reports/advanced/funds-flow?${params.toString()}`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getStatementOfEquity(
  start_date: string,
  end_date: string
): Promise<StatementOfEquity> {
  const params = new URLSearchParams();
  params.append('start_date', start_date);
  params.append('end_date', end_date);

  const response = await axios.get(`${API_BASE}/reports/advanced/equity?${params.toString()}`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getFinancialRatios(
  start_date: string,
  end_date: string
): Promise<FinancialRatiosResponse> {
  const params = new URLSearchParams();
  params.append('start_date', start_date);
  params.append('end_date', end_date);

  const response = await axios.get(`${API_BASE}/reports/advanced/ratios?${params.toString()}`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function exportAdvancedReportToExcel(
  report_type: 'cash-flow' | 'funds-flow' | 'equity' | 'ratios',
  start_date?: string,
  end_date?: string
): Promise<Blob> {
  const params = new URLSearchParams();
  params.append('report_type', report_type);
  if (start_date) params.append('start_date', start_date);
  if (end_date) params.append('end_date', end_date);

  const response = await axios.get(`${API_BASE}/reports/advanced/export/excel?${params.toString()}`, {
    headers: authHeaders(),
    responseType: 'blob',
  });
  return response.data;
}
