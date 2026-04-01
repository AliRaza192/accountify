/**
 * Cost Centers API Client
 * Handles all API calls to the Cost Centers backend
 */

import axios from 'axios';
import { getSupabaseClient } from '@/lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface CostCenter {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  overhead_allocation_rule?: any;
  created_at: string;
}

interface CostCenterAllocation {
  id: string;
  cost_center_id: string;
  transaction_type: string;
  transaction_id: string;
  amount: number;
  allocation_percent: number;
  created_at: string;
}

export async function getAuthToken(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

export async function fetchCostCenters(status?: string): Promise<CostCenter[]> {
  const token = await getAuthToken();
  const params = status ? `?status=${status}` : '';
  const response = await axios.get(`${API_BASE}/cost-centers${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function fetchCostCenter(id: string): Promise<CostCenter> {
  const token = await getAuthToken();
  const response = await axios.get(`${API_BASE}/cost-centers/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createCostCenter(data: Partial<CostCenter>): Promise<CostCenter> {
  const token = await getAuthToken();
  const response = await axios.post(`${API_BASE}/cost-centers`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateCostCenter(
  id: string,
  data: Partial<CostCenter>
): Promise<CostCenter> {
  const token = await getAuthToken();
  const response = await axios.put(`${API_BASE}/cost-centers/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function deleteCostCenter(id: string): Promise<void> {
  const token = await getAuthToken();
  await axios.delete(`${API_BASE}/cost-centers/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function allocateTransaction(
  costCenterId: string,
  data: {
    transaction_type: string;
    transaction_id: string;
    amount: number;
    allocation_percent?: number;
  }
): Promise<CostCenterAllocation> {
  const token = await getAuthToken();
  const response = await axios.post(
    `${API_BASE}/cost-centers/${costCenterId}/allocate`,
    data,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

export async function allocateOverhead(
  data: {
    source_account_code: string;
    amount: number;
    allocation_type: string;
    cost_center_ids: string[];
    percentages?: number[];
  }
): Promise<{
  allocations_created: number;
  total_allocated: number;
  cost_centers: Array<{ id: string; name: string }>;
}> {
  const token = await getAuthToken();
  const response = await axios.post(`${API_BASE}/cost-centers/allocate-overhead`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function fetchDepartmentPL(
  costCenterId: string,
  periodMonth?: number,
  periodYear?: number
): Promise<{
  cost_center_id: string;
  cost_center_code: string;
  cost_center_name: string;
  period: string;
  revenue: number;
  direct_expenses: number;
  gross_profit: number;
  allocated_overhead: number;
  net_profit: number;
  line_items: any[];
}> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (periodMonth) params.append('period_month', periodMonth.toString());
  if (periodYear) params.append('period_year', periodYear.toString());
  
  const response = await axios.get(
    `${API_BASE}/cost-centers/${costCenterId}/pl-report?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

export async function fetchCostCenterSummary(
  periodMonth?: number,
  periodYear?: number
): Promise<Array<{
  id: string;
  code: string;
  name: string;
  status: string;
  allocation_count: number;
  total_amount: number;
}>> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (periodMonth) params.append('period_month', periodMonth.toString());
  if (periodYear) params.append('period_year', periodYear.toString());
  
  const response = await axios.get(
    `${API_BASE}/cost-centers/reports/summary?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}
