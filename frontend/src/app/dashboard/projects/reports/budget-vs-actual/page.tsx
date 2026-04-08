'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchBudgetVsActual, fetchProject } from '@/lib/api/projects';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BudgetVsActualPage() {
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
        fetchBudgetVsActual(projectId),
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/dashboard/projects/${projectId}`} className="text-blue-600 hover:text-blue-800">
          ← Back to Project
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Budget vs Actual</h1>
        {project && <p className="text-gray-600 mt-1">{project.project_name} ({project.project_code})</p>}
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600">Total Budget</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(report.budget_total)}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600">Actual Spent</div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(report.actual_total)}</div>
            </div>
            <div className={`rounded-lg shadow p-6 ${report.variance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-sm text-gray-600">Variance</div>
              <div className={`text-2xl font-bold ${report.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(report.variance)}
              </div>
            </div>
            <div className={`rounded-lg shadow p-6 ${report.variance_pct >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-sm text-gray-600">Variance %</div>
              <div className={`text-2xl font-bold ${report.variance_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {report.variance_pct.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Budget vs Actual Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget vs Actual Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { name: 'Project', Budget: report.budget_total, Actual: report.actual_total }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `PKR ${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Budget" fill="#3B82F6" />
                <Bar dataKey="Actual" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Phase Breakdown */}
          {report.phase_breakdown && report.phase_breakdown.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Phase-wise Breakdown</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phase</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance %</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.phase_breakdown.map((phase: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {phase.phase_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(phase.budget_allocated)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(phase.actual_costs)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${phase.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(phase.variance)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${phase.variance_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {phase.variance_pct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Alert */}
          {report.variance < 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="text-yellow-600 text-xl mr-3">⚠️</div>
                <div>
                  <h4 className="font-semibold text-yellow-900">Budget Overrun Detected</h4>
                  <p className="text-yellow-700 text-sm mt-1">
                    Project has exceeded budget by {formatCurrency(Math.abs(report.variance))} ({Math.abs(report.variance_pct).toFixed(2)}%).
                    Review costs and consider budget revision.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
