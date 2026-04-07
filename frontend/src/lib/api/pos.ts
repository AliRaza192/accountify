/**
 * POS API Client
 * Handles all API calls to the POS backend
 */

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

// ============ POS Sale ============

export async function processPOSSale(data: {
  customer_id?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    rate?: number;
    tax_rate: number;
  }>;
  discount: number;
  payment_method: 'cash' | 'card' | 'bank';
  notes?: string;
}): Promise<{
  success: boolean;
  message: string;
  invoice_id: string;
  invoice_number: string;
  total: number;
  receipt: any;
}> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.post(`${API_BASE}/pos/sale`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function getReceipt(invoiceId: string): Promise<any> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.get(`${API_BASE}/pos/receipt/${invoiceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ Shift Management ============

export async function openPOSShift(openingCash: number, notes?: string): Promise<any> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.post(
    `${API_BASE}/pos/shift/open`,
    { opening_cash: openingCash, notes },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

export async function closePOSShift(shiftId: string, closingCash: number, notes?: string): Promise<any> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.post(
    `${API_BASE}/pos/shift/${shiftId}/close`,
    { closing_cash: closingCash, notes },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

export async function listPOSShifts(fromDate?: string, toDate?: string): Promise<any[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const params = new URLSearchParams();
  if (fromDate) params.append('from_date', fromDate);
  if (toDate) params.append('to_date', toDate);
  
  const response = await axios.get(`${API_BASE}/pos/shifts?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ Hold/Resume Transactions ============

export async function holdPOSTransaction(data: {
  items: any[];
  customer_id?: string;
  customer_name?: string;
  discount?: number;
  notes?: string;
}): Promise<{ success: boolean; hold_number: string; id: string }> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.post(`${API_BASE}/pos/hold`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function listHeldTransactions(): Promise<any[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.get(`${API_BASE}/pos/held`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function resumeHeldTransaction(holdId: string): Promise<any> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.post(
    `${API_BASE}/pos/held/${holdId}/resume`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

export async function deleteHeldTransaction(holdId: string): Promise<{ success: boolean }> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.delete(`${API_BASE}/pos/held/${holdId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ POS Reports ============

export async function getPOSDailySummary(reportDate?: string): Promise<any> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const params = reportDate ? `?report_date=${reportDate}` : '';
  const response = await axios.get(`${API_BASE}/pos/reports/daily-summary${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function getPOSCashierSummary(reportDate?: string): Promise<any> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const params = reportDate ? `?report_date=${reportDate}` : '';
  const response = await axios.get(`${API_BASE}/pos/reports/cashier-summary${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}
