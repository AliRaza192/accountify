/**
 * Manufacturing API Client
 * Handles all API calls for BOM and Production
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

export interface BOM {
  id: number;
  product_id: number;
  product_name?: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  effective_date?: string;
  expiry_date?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  lines?: BOMLine[];
}

export interface BOMLine {
  id: number;
  bom_id: number;
  component_id: number;
  component_name?: string;
  component_code?: string;
  quantity: number;
  unit: string;
  waste_percent: number;
  sequence: number;
}

export interface ProductionOrder {
  id: number;
  bom_id: number;
  bom_name?: string;
  quantity: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  cost_center_id?: number;
  start_date?: string;
  end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  actual_hours?: number;
  labor_rate?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface CreateBOMData {
  product_id: number;
  version: number;
  effective_date?: string;
  notes?: string;
  lines: {
    component_id: number;
    quantity: number;
    unit: string;
    waste_percent?: number;
    sequence?: number;
  }[];
}

export interface CreateProductionOrderData {
  bom_id: number;
  quantity: number;
  cost_center_id?: number;
  start_date?: string;
  end_date?: string;
  labor_rate?: number;
  notes?: string;
}

export async function fetchBOMs(status?: string): Promise<BOM[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const params = status ? `?status=${status}` : '';
  const response = await fetch(`${API_BASE}/manufacturing/bom${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch BOMs');
  return response.json();
}

export async function fetchBOM(id: number): Promise<BOM> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/manufacturing/bom/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch BOM');
  return response.json();
}

export async function createBOM(data: CreateBOMData): Promise<BOM> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/manufacturing/bom`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create BOM');
  return response.json();
}

export async function activateBOM(id: number): Promise<BOM> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/manufacturing/bom/${id}/activate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to activate BOM');
  return response.json();
}

export async function fetchProductionOrders(status?: string): Promise<ProductionOrder[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const params = status ? `?status=${status}` : '';
  const response = await fetch(`${API_BASE}/manufacturing/orders${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch production orders');
  return response.json();
}

export async function createProductionOrder(data: CreateProductionOrderData): Promise<ProductionOrder> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE}/manufacturing/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create production order');
  return response.json();
}
