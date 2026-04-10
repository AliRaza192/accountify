'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  getStatementOfEquity,
  exportAdvancedReportToExcel,
  type StatementOfEquity,
} from '@/lib/api/financial-reports';

export default function EquityPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<StatementOfEquity | null>(null);
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
      const data = await getStatementOfEquity(startDate, endDate);
      setReport(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load statement of equity');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!report) return;
    try {
      const blob = await exportAdvancedReportToExcel('equity', startDate, endDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statement-of-equity-${startDate}-${endDate}.xlsx`;
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
          <h1 className="text-3xl font-bold text-gray-900">Statement of Changes in Equity</h1>
          <p className="text-gray-600 mt-1">IAS 1 Compliant</p>
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
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <th key={i} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5].map((j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <h2 className="text-2xl font-bold text-gray-900">Statement of Changes in Equity</h2>
            <p className="text-gray-600 mt-1">
              For the period {formatDateDDMMYYYY(report.period_start)} — {formatDateDDMMYYYY(report.period_end)}
            </p>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Particulars</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Share Capital</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Reserves</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Retained Earnings</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Total Equity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Opening Balance */}
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">Opening Balance</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(report.opening_balance.share_capital)}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(report.opening_balance.reserves)}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(report.opening_balance.retained_earnings)}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold">{formatCurrency(report.opening_balance.total)}</td>
                  </tr>

                  {/* Changes rows */}
                  {report.changes.map((change, idx) => {
                    // Determine row label based on which fields are non-zero
                    const hasNetProfit = change.net_profit !== 0;
                    const hasDividends = change.dividends !== 0;
                    const hasAdditionalCapital = change.additional_capital !== 0;
                    const hasTransfers = change.transfers_to_reserves !== 0;
                    const hasOCI = change.other_comprehensive_income !== 0;

                    // Skip entirely zero rows
                    if (!hasNetProfit && !hasDividends && !hasAdditionalCapital && !hasTransfers && !hasOCI) {
                      return null;
                    }

                    // Determine label: prefer most descriptive
                    let label = 'Changes in Equity';
                    if (hasNetProfit && !hasDividends && !hasAdditionalCapital && !hasTransfers && !hasOCI) {
                      label = 'Add: Net Profit for the Period';
                    } else if (hasDividends && !hasNetProfit && !hasAdditionalCapital && !hasTransfers && !hasOCI) {
                      label = 'Less: Dividends Paid';
                    } else if (hasAdditionalCapital && !hasNetProfit && !hasDividends && !hasTransfers && !hasOCI) {
                      label = 'Add: Additional Capital Introduced';
                    } else if (hasTransfers && !hasNetProfit && !hasDividends && !hasAdditionalCapital && !hasOCI) {
                      label = 'Transfers to Reserves';
                    } else if (hasOCI && !hasNetProfit && !hasDividends && !hasAdditionalCapital && !hasTransfers) {
                      label = 'Other Comprehensive Income';
                    }

                    const isNegative = change.total < 0;

                    return (
                      <tr key={idx}>
                        <td className="px-6 py-4 text-sm text-gray-700">{label}</td>
                        <td className={`px-6 py-4 text-sm text-right ${isNegative ? 'text-red-600' : 'text-gray-700'}`}>
                          {change.additional_capital !== 0 ? formatCurrency(change.additional_capital) : '—'}
                        </td>
                        <td className={`px-6 py-4 text-sm text-right ${isNegative ? 'text-red-600' : 'text-gray-700'}`}>
                          {change.transfers_to_reserves !== 0
                            ? formatCurrency(change.transfers_to_reserves)
                            : change.other_comprehensive_income !== 0
                              ? formatCurrency(change.other_comprehensive_income)
                              : '—'}
                        </td>
                        <td className={`px-6 py-4 text-sm text-right ${isNegative ? 'text-red-600' : 'text-gray-700'}`}>
                          {change.net_profit !== 0
                            ? formatCurrency(change.net_profit)
                            : change.dividends !== 0
                              ? formatCurrency(change.dividends)
                              : change.transfers_to_reserves !== 0
                                ? formatCurrency(change.transfers_to_reserves)
                                : '—'}
                        </td>
                        <td className={`px-6 py-4 text-sm text-right font-semibold ${isNegative ? 'text-red-600' : 'text-gray-700'}`}>
                          {formatCurrency(change.total)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Closing Balance */}
                  <tr className="bg-green-50">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">Closing Balance</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-green-600">{formatCurrency(report.closing_balance.share_capital)}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-green-600">{formatCurrency(report.closing_balance.reserves)}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-green-600">{formatCurrency(report.closing_balance.retained_earnings)}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-green-600">{formatCurrency(report.closing_balance.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Validation Badge */}
          <div className="flex justify-end">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${report.balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {report.balanced ? '✓ Balanced' : '✗ Not Balanced'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
