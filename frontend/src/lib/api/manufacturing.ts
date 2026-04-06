/**
 * Manufacturing API Client
 * Handles all API calls for BOM and Production
 */

import api from '@/lib/api';

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
  const params = status ? { status } : {};
  const response = await api.get('/api/manufacturing/bom', { params });
  return response.data;
}

export async function fetchBOM(id: number): Promise<BOM> {
  const response = await api.get(`/api/manufacturing/bom/${id}`);
  return response.data;
}

export async function createBOM(data: CreateBOMData): Promise<BOM> {
  const response = await api.post('/api/manufacturing/bom', data);
  return response.data;
}

export async function activateBOM(id: number): Promise<BOM> {
  const response = await api.post(`/api/manufacturing/bom/${id}/activate`);
  return response.data;
}

export async function fetchProductionOrders(status?: string): Promise<ProductionOrder[]> {
  const params = status ? { status } : {};
  const response = await api.get('/api/manufacturing/orders', { params });
  return response.data;
}

export async function createProductionOrder(data: CreateProductionOrderData): Promise<ProductionOrder> {
  const response = await api.post('/api/manufacturing/orders', data);
  return response.data;
}
