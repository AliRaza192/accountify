"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Activity,
  BarChart3,
  Users,
  Package,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import {
  getDashboardMetrics,
  getRevenueTrends,
  getExpenseTrends,
  getTopCustomers,
  getTopProducts,
  exportToExcel,
  type DashboardMetrics,
  type RevenueTrendPoint,
  type ExpenseCategoryPoint,
  type CustomerRanking,
  type ProductRanking,
} from "@/lib/api/bi";
import { formatCurrency, formatDate } from "@/lib/utils";

type DateRangePreset = "30d" | "90d" | "1y" | "custom";

interface DateRange {
  start_date: string;
  end_date: string;
}

function getDateRange(preset: DateRangePreset): DateRange {
  const end = new Date();
  const start = new Date();
  switch (preset) {
    case "30d":
      start.setDate(end.getDate() - 30);
      break;
    case "90d":
      start.setDate(end.getDate() - 90);
      break;
    case "1y":
      start.setFullYear(end.getFullYear() - 1);
      break;
    case "custom":
      start.setDate(end.getDate() - 30);
      break;
  }
  return {
    start_date: start.toISOString().split("T")[0],
    end_date: end.toISOString().split("T")[0],
  };
}

function formatDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function TrendArrow({ value }: { value: number }) {
  if (value > 0) {
    return <ArrowUpRight className="h-4 w-4 text-green-500" />;
  }
  if (value < 0) {
    return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  }
  return <Minus className="h-4 w-4 text-gray-400" />;
}

function GaugeIndicator({
  value,
  label,
  goodRange,
  avgRange,
}: {
  value: number;
  label: string;
  goodRange: [number, number];
  avgRange: [number, number];
}) {
  const clampedValue = Math.max(0, Math.min(value, goodRange[1] * 1.5));
  const maxVal = goodRange[1] * 1.5;
  const percent = (clampedValue / maxVal) * 100;
  let color = "bg-green-500";
  let status = "Good";
  if (value < goodRange[0] || value > goodRange[1]) {
    if (value >= avgRange[0] && value <= avgRange[1]) {
      color = "bg-yellow-500";
      status = "Average";
    } else {
      color = "bg-red-500";
      status = "Poor";
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-8 overflow-hidden">
        <div className="absolute inset-0 rounded-t-full bg-gray-200" />
        <div
          className={`absolute bottom-0 left-0 right-0 rounded-t-full ${color} transition-all duration-500`}
          style={{ height: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{status}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/3" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-64 bg-gray-200 rounded" />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-200 rounded mb-2" />
      ))}
    </div>
  );
}

