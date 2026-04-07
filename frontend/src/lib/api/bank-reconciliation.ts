/**
 * Bank Reconciliation API Client
 * Handles all API calls to the Bank Reconciliation backend
 * Pakistani banking conventions: PKR currency, DD/MM/YYYY dates
 */

import api from '@/lib/api';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function getAuthToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  return { Authorization: `Bearer ${token}` };
}

// ============ TypeScript Types ============

export interface BankAccount {
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
  created_at: string;
  updated_at: string;
}

export interface BankStatementTransaction {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  cheque_number?: string;
}

export interface BankStatementImportResponse {
  id: string;
  bank_account_id: string;
  statement_date: string;
  opening_balance: number;
  closing_balance: number;
  transactions_count: number;
  imported_at: string;
  imported_by: string;
}

export interface ReconciliationSession {
  id: string;
  bank_account_id: string;
  period_month: number;
  period_year: number;
  opening_balance: number;
  closing_balance_per_bank: number;
  closing_balance_per_books: number;
  difference: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationSessionDetail extends ReconciliationSession {
  bank_transactions: BankTransaction[];
  system_transactions: SystemTransaction[];
  matched_transactions: MatchedTransaction[];
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  cheque_number?: string;
  reference?: string;
  matched: boolean;
}

export interface SystemTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'payment' | 'receipt' | 'journal';
  reference?: string;
  party_name?: string;
  matched: boolean;
}

export interface MatchedTransaction {
  bank_transaction_id: string;
  system_transaction_id: string;
  match_type: 'auto' | 'manual';
  matched_at: string;
}

export interface MatchingSuggestion {
  auto_matches: AutoMatch[];
  unmatched_bank_transactions: BankTransaction[];
  unmatched_system_transactions: SystemTransaction[];
  matching_rules_applied: string[];
}

export interface AutoMatch {
  bank_transaction: BankTransaction;
  system_transaction: SystemTransaction;
  confidence: 'high' | 'medium' | 'low';
  match_reason: string;
}

export interface ReconciliationStatement {
  bank_account: {
    id: string;
    name: string;
    bank_name: string;
    account_number: string;
  };
  period: {
    from_date: string | null;
    to_date: string | null;
  };
  reconciled_sessions: Array<{
    id: string;
    period: string;
    opening_balance: number;
    closing_balance_per_bank: number;
    closing_balance_per_books: number;
    difference: number;
    completed_at: string | null;
  }>;
  summary: {
    total_sessions: number;
    last_reconciled: string | null;
    last_difference: number;
  };
}

// ============ PDC Types ============

export type PDCStatus = 'pending' | 'deposited' | 'cleared' | 'bounced' | 'returned';
export type PDCPartyType = 'customer' | 'vendor';

export interface PDC {
  id: string;
  cheque_number: string;
  bank_name: string;
  cheque_date: string;
  amount: number;
  party_type: PDCPartyType;
  party_id: string;
  party_name?: string;
  status: PDCStatus;
  deposited_at?: string;
  cleared_at?: string;
  bounced_at?: string;
  bounce_reason?: string;
  payment_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PDCCreateData {
  cheque_number: string;
  bank_name: string;
  cheque_date: string;
  amount: number;
  party_type: PDCPartyType;
  party_id: string;
}

export interface PDCMaturityItem {
  id: string;
  cheque_number: string;
  party_name: string;
  party_type: PDCPartyType;
  amount: number;
  cheque_date: string;
  days_until_maturity: number;
  status: PDCStatus;
}

export interface CashPositionSummary {
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
}

// ============ CSV Import Types ============

export interface CSVColumnMapping {
  date?: string;
  description?: string;
  debit?: string;
  credit?: string;
  balance?: string;
  cheque_number?: string;
  reference?: string;
}

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

// ============ Bank Accounts ============

export async function fetchBankAccounts(isActive = true): Promise<BankAccount[]> {
  const response = await api.get(`/api/bank-reconciliation/accounts`, {
    params: { is_active: isActive },
  });
  return response.data;
}

export async function createBankAccount(data: {
  name: string;
  account_number: string;
  bank_name: string;
  branch?: string;
  iban?: string;
  currency?: string;
  opening_balance?: number;
  current_balance?: number;
  is_active?: boolean;
}): Promise<BankAccount> {
  const response = await api.post(`/api/bank-reconciliation/accounts`, data);
  return response.data;
}

export async function updateBankAccount(
  id: string,
  data: Partial<{
    name: string;
    account_number: string;
    bank_name: string;
    branch?: string;
    iban?: string;
    currency?: string;
    opening_balance?: number;
    current_balance?: number;
    is_active?: boolean;
  }>
): Promise<BankAccount> {
  const response = await api.put(`/api/bank-reconciliation/accounts/${id}`, data);
  return response.data;
}

// ============ Bank Statement Import ============

/**
 * Parse CSV file client-side to extract headers and preview rows
 */
export function parseCSVFile(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim());
        if (lines.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }

        // Parse headers
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

        // Parse rows
        const rows: Record<string, string>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          rows.push(row);
        }

        resolve({ headers, rows, rowCount: rows.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read CSV file'));
    reader.readAsText(file);
  });
}

/**
 * Auto-detect column mapping from CSV headers
 */
