'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  getFundsFlowStatement,
  exportAdvancedReportToExcel,
  type FundsFlowStatement,
} from '@/lib/api/financial-reports';

export default function FundsFlowPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<FundsFlowStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getFundsFlowStatement(startDate, endDate);
      setReport(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load funds flow statement');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!report) return;
    try {
      const blob = await exportAdvancedReportToExcel('funds-flow', startDate, endDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `funds-flow-${startDate}-${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to export');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateDDMMYYYY = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard/reports" className="text-blue-600 hover:text-blue-800">
          ← Back to Reports
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Funds Flow Statement</h1>
          <p className="text-gray-600 mt-1">Sources and Applications of Funds</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="start-date" className="text-sm text-gray-600">From</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="end-date" className="text-sm text-gray-600">To</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {report && (
            <button
              onClick={handleExport}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
            >
              Export to Excel
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadReport}
            className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Funds Flow Statement</h2>
            <p className="text-gray-600 mt-1">
              {formatDateDDMMYYYY(report.period_start)} — {formatDateDDMMYYYY(report.period_end)}
            </p>
          </div>

          {/* Sources of Funds */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sources of Funds</h2>
            <div className="space-y-2">
              {report.sources.net_profit !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Net Profit</span>
                  <span className="font-semibold">{formatCurrency(report.sources.net_profit)}</span>
                </div>
              )}
              {report.sources.depreciation_amortization !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Depreciation & Amortization</span>
                  <span className="font-semibold">{formatCurrency(report.sources.depreciation_amortization)}</span>
                </div>
              )}
              {report.sources.long_term_borrowings !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Long-term Borrowings</span>
                  <span className="font-semibold">{formatCurrency(report.sources.long_term_borrowings)}</span>
                </div>
              )}
              {report.sources.capital_introduced !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Capital Introduced</span>
                  <span className="font-semibold">{formatCurrency(report.sources.capital_introduced)}</span>
                </div>
              )}
              {report.sources.asset_sales !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Sale of Fixed Assets</span>
                  <span className="font-semibold">{formatCurrency(report.sources.asset_sales)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 bg-green-50 px-4">
                <span className="font-bold text-gray-900">Total Sources of Funds</span>
                <span className="font-bold text-green-600">{formatCurrency(report.total_sources)}</span>
              </div>
            </div>
          </div>

          {/* Applications of Funds */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Applications of Funds</h2>
            <div className="space-y-2">
              {report.applications.capital_expenditure !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Capital Expenditure</span>
                  <span className="font-semibold">{formatCurrency(report.applications.capital_expenditure)}</span>
                </div>
              )}
              {report.applications.dividends_paid !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Dividends Paid</span>
                  <span className="font-semibold">{formatCurrency(report.applications.dividends_paid)}</span>
                </div>
              )}
              {report.applications.tax_paid !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Tax Paid</span>
                  <span className="font-semibold">{formatCurrency(report.applications.tax_paid)}</span>
                </div>
              )}
              {report.applications.loan_repayments !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Repayment of Long-term Borrowings</span>
                  <span className="font-semibold">{formatCurrency(report.applications.loan_repayments)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 bg-blue-50 px-4">
                <span className="font-bold text-gray-900">Total Applications of Funds</span>
                <span className="font-bold text-blue-600">{formatCurrency(report.total_applications)}</span>
              </div>
            </div>
          </div>

          {/* Net Change in Working Capital */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Net Change in Working Capital</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Change in Current Assets</span>
                <span className="font-semibold">{formatCurrency(report.working_capital.change_in_current_assets)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Change in Current Liabilities</span>
                <span className="font-semibold">{formatCurrency(report.working_capital.change_in_current_liabilities)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 bg-purple-50 px-4">
                <span className="font-bold text-gray-900">Net Change in Working Capital</span>
                <span className="font-bold text-purple-600">{formatCurrency(report.working_capital.net_change)}</span>
              </div>
            </div>
          </div>

          {/* Reconciliation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Reconciliation</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Total Sources</span>
                <span className="font-semibold">{formatCurrency(report.total_sources)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Less: Total Applications</span>
                <span className="font-semibold">{formatCurrency(report.total_applications)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 bg-green-50 px-4">
                <span className="font-bold text-gray-900">Net Funds Flow</span>
                <span className="font-bold text-green-600">{formatCurrency(report.net_funds_flow)}</span>
              </div>
              <div className="mt-4">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${report.balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {report.balanced ? '✓ Balanced' : '✗ Not Balanced'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
