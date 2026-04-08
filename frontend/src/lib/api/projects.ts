/**
 * Project Costing API Client
 * Handles all API calls to the Project Costing backend
 */

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

export interface Project {
  id: string;
  project_code: string;
  project_name: string;
  client_id?: string;
  start_date: string;
  end_date?: string;
  budget: number;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  manager_id?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  phase_name: string;
  start_date: string;
  end_date?: string;
  budget_allocated: number;
  completion_pct: number;
}

export interface ProjectCost {
  id: string;
  project_id: string;
  phase_id?: string;
  cost_source_type: 'invoice' | 'expense' | 'payroll' | 'journal' | 'inventory';
  cost_source_id: string;
  amount: number;
  cost_category: string;
  allocated_date: string;
  description?: string;
}

export interface ProjectRevenue {
  id: string;
  project_id: string;
  invoice_id?: string;
  amount: number;
  recognized_date: string;
  description?: string;
}

// ============ Projects ============

export async function fetchProjects(status?: string): Promise<Project[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const params = status ? `?status=${status}` : '';
  const response = await axios.get(`${API_BASE}/projects${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function fetchProject(id: string): Promise<Project> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.get(`${API_BASE}/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createProject(data: Partial<Project>): Promise<Project> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.post(`${API_BASE}/projects`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.put(`${API_BASE}/projects/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ Project Costs ============

export async function fetchProjectCosts(projectId: string): Promise<ProjectCost[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.get(`${API_BASE}/projects/${projectId}/costs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function allocateCost(
  projectId: string,
  data: {
    phase_id?: string;
    cost_source_type: string;
    cost_source_id: string;
    amount: number;
    cost_category: string;
    allocated_date?: string;
    description?: string;
  }
): Promise<ProjectCost> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.post(`${API_BASE}/projects/${projectId}/costs`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ Project Revenue ============

export async function fetchProjectRevenue(projectId: string): Promise<ProjectRevenue[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.get(`${API_BASE}/projects/${projectId}/revenue`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ Reports ============

export async function fetchProjectProfitability(projectId: string): Promise<{
  project_id: string;
  project_code: string;
  project_name: string;
  budget: number;
  total_revenue: number;
  total_costs: number;
  gross_profit: number;
  profit_margin_pct: number;
  phase_breakdown: any[];
  cost_category_breakdown: any[];
}> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.get(`${API_BASE}/projects/${projectId}/profitability`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function fetchBudgetVsActual(projectId: string): Promise<{
  project_id: string;
  project_code: string;
  project_name: string;
  budget_total: number;
  actual_total: number;
  variance: number;
  variance_pct: number;
  phase_breakdown: any[];
}> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.get(`${API_BASE}/projects/${projectId}/budget-vs-actual`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}
