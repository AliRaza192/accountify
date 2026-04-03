/**
 * Roles & Users API Client
 * Handles all API calls for RBAC, users, roles, audit trail, and login history
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

// ==================== USERS ====================

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  branch_id?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface InviteUserData {
  email: string;
  full_name: string;
  role_id: string;
  branch_id?: string;
}

export async function fetchUsers(): Promise<User[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
}

export async function inviteUser(data: InviteUserData): Promise<User> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/users/invite`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to invite user');
  return response.json();
}

export async function updateUserRole(userId: string, roleId: string): Promise<User> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role_id: roleId }),
  });
  if (!response.ok) throw new Error('Failed to update user role');
  return response.json();
}

export async function deactivateUser(userId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/users/${userId}/deactivate`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to deactivate user');
}

// ==================== ROLES ====================

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions: Record<string, string[]>;
  user_count: number;
  created_at: string;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permissions: Record<string, string[]>;
}

export async function fetchRoles(): Promise<Role[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch roles');
  return response.json();
}

export async function fetchRole(id: string): Promise<Role> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/roles/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch role');
  return response.json();
}

export async function createRole(data: CreateRoleData): Promise<Role> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/roles`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create role');
  return response.json();
}

export async function updateRole(id: string, data: Partial<CreateRoleData>): Promise<Role> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/roles/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update role');
  return response.json();
}

export async function deleteRole(id: string): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/roles/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to delete role');
}

// ==================== PERMISSIONS MATRIX ====================

export interface PermissionModule {
  module: string;
  actions: string[];
}

export async function fetchPermissionModules(): Promise<PermissionModule[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/roles/permissions/modules`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch permission modules');
  return response.json();
}

// ==================== AUDIT TRAIL ====================

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditLogFilters {
  user_id?: string;
  entity_type?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
}

export async function fetchAuditLogs(filters?: AuditLogFilters): Promise<{
  logs: AuditLog[];
  total: number;
}> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const params = new URLSearchParams();
  if (filters?.user_id) params.append('user_id', filters.user_id);
  if (filters?.entity_type) params.append('entity_type', filters.entity_type);
  if (filters?.action) params.append('action', filters.action);
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);

  const queryString = params.toString();
  const response = await fetch(`${API_BASE}/audit-logs?${queryString}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch audit logs');
  return response.json();
}

// ==================== LOGIN HISTORY ====================

export interface LoginHistoryEntry {
  id: string;
  user_id: string;
  user_name: string;
  email: string;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failed';
  failure_reason?: string;
  branch_name?: string;
  created_at: string;
}

export async function fetchLoginHistory(page = 1, limit = 50): Promise<{
  entries: LoginHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(
    `${API_BASE}/audit-logs/login-history?page=${page}&limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error('Failed to fetch login history');
  return response.json();
}
