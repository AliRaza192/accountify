/**
 * Approvals API Client
 * Handles all API calls for approval workflows
 */

import api from '@/lib/api';

export interface ApprovalRequest {
  id: number;
  document_type: string;
  document_id: number;
  document_title?: string;
  document_amount?: number;
  status: 'pending' | 'approved' | 'rejected';
  current_level: number;
  requested_by: string;
  requested_by_name?: string;
  requested_at: string;
  completed_at?: string;
  completed_by?: string;
  comments?: string;
}

export interface ApprovalAction {
  id: number;
  level: number;
  action: 'approved' | 'rejected' | 'delegated';
  actioned_by: string;
  actioned_by_name?: string;
  comments?: string;
  actioned_at: string;
  delegated_to?: string;
}

export async function fetchApprovalRequests(status?: string): Promise<ApprovalRequest[]> {
  const params = status ? { status } : {};
  const response = await api.get('/api/approvals/requests', { params });
  return response.data;
}

export async function fetchApprovalRequest(id: number): Promise<{
  request: ApprovalRequest;
  actions: ApprovalAction[];
}> {
  const response = await api.get(`/api/approvals/requests/${id}`);
  return response.data;
}

export async function approveRequest(
  id: number,
  data: { comments?: string; delegate_to?: string }
): Promise<ApprovalRequest> {
  const response = await api.post(`/api/approvals/requests/${id}/approve`, data);
  return response.data;
}

export async function rejectRequest(
  id: number,
  data: { comments: string }
): Promise<ApprovalRequest> {
  const response = await api.post(`/api/approvals/requests/${id}/reject`, data);
  return response.data;
}
