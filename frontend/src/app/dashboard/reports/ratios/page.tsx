'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function FinancialRatiosPage() {
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [ratios, setRatios] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE}/reports/advanced/ratios`, {
        params: { fiscal_year: fiscalYear },
        headers: { Authorization: `Bearer ${token}` },
      });
      setRatios(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard/reports" className="text-blue-600 hover:text-blue-800">
          ← Back to Reports
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Ratio Analysis</h1>
          <p className="text-gray-600 mt-1">Liquidity, Profitability, Efficiency & Solvency</p>
        </div>
        <div className="flex gap-4">
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={loadReport}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Calculating...' : 'Calculate Ratios'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Calculating ratios...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {ratios && (
        <div className="space-y-6">
          {/* Liquidity Ratios */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Liquidity Ratios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded p-4">
                <div className="text-sm text-blue-600">Current Ratio</div>
                <div className="text-3xl font-bold text-blue-900">{ratios.liquidity_ratios.current_ratio}</div>
                <div className="text-sm text-blue-700 mt-2">
                  Status: <span className="font-semibold">{ratios.liquidity_ratios.interpretation.current}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">Target: ≥ 1.5</div>
              </div>
              <div className="bg-green-50 rounded p-4">
                <div className="text-sm text-green-600">Quick Ratio</div>
                <div className="text-3xl font-bold text-green-900">{ratios.liquidity_ratios.quick_ratio}</div>
                <div className="text-sm text-green-700 mt-2">
                  Status: <span className="font-semibold">{ratios.liquidity_ratios.interpretation.quick}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">Target: ≥ 1.0</div>
              </div>
            </div>
          </div>

          {/* Profitability Ratios */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profitability Ratios</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded p-4">
                <div className="text-sm text-gray-600">Gross Margin</div>
                <div className="text-2xl font-bold text-gray-900">{ratios.profitability_ratios.gross_margin_pct}%</div>
              </div>
              <div className="bg-gray-50 rounded p-4">
                <div className="text-sm text-gray-600">Net Margin</div>
                <div className="text-2xl font-bold text-gray-900">{ratios.profitability_ratios.net_margin_pct}%</div>
              </div>
              <div className="bg-gray-50 rounded p-4">
                <div className="text-sm text-gray-600">ROA</div>
                <div className="text-2xl font-bold text-gray-900">{ratios.profitability_ratios.roa_pct}%</div>
              </div>
              <div className="bg-gray-50 rounded p-4">
                <div className="text-sm text-gray-600">ROE</div>
                <div className="text-2xl font-bold text-gray-900">{ratios.profitability_ratios.roe_pct}%</div>
              </div>
            </div>
          </div>

          {/* Efficiency & Solvency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Efficiency Ratios</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Inventory Turnover</span>
                  <span className="font-semibold">{ratios.efficiency_ratios.inventory_turnover}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Days Sales Outstanding</span>
                  <span className="font-semibold">{ratios.efficiency_ratios.days_sales_outstanding} days</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Solvency Ratios</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Debt-to-Equity</span>
                  <span className="font-semibold">{ratios.solvency_ratios.debt_to_equity}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Status: <span className="font-semibold">{ratios.solvency_ratios.interpretation}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Radar Chart for Ratios */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Health Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="80%"
                data={[
                  { subject: 'Liquidity', A: Math.min(ratios.liquidity_ratios.current_ratio / 2 * 100, 100) },
                  { subject: 'Profitability', A: Math.min(ratios.profitability_ratios.net_margin_pct, 100) },
                  { subject: 'Efficiency', A: Math.min(ratios.efficiency_ratios.inventory_turnover * 10, 100) },
                  { subject: 'ROA', A: Math.min(ratios.profitability_ratios.roa_pct * 5, 100) },
                  { subject: 'ROE', A: Math.min(ratios.profitability_ratios.roe_pct * 3, 100) },
                ]}
              >
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Score" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Metrics Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded p-4">
                <div className="text-sm text-gray-600">Revenue</div>
                <div className="text-xl font-bold text-gray-900">
                  PKR {(ratios.summary.revenue / 1000).toFixed(0)}k
                </div>
              </div>
              <div className="bg-gray-50 rounded p-4">
                <div className="text-sm text-gray-600">Net Income</div>
                <div className="text-xl font-bold text-gray-900">
                  PKR {(ratios.summary.net_income / 1000).toFixed(0)}k
                </div>
              </div>
              <div className="bg-gray-50 rounded p-4">
                <div className="text-sm text-gray-600">Total Assets</div>
                <div className="text-xl font-bold text-gray-900">
                  PKR {(ratios.summary.total_assets / 1000).toFixed(0)}k
                </div>
              </div>
              <div className="bg-gray-50 rounded p-4">
                <div className="text-sm text-gray-600">Total Equity</div>
                <div className="text-xl font-bold text-gray-900">
                  PKR {(ratios.summary.total_equity / 1000).toFixed(0)}k
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
