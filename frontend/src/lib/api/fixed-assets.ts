/**
 * Fixed Assets API Client
 * Handles all API calls to the Fixed Assets backend
 */

import axios from 'axios';
import { supabase } from '@/lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface FixedAsset {
  id: string;
  asset_code: string;
  name: string;
  category_id: string;
  category?: { name: string };
  purchase_date: string;
  purchase_cost: number;
  useful_life_months: number;
  residual_value_percent: number;
  depreciation_method: 'SLM' | 'WDV';
  location?: string;
  status: 'active' | 'disposed' | 'sold' | 'fully_depreciated';
  photo_url?: string;
  document_urls: string[];
  residual_value?: number;
  depreciable_amount?: number;
  book_value?: number;
  created_at: string;
}

interface AssetCategory {
  id: string;
  name: string;
  depreciation_rate_percent: number;
  depreciation_method: 'SLM' | 'WDV';
  account_code: string;
  is_active: boolean;
}

export async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

export async function fetchFixedAssets(
  status?: string,
  categoryId?: string
): Promise<FixedAsset[]> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (categoryId) params.append('category_id', categoryId);

  const response = await axios.get(
    `${API_BASE}/fixed-assets?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

export async function fetchFixedAsset(id: string): Promise<FixedAsset> {
  const token = await getAuthToken();
  const response = await axios.get(`${API_BASE}/fixed-assets/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createFixedAsset(
  data: Partial<FixedAsset>
): Promise<FixedAsset> {
  const token = await getAuthToken();
  const response = await axios.post(`${API_BASE}/fixed-assets`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateFixedAsset(
  id: string,
  data: Partial<FixedAsset>
): Promise<FixedAsset> {
  const token = await getAuthToken();
  const response = await axios.put(`${API_BASE}/fixed-assets/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function deleteFixedAsset(id: string): Promise<void> {
  const token = await getAuthToken();
  await axios.delete(`${API_BASE}/fixed-assets/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchAssetCategories(
  includeInactive = false
): Promise<AssetCategory[]> {
  const token = await getAuthToken();
  const response = await axios.get(
    `${API_BASE}/fixed-assets/asset-categories?include_inactive=${includeInactive}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

export async function runDepreciation(
  periodMonth: number,
  periodYear: number
): Promise<{
  assets_depreciated: number;
  total_depreciation: number;
  journal_entries_created: number;
}> {
  const token = await getAuthToken();
  const response = await axios.post(
    `${API_BASE}/fixed-assets/run-depreciation`,
    {
      period_month: periodMonth,
      period_year: periodYear,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

export async function disposeAsset(
  id: string,
  disposalData: {
    disposal_date: string;
    sale_proceeds: number;
    disposal_reason: string;
  }
): Promise<{
  asset_id: string;
  gain_or_loss: number;
  journal_entry_id: string;
}> {
  const token = await getAuthToken();
  const response = await axios.post(
    `${API_BASE}/fixed-assets/${id}/disposal`,
    disposalData,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

export async function logMaintenance(
  assetId: string,
  data: {
    service_date: string;
    service_type: string;
    service_provider?: string;
    cost: number;
    next_service_due?: string;
    notes?: string;
  }
): Promise<void> {
  const token = await getAuthToken();
  await axios.post(`${API_BASE}/fixed-assets/${assetId}/maintenance`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchFixedAssetRegister(
  asOfDate?: string
): Promise<FixedAsset[]> {
  const token = await getAuthToken();
  const params = asOfDate ? `?as_of_date=${asOfDate}` : '';
  const response = await axios.get(
    `${API_BASE}/fixed-assets/reports/register${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}
