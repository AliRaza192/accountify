/**
 * Budget API Client
 * Handles all API calls for budget management
 */

import api from '@/lib/api';

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
  const params: any = {};
  if (fiscalYear) params.fiscal_year = fiscalYear;
  if (status) params.status = status;
  const response = await api.get('/api/budgets', { params });
  return response.data;
}

export async function fetchBudget(id: number): Promise<Budget> {
  const response = await api.get(`/api/budgets/${id}`);
  return response.data;
}

export async function createBudget(data: CreateBudgetData): Promise<Budget> {
  const response = await api.post('/api/budgets', data);
  return response.data;
}

export async function fetchBudgetVsActual(id: number): Promise<BudgetVsActual> {
  const response = await api.get(`/api/budgets/${id}/vs-actual`);
  return response.data;
}