export function autoDetectColumnMapping(headers: string[]): CSVColumnMapping {
  const mapping: CSVColumnMapping = {};
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  // Date detection
  const dateIdx = lowerHeaders.findIndex(
    (h) => h === 'date' || h === 'transaction_date' || h === 'value_date' || h === 'posting_date'
  );
  if (dateIdx >= 0) mapping.date = headers[dateIdx];

  // Description detection
  const descIdx = lowerHeaders.findIndex(
    (h) =>
      h === 'description' ||
      h === 'narration' ||
      h === 'particulars' ||
      h === 'details' ||
      h === 'transaction_description'
  );
  if (descIdx >= 0) mapping.description = headers[descIdx];

  // Debit detection
  const debitIdx = lowerHeaders.findIndex(
    (h) => h === 'debit' || h === 'withdrawal' || h === 'dr' || h === 'amount_dr'
  );
  if (debitIdx >= 0) mapping.debit = headers[debitIdx];

  // Credit detection
  const creditIdx = lowerHeaders.findIndex(
    (h) => h === 'credit' || h === 'deposit' || h === 'cr' || h === 'amount_cr'
  );
  if (creditIdx >= 0) mapping.credit = headers[creditIdx];

  // Balance detection
  const balIdx = lowerHeaders.findIndex(
    (h) => h === 'balance' || h === 'running_balance' || h === 'closing_balance'
  );
  if (balIdx >= 0) mapping.balance = headers[balIdx];

  // Cheque number detection
  const chequeIdx = lowerHeaders.findIndex(
    (h) =>
      h === 'cheque_number' ||
      h === 'cheque_no' ||
      h === 'cheque_no.' ||
      h === 'instrument_no' ||
      h === 'ref_no'
  );
  if (chequeIdx >= 0) mapping.cheque_number = headers[chequeIdx];

  return mapping;
}

export async function importBankStatement(
  bankAccountId: string,
  statementDate: string,
  openingBalance: number,
  closingBalance: number,
  file: File
): Promise<BankStatementImportResponse> {
  const formData = new FormData();
  formData.append('bank_account_id', bankAccountId);
  formData.append('statement_date', statementDate);
  formData.append('opening_balance', openingBalance.toString());
  formData.append('closing_balance', closingBalance.toString());
  formData.append('file', file);

  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');

  const response = await api.post(`/api/bank-reconciliation/import-statement`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

// ============ Reconciliation Sessions ============

export async function fetchReconciliationSessions(
  bankAccountId?: string,
  status?: string
): Promise<ReconciliationSession[]> {
  const params: Record<string, string> = {};
  if (bankAccountId) params.bank_account_id = bankAccountId;
  if (status) params.status = status;

  const response = await api.get(`/api/bank-reconciliation/sessions`, { params });
  return response.data;
}

export async function fetchReconciliationSession(
  sessionId: string
): Promise<ReconciliationSessionDetail> {
  const response = await api.get(`/api/bank-reconciliation/sessions/${sessionId}`);
  return response.data;
}

export async function startReconciliationSession(data: {
  bank_account_id: string;
  period_month: number;
  period_year: number;
  opening_balance: number;
  closing_balance_per_bank: number;
}): Promise<ReconciliationSession> {
  const response = await api.post(`/api/bank-reconciliation/sessions`, data);
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
  const response = await api.post(
    `/api/bank-reconciliation/sessions/${sessionId}/match`,
    data
  );
  return response.data;
}

export async function completeReconciliation(sessionId: string): Promise<{
  id: string;
  status: string;
  completed_at: string;
}> {
  const response = await api.post(
    `/api/bank-reconciliation/sessions/${sessionId}/complete`,
    {}
  );
  return response.data;
}

// ============ Matching Suggestions ============

export async function fetchMatchingSuggestions(
  sessionId?: string,
  bankAccountId?: string
): Promise<MatchingSuggestion> {
  const params: Record<string, string> = {};
  if (sessionId) params.session_id = sessionId;
  if (bankAccountId) params.bank_account_id = bankAccountId;

  const response = await api.get(`/api/bank-reconciliation/matching-suggestions`, { params });
  return response.data;
}

// ============ Reports ============

export async function fetchReconciliationStatement(
  bankAccountId: string,
  fromDate?: string,
  toDate?: string
): Promise<ReconciliationStatement> {
  const params: Record<string, string> = { bank_account_id: bankAccountId };
  if (fromDate) params.from_date = fromDate;
  if (toDate) params.to_date = toDate;

  const response = await api.get(`/api/bank-reconciliation/reports/statement`, { params });
  return response.data;
}

// ============ PDCs ============

export async function fetchPDCs(
  status?: string,
  partyType?: string,
  fromDate?: string,
  toDate?: string
): Promise<PDC[]> {
  const params: Record<string, string> = {};
  if (status && status !== 'all') params.status = status;
  if (partyType && partyType !== 'all') params.party_type = partyType;
  if (fromDate) params.from_date = fromDate;
  if (toDate) params.to_date = toDate;

  const response = await api.get(`/api/bank-reconciliation/pdcs`, { params });
  return response.data;
}

export async function createPDC(data: PDCCreateData): Promise<PDC> {
  const response = await api.post(`/api/bank-reconciliation/pdcs`, data);
  return response.data;
}

export async function updatePDCStatus(
  id: string,
  status: PDCStatus,
  bounceReason?: string
): Promise<PDC> {
  const response = await api.put(`/api/bank-reconciliation/pdcs/${id}/status`, {
    status,
    bounce_reason: bounceReason,
  });
  return response.data;
}

export async function depositPDC(id: string): Promise<PDC> {
  const response = await api.post(`/api/bank-reconciliation/pdcs/${id}/deposit`, {});
  return response.data;
}

export async function fetchPDCMaturityReport(daysAhead = 30): Promise<PDCMaturityItem[]> {
  const response = await api.get(`/api/bank-reconciliation/pdcs/maturity-report`, {
    params: { days_ahead: daysAhead },
  });
  return response.data;
}

// ============ Cash Position ============

export async function fetchCashPosition(): Promise<CashPositionSummary> {
  const response = await api.get(`/api/bank-reconciliation/cash-position`);
  return response.data;
}
