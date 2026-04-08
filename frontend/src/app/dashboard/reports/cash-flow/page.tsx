'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function CashFlowPage() {
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE}/reports/advanced/cash-flow`, {
        params: { fiscal_year: fiscalYear },
        headers: { Authorization: `Bearer ${token}` },
      });
      setReport(response.data);
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
        <Link href="/dashboard/reports" className="text-blue-600 hover:text-blue-800">
          ← Back to Reports
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cash Flow Statement</h1>
          <p className="text-gray-600 mt-1">Indirect Method - IAS 7 Compliant</p>
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
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating cash flow statement...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Operating Activities */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Cash Flow from Operating Activities</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Net Income</span>
                <span className="font-semibold">{formatCurrency(report.operating_activities.net_income)}</span>
              </div>
              <div className="flex justify-between pl-8">
                <span className="text-gray-600">Add: Depreciation & Amortization</span>
                <span className="font-semibold">{formatCurrency(report.operating_activities.adjustments.depreciation_amortization)}</span>
              </div>
              <div className="flex justify-between pl-8">
                <span className="text-gray-600">Change in Accounts Receivable</span>
                <span className="font-semibold">{formatCurrency(report.operating_activities.adjustments.changes_in_working_capital.accounts_receivable)}</span>
              </div>
              <div className="flex justify-between pl-8">
                <span className="text-gray-600">Change in Inventory</span>
                <span className="font-semibold">{formatCurrency(report.operating_activities.adjustments.changes_in_working_capital.inventory)}</span>
              </div>
              <div className="flex justify-between pl-8">
                <span className="text-gray-600">Change in Accounts Payable</span>
                <span className="font-semibold">{formatCurrency(report.operating_activities.adjustments.changes_in_working_capital.accounts_payable)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 bg-green-50 px-4">
                <span className="font-bold text-gray-900">Net Cash from Operating Activities</span>
                <span className="font-bold text-green-600">{formatCurrency(report.operating_cash_flow)}</span>
              </div>
            </div>
          </div>

          {/* Investing Activities */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Cash Flow from Investing Activities</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Capital Expenditures</span>
                <span className="font-semibold">{formatCurrency(report.investing_activities.capital_expenditures)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Asset Sales</span>
                <span className="font-semibold">{formatCurrency(report.investing_activities.asset_sales)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 bg-blue-50 px-4">
                <span className="font-bold text-gray-900">Net Cash from Investing Activities</span>
                <span className="font-bold text-blue-600">{formatCurrency(report.investing_activities.net_investing_cash_flow)}</span>
              </div>
            </div>
          </div>

          {/* Financing Activities */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Cash Flow from Financing Activities</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Loan Proceeds</span>
                <span className="font-semibold">{formatCurrency(report.financing_activities.loan_proceeds)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Loan Repayments</span>
                <span className="font-semibold">{formatCurrency(report.financing_activities.loan_repayments)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Dividends Paid</span>
                <span className="font-semibold">{formatCurrency(report.financing_activities.dividends_paid)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 bg-purple-50 px-4">
                <span className="font-bold text-gray-900">Net Cash from Financing Activities</span>
                <span className="font-bold text-purple-600">{formatCurrency(report.financing_activities.net_financing_cash_flow)}</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Opening Cash Balance</span>
                <span className="font-semibold">{formatCurrency(report.opening_cash_balance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Net Change in Cash</span>
                <span className="font-semibold">{formatCurrency(report.net_change_in_cash)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 bg-green-50 px-4">
                <span className="font-bold text-gray-900">Closing Cash Balance</span>
                <span className="font-bold text-green-600">{formatCurrency(report.closing_cash_balance)}</span>
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
