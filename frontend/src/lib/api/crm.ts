/**
 * CRM API Client
 * Handles all API calls to the CRM backend
 */

import axios from 'axios';
import { supabase } from '@/lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface Lead {
  id: string;
  lead_code: string;
  name: string;
  contact_phone?: string;
  contact_email?: string;
  source: string;
  requirement?: string;
  estimated_value?: number;
  probability_percent: number;
  stage: string;
  assigned_to?: string;
  follow_up_date?: string;
  ai_score?: number;
}

interface Ticket {
  id: string;
  ticket_number: string;
  customer_id: string;
  issue_category: string;
  priority: string;
  assigned_to?: string;
  status: string;
  description: string;
  resolution_notes?: string;
  satisfaction_rating?: number;
  resolved_at?: string;
}

export async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

// ============ Leads ============

export async function fetchLeads(
  stage?: string,
  source?: string,
  assignedTo?: string
): Promise<Lead[]> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (stage) params.append('stage', stage);
  if (source) params.append('source', source);
  if (assignedTo) params.append('assigned_to', assignedTo);
  
  const response = await axios.get(`${API_BASE}/crm/leads?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createLead(data: Partial<Lead>): Promise<Lead> {
  const token = await getAuthToken();
  const response = await axios.post(`${API_BASE}/crm/leads`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function fetchLead(id: string): Promise<Lead> {
  const token = await getAuthToken();
  const response = await axios.get(`${API_BASE}/crm/leads/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
  const token = await getAuthToken();
  const response = await axios.put(`${API_BASE}/crm/leads/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateLeadStage(id: string, stage: string): Promise<Lead> {
  const token = await getAuthToken();
  const response = await axios.put(`${API_BASE}/crm/leads/${id}/stage`, { stage }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function convertLeadToCustomer(id: string): Promise<{
  lead_id: string;
  customer_id: string;
  customer_name: string;
}> {
  const token = await getAuthToken();
  const response = await axios.post(`${API_BASE}/crm/leads/${id}/convert`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function fetchPipelineSummary(): Promise<Array<{
  stage: string;
  count: number;
  total_value: number;
  weighted_value: number;
}>> {
  const token = await getAuthToken();
  const response = await axios.get(`${API_BASE}/crm/leads/pipeline`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ Tickets ============

export async function fetchTickets(
  status?: string,
  priority?: string,
  customerId?: string
): Promise<Ticket[]> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (priority) params.append('priority', priority);
  if (customerId) params.append('customer_id', customerId);
  
  const response = await axios.get(`${API_BASE}/crm/tickets?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createTicket(data: Partial<Ticket>): Promise<Ticket> {
  const token = await getAuthToken();
  const response = await axios.post(`${API_BASE}/crm/tickets`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function fetchTicket(id: string): Promise<Ticket> {
  const token = await getAuthToken();
  const response = await axios.get(`${API_BASE}/crm/tickets/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateTicket(id: string, data: Partial<Ticket>): Promise<Ticket> {
  const token = await getAuthToken();
  const response = await axios.put(`${API_BASE}/crm/tickets/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function resolveTicket(
  id: string,
  resolutionNotes: string,
  satisfactionRating?: number
): Promise<Ticket> {
  const token = await getAuthToken();
  const response = await axios.put(`${API_BASE}/crm/tickets/${id}/resolve`, {
    resolution_notes: resolutionNotes,
    satisfaction_rating: satisfactionRating,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ Loyalty Program ============

export async function fetchLoyaltyProgram(): Promise<{
  id: string;
  program_name: string;
  points_per_rupee: number;
  redemption_rate: number;
  tier_benefits_json?: any;
  is_active: boolean;
}> {
  const token = await getAuthToken();
  const response = await axios.get(`${API_BASE}/crm/loyalty/program`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateLoyaltyProgram(data: {
  program_name?: string;
  points_per_rupee?: number;
  redemption_rate?: number;
  tier_benefits_json?: any;
  is_active?: boolean;
}): Promise<{
  id: string;
  program_name: string;
  points_per_rupee: number;
  redemption_rate: number;
}> {
  const token = await getAuthToken();
  const response = await axios.put(`${API_BASE}/crm/loyalty/program`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function fetchCustomerPoints(customerId: string): Promise<Array<{
  id: string;
  customer_id: string;
  points: number;
  transaction_type: string;
  description?: string;
  created_at: string;
}>> {
  const token = await getAuthToken();
  const response = await axios.get(`${API_BASE}/crm/loyalty/points/${customerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function earnPoints(
  customerId: string,
  amountSpent: number,
  referenceId?: string,
  description?: string
): Promise<{
  id: string;
  points: number;
  transaction_type: string;
}> {
  const token = await getAuthToken();
  const response = await axios.post(`${API_BASE}/crm/loyalty/points/earn`, {
    customer_id: customerId,
    amount_spent: amountSpent,
    reference_id: referenceId,
    description,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function redeemPoints(
  customerId: string,
  pointsToRedeem: number,
  referenceId?: string,
  description?: string
): Promise<{
  id: string;
  points: number;
  transaction_type: string;
}> {
  const token = await getAuthToken();
  const response = await axios.post(`${API_BASE}/crm/loyalty/points/redeem`, {
    customer_id: customerId,
    points_to_redeem: pointsToRedeem,
    reference_id: referenceId,
    description,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ CRM Dashboard ============

export async function fetchCRMDashboard(): Promise<{
  total_leads: number;
  leads_by_stage: Record<string, number>;
  pipeline_value: number;
  weighted_pipeline_value: number;
  open_tickets: number;
  critical_tickets: number;
  conversion_rate: number;
  top_customers: any[];
}> {
  const token = await getAuthToken();
  const response = await axios.get(`${API_BASE}/crm/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}
