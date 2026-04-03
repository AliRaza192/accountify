/**
 * Budget API Client
 * Handles all API calls for budget management
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

export interface Budget {
  id: number;
  fiscal_year: number;
  name: string;
  status: 'draft' | 'approved' | 'archived';
  total_amount?: number;
  branch_id?: number;
  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  created_at: string;
  lines?: BudgetLine[];
}

export interface BudgetLine {
  id: number;
  budget_id: number;
  account_id?: number;
  account_code?: string;
  account_name?: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
  total: number;
  notes?: string;
}

export interface BudgetVsActual {
  budget_id: number;
  budget_name: string;
  fiscal_year: number;
  lines: {
    account_id?: number;
    account_code?: string;
    budgeted: number;
    actual: number;
    variance: number;
    variance_percent: number;
  }[];
  summary: {
    total_budget: number;
    total_actual: number;
    utilization_percent: number;
  };
}

export interface CreateBudgetData {
  fiscal_year: number;
  name: string;
  branch_id?: number;
  lines?: {
    account_id?: number;
    cost_center_id?: number;
    [key: string]: any;
  }[];
}

export async function fetchBudgets(fiscalYear?: number, status?: string): Promise<Budget[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const params = new URLSearchParams();
  if (fiscalYear) params.append('fiscal_year', fiscalYear.toString());
  if (status) params.append('status', status);
  const qs = params.toString();
  const response = await fetch(`${API_BASE}/budgets${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch budgets');
  return response.json();
}

export async function fetchBudget(id: number): Promise<Budget> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/budgets/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch budget');
  return response.json();
}

export async function createBudget(data: CreateBudgetData): Promise<Budget> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/budgets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create budget');
  return response.json();
}

export async function fetchBudgetVsActual(id: number): Promise<BudgetVsActual> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/budgets/${id}/vs-actual`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch budget vs actual');
  return response.json();
}
