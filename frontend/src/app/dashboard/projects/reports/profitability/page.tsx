'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchProjectProfitability, fetchProject } from '@/lib/api/projects';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ProfitabilityReportPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [report, setReport] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [projectId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reportData, projectData] = await Promise.all([
        fetchProjectProfitability(projectId),
        fetchProject(projectId),
      ]);
      setReport(reportData);
      setProject(projectData);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/dashboard/projects/${projectId}`} className="text-blue-600 hover:text-blue-800">
          ← Back to Project
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Profitability Report</h1>
        {project && <p className="text-gray-600 mt-1">{project.project_name} ({project.project_code})</p>}
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating report...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600">Budget</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(report.budget)}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600">Total Revenue</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(report.total_revenue)}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600">Total Costs</div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(report.total_costs)}</div>
            </div>
            <div className={`rounded-lg shadow p-6 ${report.gross_profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-sm text-gray-600">Profit Margin</div>
              <div className={`text-2xl font-bold ${report.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {report.profit_margin_pct.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cost Category Breakdown Pie Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={report.cost_category_breakdown}
                    dataKey="total_amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {report.cost_category_breakdown.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue vs Costs Bar Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Costs</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Amount', Revenue: report.total_revenue, Costs: report.total_costs }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `PKR ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#10B981" />
                  <Bar dataKey="Costs" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost Category Breakdown Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Category Breakdown</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% of Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.cost_category_breakdown.map((cat: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cat.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(cat.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cat.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.total_costs > 0 ? ((cat.total_amount / report.total_costs) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Revenue:</span>
                <span className="font-semibold text-green-600">{formatCurrency(report.total_revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Costs:</span>
                <span className="font-semibold text-red-600">- {formatCurrency(report.total_costs)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-900 font-semibold">Gross Profit:</span>
                <span className={`font-bold text-xl ${report.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.gross_profit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Profit Margin:</span>
                <span className="font-semibold">{report.profit_margin_pct.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
