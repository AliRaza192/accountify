/**
 * Branches API Client
 * Handles all API calls for branch management
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

export interface Branch {
  id: number;
  company_id: number;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface BranchCreateData {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  is_default?: boolean;
}

export interface BranchUpdateData {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export async function fetchBranches(isActive?: boolean): Promise<Branch[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const params = isActive !== undefined ? `?is_active=${isActive}` : '';
  const response = await fetch(`${API_BASE}/branches${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch branches');
  return response.json();
}

export async function fetchBranch(id: number): Promise<Branch> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/branches/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch branch');
  return response.json();
}

export async function createBranch(data: BranchCreateData): Promise<Branch> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/branches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create branch');
  return response.json();
}

export async function updateBranch(id: number, data: BranchUpdateData): Promise<Branch> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/branches/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update branch');
  return response.json();
}

export async function deleteBranch(id: number): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/branches/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to delete branch');
}
