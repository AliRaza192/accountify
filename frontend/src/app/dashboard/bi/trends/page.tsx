"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  BarChart3,
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
  ComposedChart,
  Area,
  AreaChart,
} from "recharts";
import {
  getRevenueTrends,
  exportToExcel,
  type RevenueTrendPoint,
} from "@/lib/api/bi";
import { formatCurrency } from "@/lib/utils";

type TimeGranularity = "monthly" | "quarterly" | "yearly";

function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-80 bg-gray-200 rounded" />
    </div>
  );
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

export default function RevenueTrendsPage() {
  const [granularity, setGranularity] = useState<TimeGranularity>("monthly");
  const [data, setData] = useState<RevenueTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const result = await getRevenueTrends(24);
        setData(result);
      } catch (err: any) {
        setError(err?.message || "Failed to load revenue trends");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportToExcel();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `revenue-trends-${granularity}.xlsx`;
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

  function aggregateData(
    raw: RevenueTrendPoint[],
    mode: TimeGranularity
  ): RevenueTrendPoint[] {
    if (mode === "monthly") {
      return raw.slice(-12);
    }

    if (mode === "quarterly") {
      const quarters: Record<string, RevenueTrendPoint> = {};
      raw.forEach((item) => {
        const d = new Date(item.month);
        const q = Math.floor(d.getMonth() / 3);
        const year = d.getFullYear();
        const key = `Q${q + 1} ${year}`;
        if (!quarters[key]) {
          quarters[key] = {
            month: key,
            revenue: 0,
            expenses: 0,
            net_profit: 0,
            previous_year_revenue: item.previous_year_revenue || 0,
          };
        }
        quarters[key].revenue += item.revenue;
        quarters[key].expenses += item.expenses;
        quarters[key].net_profit += item.net_profit;
      });
      return Object.values(quarters).slice(-8);
    }

    // yearly
    const years: Record<string, RevenueTrendPoint> = {};
    raw.forEach((item) => {
      const d = new Date(item.month);
      const year = d.getFullYear();
      const key = String(year);
      if (!years[key]) {
        years[key] = {
          month: key,
          revenue: 0,
          expenses: 0,
          net_profit: 0,
          previous_year_revenue: item.previous_year_revenue || 0,
        };
      }
      years[key].revenue += item.revenue;
      years[key].expenses += item.expenses;
      years[key].net_profit += item.net_profit;
    });
    return Object.values(years).slice(-5);
  }

  const chartData = aggregateData(data, granularity);

  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);
  const totalExpenses = chartData.reduce((s, d) => s + d.expenses, 0);
  const totalProfit = chartData.reduce((s, d) => s + d.net_profit, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const hasYoY = chartData.some((d) => d.previous_year_revenue && d.previous_year_revenue > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/bi"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revenue Trends</h1>
            <p className="text-gray-500 mt-1">Detailed revenue analysis over time</p>
          </div>
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

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Total Revenue</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Total Expenses</span>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Net Profit</span>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </div>
            <div
              className={`text-xl font-bold ${
                totalProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(totalProfit)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Avg Margin</span>
              <BarChart3 className="h-4 w-4 text-purple-500" />
            </div>
            <div
              className={`text-xl font-bold ${
                avgMargin >= 0 ? "text-gray-900" : "text-red-600"
              }`}
            >
              {avgMargin.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Granularity Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-gray-500" />
          <div className="flex gap-2">
            {(
              [
                { key: "monthly", label: "Monthly" },
                { key: "quarterly", label: "Quarterly" },
                { key: "yearly", label: "Yearly" },
              ] as { key: TimeGranularity; label: string }[]
            ).map((g) => (
              <button
                key={g.key}
                onClick={() => setGranularity(g.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  granularity === g.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chart */}
      {loading ? (
        <SkeletonChart />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue vs Expenses ({granularity})
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
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
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.1}
                  strokeWidth={2.5}
                />
                <Line
                  type="monotone"
                  dataKey="net_profit"
                  name="Net Profit"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* YoY Comparison */}
      {loading ? (
        <SkeletonChart />
      ) : hasYoY ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Year-over-Year Revenue Comparison
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData.filter((d) => d.previous_year_revenue && d.previous_year_revenue > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => label}
                />
                <Legend />
                <Bar
                  dataKey="previous_year_revenue"
                  name="Previous Year"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="revenue"
                  name="Current Year"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {/* Data Table */}
      {loading ? null : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Detailed Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Period</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Revenue</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Expenses</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Net Profit</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Margin %</th>
                  {hasYoY && (
                    <th className="text-right py-2 px-3 text-gray-500 font-medium">YoY Growth</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, i) => {
                  const margin = row.revenue > 0 ? (row.net_profit / row.revenue) * 100 : 0;
                  const yoyGrowth =
                    row.previous_year_revenue && row.previous_year_revenue > 0
                      ? ((row.revenue - row.previous_year_revenue) / row.previous_year_revenue) * 100
                      : null;
                  return (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-900">{row.month}</td>
                      <td className="py-2 px-3 text-right text-green-600">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="py-2 px-3 text-right text-red-600">
                        {formatCurrency(row.expenses)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-medium ${
                          row.net_profit >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(row.net_profit)}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-700">
                        {margin.toFixed(1)}%
                      </td>
                      {hasYoY && (
                        <td className="py-2 px-3 text-right">
                          {yoyGrowth !== null ? (
                            <span
                              className={
                                yoyGrowth >= 0 ? "text-green-600" : "text-red-600"
                              }
                            >
                              {yoyGrowth >= 0 ? "+" : ""}
                              {yoyGrowth.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