export default function BIDashboard() {
  const [datePreset, setDatePreset] = useState<DateRangePreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRange("30d"));
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrendPoint[]>([]);
  const [expenseTrends, setExpenseTrends] = useState<ExpenseCategoryPoint[]>([]);
  const [topCustomers, setTopCustomers] = useState<CustomerRanking[]>([]);
  const [topProducts, setTopProducts] = useState<ProductRanking[]>([]);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [m, rev, exp, cust, prod] = await Promise.all([
        getDashboardMetrics(dateRange.start_date, dateRange.end_date),
        getRevenueTrends(12),
        getExpenseTrends(12),
        getTopCustomers(5),
        getTopProducts(5),
      ]);
      setMetrics(m);
      setRevenueTrends(rev);
      setExpenseTrends(exp);
      setTopCustomers(cust);
      setTopProducts(prod);
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  function handlePresetChange(preset: DateRangePreset) {
    setDatePreset(preset);
    if (preset !== "custom") {
      setDateRange(getDateRange(preset));
    }
  }

  function applyCustomRange() {
    if (customStart && customEnd) {
      setDateRange({ start_date: customStart, end_date: customEnd });
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportToExcel(dateRange.start_date, dateRange.end_date);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bi-report-${dateRange.start_date}-${dateRange.end_date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Failed to export");
    } finally {
      setExporting(false);
    }
  }

  const expenseChartData = expenseTrends.slice(0, 8).map((e) => ({
    name: e.category,
    amount: e.amount,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BI & Analytics</h1>
          <p className="text-gray-500 mt-1">Business intelligence dashboard</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting..." : "Export to Excel"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Date Range Picker */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Calendar className="h-5 w-5 text-gray-500" />
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "30d", label: "Last 30 Days" },
                { key: "90d", label: "Last 90 Days" },
                { key: "1y", label: "Last 1 Year" },
                { key: "custom", label: "Custom" },
              ] as { key: DateRangePreset; label: string }[]
            ).map((p) => (
              <button
                key={p.key}
                onClick={() => handlePresetChange(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  datePreset === p.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {datePreset === "custom" && (
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={applyCustomRange}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          )}
          {datePreset !== "custom" && (
            <span className="ml-auto text-sm text-gray-500">
              {formatDDMMYYYY(dateRange.start_date)} — {formatDDMMYYYY(dateRange.end_date)}
            </span>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/bi/trends"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          <BarChart3 className="h-4 w-4" />
          Detailed Trends
        </Link>
        <Link
          href="/dashboard/bi/ratios"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          <Activity className="h-4 w-4" />
          Financial Ratios
        </Link>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Total Revenue</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(metrics.total_revenue)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm">
              <TrendArrow value={metrics.revenue_trend_percent} />
              <span
                className={
                  metrics.revenue_trend_percent >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {metrics.revenue_trend_percent >= 0 ? "+" : ""}
                {metrics.revenue_trend_percent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Total Expenses</span>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(metrics.total_expenses)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm">
              <TrendArrow value={metrics.expense_trend_percent} />
              <span
                className={
                  metrics.expense_trend_percent >= 0
                    ? "text-red-600"
                    : "text-green-600"
                }
              >
                {metrics.expense_trend_percent >= 0 ? "+" : ""}
                {metrics.expense_trend_percent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Net Profit</span>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </div>
            <div
              className={`text-xl font-bold ${
                metrics.net_profit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(metrics.net_profit)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Margin: {metrics.net_margin_percent.toFixed(1)}%
            </div>
          </div>

          {/* Gross Margin */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Gross Margin</span>
              <Percent className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {metrics.gross_margin_percent.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500 mt-1">of revenue</div>
          </div>

          {/* Current Ratio */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Current Ratio</span>
              <Activity className="h-4 w-4 text-cyan-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {metrics.current_ratio.toFixed(2)}
            </div>
            <div className="mt-2">
              <GaugeIndicator
                value={metrics.current_ratio}
                label="Current Ratio"
                goodRange={[1.5, 3.0]}
                avgRange={[1.0, 1.5]}
              />
            </div>
          </div>

          {/* Quick Ratio */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Quick Ratio</span>
              <Activity className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {metrics.quick_ratio.toFixed(2)}
            </div>
            <div className="mt-2">
              <GaugeIndicator
                value={metrics.quick_ratio}
                label="Quick Ratio"
                goodRange={[1.0, 2.0]}
                avgRange={[0.7, 1.0]}
              />
            </div>
          </div>

          {/* DSO */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">
                Days Sales Outstanding
              </span>
              <Calendar className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {metrics.dso.toFixed(1)} days
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {metrics.dso <= 30 ? "Excellent" : metrics.dso <= 45 ? "Good" : "Needs attention"}
            </div>
          </div>

          {/* Inventory Turnover */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">
                Inventory Turnover
              </span>
              <Package className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {metrics.inventory_turnover.toFixed(1)}x
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {metrics.inventory_turnover >= 6
                ? "Healthy"
                : metrics.inventory_turnover >= 4
                ? "Average"
                : "Low"}
            </div>
          </div>
        </div>
      ) : null}

      {/* Revenue Trend Chart */}
      {loading ? (
        <SkeletonChart />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue & Expense Trends (12 Months)
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => label}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                {revenueTrends.some((r) => r.previous_year_revenue) && (
                  <Line
                    type="monotone"
                    dataKey="previous_year_revenue"
                    name="Prior Year"
                    stroke="#94a3b8"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Expense Breakdown + Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        {loading ? (
          <SkeletonChart />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Expense Breakdown by Category
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="amount" name="Amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Top Customers */}
        {loading ? (
          <SkeletonTable />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Top 5 Customers
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">#</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Customer</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-medium">Revenue</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-medium">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((c) => (
                    <tr key={c.rank} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-500">{c.rank}</td>
                      <td className="py-2 px-2 font-medium text-gray-900">{c.customer_name}</td>
                      <td className="py-2 px-2 text-right text-gray-900">
                        {formatCurrency(c.total_revenue)}
                      </td>
                      <td className="py-2 px-2 text-right text-red-600">
                        {formatCurrency(c.outstanding_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Top Products */}
      {loading ? (
        <SkeletonTable />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-500" />
              Top 5 Products
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">#</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Product</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">Qty Sold</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">Revenue</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.rank} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-500">{p.rank}</td>
                    <td className="py-2 px-2">
                      <div className="font-medium text-gray-900">{p.product_name}</div>
                      {p.sku && <div className="text-xs text-gray-400">{p.sku}</div>}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-900">
                      {p.quantity_sold.toLocaleString("en-PK")}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-900">
                      {formatCurrency(p.total_revenue)}
                    </td>
                    <td
                      className={`py-2 px-2 text-right font-medium ${
                        p.total_profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(p.total_profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
