/**
 * Bank Reconciliation API Client
 * Handles all API calls to the Bank Reconciliation backend
 */

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

interface BankAccount {
  id: string;
  name: string;
  account_number: string;
  bank_name: string;
  branch?: string;
  iban?: string;
  currency: string;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
}

interface PDC {
  id: string;
  cheque_number: string;
  bank_name: string;
  cheque_date: string;
  amount: number;
  party_type: 'customer' | 'vendor';
  party_id: string;
  status: 'pending' | 'deposited' | 'cleared' | 'bounced' | 'returned';
  deposited_at?: string;
  cleared_at?: string;
  bounced_at?: string;
  bounce_reason?: string;
}

// ============ Bank Accounts ============

export async function fetchBankAccounts(isActive = true): Promise<BankAccount[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.get(`${API_BASE}/bank-reconciliation/accounts?is_active=${isActive}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createBankAccount(data: Partial<BankAccount>): Promise<BankAccount> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.post(`${API_BASE}/bank-reconciliation/accounts`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateBankAccount(id: string, data: Partial<BankAccount>): Promise<BankAccount> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.put(`${API_BASE}/bank-reconciliation/accounts/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function importBankStatement(
  bankAccountId: string,
  statementDate: string,
  openingBalance: number,
  closingBalance: number,
  file: File
): Promise<{
  id: string;
  bank_account_id: string;
  statement_date: string;
  opening_balance: number;
  closing_balance: number;
  transactions_count: number;
}> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const formData = new FormData();
  formData.append('bank_account_id', bankAccountId);
  formData.append('statement_date', statementDate);
  formData.append('opening_balance', openingBalance.toString());
  formData.append('closing_balance', closingBalance.toString());
  formData.append('file', file);

  const response = await axios.post(`${API_BASE}/bank-reconciliation/import-statement`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

// ============ Reconciliation Sessions ============

export async function fetchReconciliationSessions(
  bankAccountId?: string,
  status?: string
): Promise<Array<{
  id: string;
  bank_account_id: string;
  period_month: number;
  period_year: number;
  opening_balance: number;
  closing_balance_per_bank: number;
  closing_balance_per_books: number;
  difference: number;
  status: string;
  completed_at?: string;
}>> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const params = new URLSearchParams();
  if (bankAccountId) params.append('bank_account_id', bankAccountId);
  if (status) params.append('status', status);

  const response = await axios.get(`${API_BASE}/bank-reconciliation/sessions?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function startReconciliationSession(data: {
  bank_account_id: string;
  period_month: number;
  period_year: number;
  opening_balance: number;
  closing_balance_per_bank: number;
}): Promise<{
  id: string;
  status: string;
  difference: number;
}> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.post(`${API_BASE}/bank-reconciliation/sessions`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function matchTransactions(
  sessionId: string,
  data: {
    bank_transaction_id: string;
    system_transaction_id: string;
    match_type?: 'auto' | 'manual';
  }
): Promise<{ message: string }> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.post(`${API_BASE}/bank-reconciliation/sessions/${sessionId}/match`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function completeReconciliation(sessionId: string): Promise<{
  id: string;
  status: string;
  completed_at: string;
}> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.post(`${API_BASE}/bank-reconciliation/sessions/${sessionId}/complete`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ PDCs ============

export async function fetchPDCs(
  status?: string,
  partyType?: string,
  fromDate?: string,
  toDate?: string
): Promise<PDC[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (partyType) params.append('party_type', partyType);
  if (fromDate) params.append('from_date', fromDate);
  if (toDate) params.append('to_date', toDate);

  const response = await axios.get(`${API_BASE}/bank-reconciliation/pdcs?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createPDC(data: Partial<PDC>): Promise<PDC> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.post(`${API_BASE}/bank-reconciliation/pdcs`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updatePDCStatus(
  id: string,
  status: 'pending' | 'deposited' | 'cleared' | 'bounced' | 'returned',
  bounceReason?: string
): Promise<PDC> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.put(
    `${API_BASE}/bank-reconciliation/pdcs/${id}/status`,
    { status, bounce_reason: bounceReason },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

export async function fetchPDCMaturityReport(daysAhead = 30): Promise<Array<{
  id: string;
  cheque_number: string;
  party_name: string;
  party_type: string;
  amount: number;
  cheque_date: string;
  days_until_maturity: number;
  status: string;
}>> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.get(`${API_BASE}/bank-reconciliation/pdcs/maturity-report?days_ahead=${daysAhead}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ Cash Position ============

export async function fetchCashPosition(): Promise<{
  total_cash_in_hand: number;
  total_cash_at_bank: number;
  total_pdc_receivable: number;
  total_pdc_payable: number;
  net_cash_position: number;
  bank_accounts: Array<{
    id: string;
    name: string;
    bank_name: string;
    account_number: string;
    balance: number;
  }>;
}> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await axios.get(`${API_BASE}/bank-reconciliation/cash-position`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}
