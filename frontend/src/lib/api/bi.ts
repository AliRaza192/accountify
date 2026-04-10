/**
 * BI & Analytics API Client
 * Handles all API calls to the BI backend endpoints
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

export interface DashboardMetrics {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  gross_margin_percent: number;
  net_margin_percent: number;
  current_ratio: number;
  quick_ratio: number;
  dso: number;
  inventory_turnover: number;
  revenue_trend_percent: number;
  expense_trend_percent: number;
  period_start: string;
  period_end: string;
}

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
  expenses: number;
  net_profit: number;
  previous_year_revenue?: number;
}

export interface ExpenseCategoryPoint {
  category: string;
  amount: number;
  percent_of_total: number;
}

export interface FinancialRatios {
  // Profitability
  gross_margin_percent: number;
  net_margin_percent: number;
  roa: number;
  roe: number;
  // Liquidity
  current_ratio: number;
  quick_ratio: number;
  // Efficiency
  inventory_turnover: number;
  dso: number;
  dpo: number;
  // Leverage
  debt_to_equity: number;
  interest_coverage: number;
  period_start: string;
  period_end: string;
}

export interface CustomerRanking {
  rank: number;
  customer_name: string;
  total_revenue: number;
  total_invoices: number;
  outstanding_balance: number;
  avg_payment_days: number;
}

export interface ProductRanking {
  rank: number;
  product_name: string;
  sku?: string;
  quantity_sold: number;
  total_revenue: number;
  total_profit: number;
}

export interface RatioHistoryPoint {
  period: string;
  gross_margin_percent: number;
  net_margin_percent: number;
  roa: number;
  roe: number;
  current_ratio: number;
  quick_ratio: number;
  inventory_turnover: number;
  dso: number;
  dpo: number;
  debt_to_equity: number;
  interest_coverage: number;
}

// ============ API Functions ============

export async function getDashboardMetrics(
  start_date?: string,
  end_date?: string
): Promise<DashboardMetrics> {
  const params = new URLSearchParams();
  if (start_date) params.append('start_date', start_date);
  if (end_date) params.append('end_date', end_date);

  const response = await axios.get(`${API_BASE}/bi/metrics?${params.toString()}`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getRevenueTrends(
  months: number = 12
): Promise<RevenueTrendPoint[]> {
  const response = await axios.get(`${API_BASE}/bi/revenue-trends?months=${months}`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getExpenseTrends(
  months: number = 12
): Promise<ExpenseCategoryPoint[]> {
  const response = await axios.get(`${API_BASE}/bi/expense-trends?months=${months}`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getFinancialRatios(
  start_date?: string,
  end_date?: string
): Promise<FinancialRatios> {
  const params = new URLSearchParams();
  if (start_date) params.append('start_date', start_date);
  if (end_date) params.append('end_date', end_date);

  const response = await axios.get(`${API_BASE}/bi/ratios?${params.toString()}`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getTopCustomers(
  limit: number = 5
): Promise<CustomerRanking[]> {
  const response = await axios.get(`${API_BASE}/bi/top-customers?limit=${limit}`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getTopProducts(
  limit: number = 5
): Promise<ProductRanking[]> {
  const response = await axios.get(`${API_BASE}/bi/top-products?limit=${limit}`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getRatioHistory(
  months: number = 12
): Promise<RatioHistoryPoint[]> {
  const response = await axios.get(`${API_BASE}/bi/ratio-history?months=${months}`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function exportToExcel(
  start_date?: string,
  end_date?: string
): Promise<Blob> {
  const params = new URLSearchParams();
  if (start_date) params.append('start_date', start_date);
  if (end_date) params.append('end_date', end_date);

  const response = await axios.get(`${API_BASE}/bi/export/excel?${params.toString()}`, {
    headers: authHeaders(),
    responseType: 'blob',
  });
  return response.data;
}
