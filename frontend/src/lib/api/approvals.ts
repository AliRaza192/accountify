/**
 * Approvals API Client
 * Handles all API calls for approval workflows
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

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
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const params = status ? `?status=${status}` : '';
  const response = await fetch(`${API_BASE}/approvals/requests${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch approval requests');
  return response.json();
}

export async function fetchApprovalRequest(id: number): Promise<{
  request: ApprovalRequest;
  actions: ApprovalAction[];
}> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/approvals/requests/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch approval request');
  return response.json();
}

export async function approveRequest(
  id: number,
  data: { comments?: string; delegate_to?: string }
): Promise<ApprovalRequest> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/approvals/requests/${id}/approve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to approve request');
  return response.json();
}

export async function rejectRequest(
  id: number,
  data: { comments: string }
): Promise<ApprovalRequest> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/approvals/requests/${id}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to reject request');
  return response.json();
}
