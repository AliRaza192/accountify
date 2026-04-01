/**
 * Tax Management API Client
 * Handles all API calls to the Tax Management backend
 */

import axios from 'axios';
import { supabase } from '@/lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface TaxRate {
  id: string;
  tax_name: string;
  rate_percent: number;
  tax_type: 'sales_tax' | 'input_tax' | 'wht' | 'federal_excise';
  effective_date: string;
  end_date?: string;
  is_active: boolean;
}

interface TaxReturn {
  id: string;
  return_period_month: number;
  return_period_year: number;
  output_tax_total: number;
  input_tax_total: number;
  net_tax_payable: number;
  filed_date?: string;
  challan_number?: string;
  challan_date?: string;
  status: 'draft' | 'filed' | 'paid';
}

interface WHTTransaction {
  id: string;
  transaction_date: string;
  party_id: string;
  party_type: 'customer' | 'vendor';
  amount: number;
  wht_category: string;
  wht_rate: number;
  wht_amount: number;
  is_filer: boolean;
}

export async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

// ============ Tax Rates ============

export async function fetchTaxRates(taxType?: string): Promise<TaxRate[]> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (taxType) params.append('tax_type', taxType);
  
  const response = await axios.get(`${API_BASE}/tax/rates?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createTaxRate(data: Partial<TaxRate>): Promise<TaxRate> {
  const token = await getAuthToken();
  const response = await axios.post(`${API_BASE}/tax/rates`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateTaxRate(id: string, data: Partial<TaxRate>): Promise<TaxRate> {
  const token = await getAuthToken();
  const response = await axios.put(`${API_BASE}/tax/rates/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ Tax Returns ============

export async function fetchTaxReturns(status?: string): Promise<TaxReturn[]> {
  const token = await getAuthToken();
  const params = status ? `?status=${status}` : '';
  const response = await axios.get(`${API_BASE}/tax/returns${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function generateTaxReturn(
  periodMonth: number,
  periodYear: number
): Promise<TaxReturn> {
  const token = await getAuthToken();
  const response = await axios.post(
    `${API_BASE}/tax/returns/generate`,
    { return_period_month: periodMonth, return_period_year: periodYear },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

export async function fetchTaxReturn(id: string): Promise<TaxReturn> {
  const token = await getAuthToken();
  const response = await axios.get(`${API_BASE}/tax/returns/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function fileTaxReturn(
  id: string,
  data: {
    challan_number?: string;
    challan_date?: string;
  }
): Promise<TaxReturn> {
  const token = await getAuthToken();
  const response = await axios.put(`${API_BASE}/tax/returns/${id}/file`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ WHT Transactions ============

export async function fetchWHTTransactions(
  fromDate?: string,
  toDate?: string,
  category?: string
): Promise<WHTTransaction[]> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (fromDate) params.append('from_date', fromDate);
  if (toDate) params.append('to_date', toDate);
  if (category) params.append('wht_category', category);
  
  const response = await axios.get(`${API_BASE}/tax/wht?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createWHTTransaction(data: Partial<WHTTransaction>): Promise<WHTTransaction> {
  const token = await getAuthToken();
  const response = await axios.post(`${API_BASE}/tax/wht`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function fetchWHTSummary(
  periodMonth?: number,
  periodYear?: number
): Promise<Array<{
  category: string;
  total_amount: number;
  total_wht: number;
  transaction_count: number;
}>> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (periodMonth) params.append('period_month', periodMonth.toString());
  if (periodYear) params.append('period_year', periodYear.toString());
  
  const response = await axios.get(`${API_BASE}/tax/wht/summary?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ Tax Reports ============

export async function fetchTaxSummary(
  periodMonth?: number,
  periodYear?: number
): Promise<{
  period: string;
  output_tax: number;
  input_tax: number;
  net_payable: number;
  wht_deducted: number;
  returns_filed: number;
  returns_pending: number;
}> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (periodMonth) params.append('period_month', periodMonth.toString());
  if (periodYear) params.append('period_year', periodYear.toString());
  
  const response = await axios.get(`${API_BASE}/tax/summary?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function fetchOutputTaxReport(
  fromDate?: string,
  toDate?: string
): Promise<Array<{
  invoice_number: string;
  customer_name: string;
  customer_ntn?: string;
  taxable_amount: number;
  tax_amount: number;
  date: string;
}>> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (fromDate) params.append('from_date', fromDate);
  if (toDate) params.append('to_date', toDate);
  
  const response = await axios.get(`${API_BASE}/tax/output-tax?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function fetchInputTaxReport(
  fromDate?: string,
  toDate?: string
): Promise<Array<{
  bill_number: string;
  vendor_name: string;
  vendor_ntn?: string;
  taxable_amount: number;
  tax_amount: number;
  date: string;
}>> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (fromDate) params.append('from_date', fromDate);
  if (toDate) params.append('to_date', toDate);
  
  const response = await axios.get(`${API_BASE}/tax/input-tax?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}
