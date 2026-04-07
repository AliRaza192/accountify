/**
 * Email API Client
 * Handles all email-related API calls to the backend
 * - Send invoice emails
 * - Send payment reminders
 * - Send salary slips
 * - Send account statements
 * - Fetch email delivery logs
 */

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

const authHeader = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ====================================================================
// Types
// ====================================================================

export interface EmailResponse {
  success: boolean;
  email_id: string | null;
  message: string;
  recipient_count: number;
  errors: string[];
}

export interface EmailLogEntry {
  id: string;
  email_type: string;
  recipient: string;
  subject: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  reference_id: string | null;
  attachments_count: number;
  attempts: number;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
}

export interface EmailLogsResponse {
  success: boolean;
  logs: EmailLogEntry[];
  total: number;
  message: string;
}

export interface BulkEmailResult {
  email_id: string | null;
  success: boolean;
  message: string;
}

export interface BulkEmailResponse {
  results: BulkEmailResult[];
  total_sent: number;
  total_failed: number;
}

// ====================================================================
// Invoice Email
// ====================================================================

export interface SendInvoiceEmailRequest {
  invoice_id: string;
  customer_email: string;
  customer_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal?: number;
  tax_total?: number;
  discount?: number;
  total?: number;
  balance_due?: number;
  items?: Array<{
    description?: string;
    quantity?: number;
    rate?: number;
    amount?: number;
  }>;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_ntn?: string;
  notes?: string;
}

/**
 * Send an invoice email to a customer.
 */
export async function sendInvoiceEmail(
  data: SendInvoiceEmailRequest
): Promise<EmailResponse> {
  const response = await axios.post(
    `${API_BASE}/email/send-invoice`,
    data,
    { headers: authHeader() }
  );
  return response.data;
}

// ====================================================================
// Payment Reminder
// ====================================================================

export type ReminderType = '3_days_before' | 'on_due_date' | 'overdue';

export interface SendPaymentReminderRequest {
  customer_email: string;
  customer_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  balance_due: number;
  reminder_type?: ReminderType;
  company_name?: string;
  company_phone?: string;
  company_address?: string;
}

/**
 * Send a payment reminder email.
 * reminder_type: '3_days_before', 'on_due_date', or 'overdue'.
 */
export async function sendPaymentReminder(
  data: SendPaymentReminderRequest
): Promise<EmailResponse> {
  const response = await axios.post(
    `${API_BASE}/email/send-reminder`,
    data,
    { headers: authHeader() }
  );
  return response.data;
}

// ====================================================================
// Salary Slip
// ====================================================================

export interface SendSalarySlipRequest {
  employee_email: string;
  employee_name: string;
  employee_code: string;
  month: string;
  year: number;
  gross_salary: number;
  deductions?: number;
  net_salary: number;
  company_name?: string;
  hr_phone?: string;
}

/**
 * Send a salary slip email to an employee.
 */
export async function sendSalarySlip(
  data: SendSalarySlipRequest
): Promise<EmailResponse> {
  const response = await axios.post(
    `${API_BASE}/email/send-salary-slip`,
    data,
    { headers: authHeader() }
  );
  return response.data;
}

// ====================================================================
// Account Statement
// ====================================================================

export interface SendAccountStatementRequest {
  customer_email: string;
  customer_name: string;
  period_start: string;
  period_end: string;
  opening_balance?: number;
  total_debits?: number;
  total_credits?: number;
  closing_balance?: number;
  transactions?: Array<{
    date?: string;
    description?: string;
    ref_number?: string;
    debit?: string;
    credit?: string;
  }>;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_ntn?: string;
}

/**
 * Send a monthly account statement to a customer.
 */
export async function sendAccountStatement(
  data: SendAccountStatementRequest
): Promise<EmailResponse> {
  const response = await axios.post(
    `${API_BASE}/email/send-statement`,
    data,
    { headers: authHeader() }
  );
  return response.data;
}

// ====================================================================
// Bulk Email
// ====================================================================

export interface BulkEmailRecipient {
  email: string;
  reference_id?: string;
  customer_name?: string;
  invoice_number?: string;
  due_date?: string;
  balance_due?: number;
}

export interface BulkEmailRequest {
  recipients: BulkEmailRecipient[];
  subject_template?: string;
  html_template_name?: string;
  context_base?: Record<string, any>;
  email_type?: string;
}

/**
 * Send bulk emails to multiple recipients with personalized templates.
 */
export async function sendBulkEmails(
  data: BulkEmailRequest
): Promise<BulkEmailResponse> {
  const response = await axios.post(
    `${API_BASE}/email/send-bulk`,
    data,
    { headers: authHeader() }
  );
  return response.data;
}

// ====================================================================
// Email Logs
// ====================================================================

export interface FetchEmailLogsParams {
  limit?: number;
  offset?: number;
  email_type?: string;
  status_filter?: string;
  company_id?: string;
}

/**
 * Fetch email delivery logs with optional filters.
 */
export async function fetchEmailLogs(
  params: FetchEmailLogsParams = {}
): Promise<EmailLogsResponse> {
  const {
    limit = 50,
    offset = 0,
    email_type,
    status_filter,
    company_id,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.append('limit', String(limit));
  queryParams.append('offset', String(offset));
  if (email_type) queryParams.append('email_type', email_type);
  if (status_filter) queryParams.append('status_filter', status_filter);
  if (company_id) queryParams.append('company_id', company_id);

  const response = await axios.get(
    `${API_BASE}/email/logs?${queryParams.toString()}`,
    { headers: authHeader() }
  );
  return response.data;
}

/**
 * Fetch a single email log entry by ID.
 */
export async function fetchEmailLog(emailId: string): Promise<EmailLogEntry> {
  const response = await axios.get(
    `${API_BASE}/email/logs/${emailId}`,
    { headers: authHeader() }
  );
  return response.data;
}
