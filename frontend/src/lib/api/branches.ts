/**
 * Branches API Client
 * Handles all API calls for branch management
 */

import api from '@/lib/api';

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
  const params = isActive !== undefined ? { is_active: isActive } : {};
  const response = await api.get('/api/branches', { params });
  return response.data;
}

export async function fetchBranch(id: number): Promise<Branch> {
  const response = await api.get(`/api/branches/${id}`);
  return response.data;
}

export async function createBranch(data: BranchCreateData): Promise<Branch> {
  const response = await api.post('/api/branches', data);
  return response.data;
}

export async function updateBranch(id: number, data: BranchUpdateData): Promise<Branch> {
  const response = await api.put(`/api/branches/${id}`, data);
  return response.data;
}

export async function deleteBranch(id: number): Promise<void> {
  await api.delete(`/api/branches/${id}`);
}
