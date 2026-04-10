"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  BarChart3,
  Download,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  LineChart,
  Line,
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
  getFinancialRatios,
  getRatioHistory,
  exportToExcel,
  type FinancialRatios,
  type RatioHistoryPoint,
} from "@/lib/api/bi";
import { formatDate } from "@/lib/utils";

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

// Ratio interpretation thresholds
interface RatioThresholds {
  good: [number, number];
  average: [number, number];
  lowerIsBetter?: boolean;
}

const RATIO_THRESHOLDS: Record<string, RatioThresholds> = {
  gross_margin_percent: { good: [40, 100], average: [20, 40] },
  net_margin_percent: { good: [15, 100], average: [5, 15] },
  roa: { good: [5, 100], average: [1, 5] },
  roe: { good: [15, 100], average: [8, 15] },
  current_ratio: { good: [1.5, 3.0], average: [1.0, 1.5] },
  quick_ratio: { good: [1.0, 2.0], average: [0.7, 1.0] },
  inventory_turnover: { good: [6, 100], average: [4, 6] },
  dso: { good: [0, 30], average: [30, 45], lowerIsBetter: true },
  dpo: { good: [30, 90], average: [15, 30] },
  debt_to_equity: { good: [0, 1.0], average: [1.0, 2.0], lowerIsBetter: true },
  interest_coverage: { good: [3, 100], average: [1.5, 3] },
};

function getRatioStatus(
  key: string,
  value: number
): "good" | "average" | "poor" {
  const t = RATIO_THRESHOLDS[key];
  if (!t) return "average";
  if (value >= t.good[0] && value <= t.good[1]) return "good";
  if (value >= t.average[0] && value <= t.average[1]) return "average";
  return "poor";
}

function StatusBadge({ status }: { status: "good" | "average" | "poor" }) {
  if (status === "good") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        <CheckCircle className="h-3 w-3" />
        Good
      </span>
    );
  }
  if (status === "poor") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
        <AlertCircle className="h-3 w-3" />
        Poor
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
      <AlertTriangle className="h-3 w-3" />
      Average
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-5 bg-gray-200 rounded w-1/3" />
    </div>
  );
}

interface RatioCardProps {
  label: string;
  value: number;
  unit?: string;
  thresholds: RatioThresholds;
  showTrend?: boolean;
  historyValues?: number[];
}

function RatioCard({
  label,
  value,
  unit = "",
  thresholds,
  showTrend = false,
  historyValues,
}: RatioCardProps) {
  const status = getRatioStatus(
    Object.keys(RATIO_THRESHOLDS).find((k) => RATIO_THRESHOLDS[k] === thresholds) || "",
    value
  );

  // Compute trend direction
  let trendIcon = <Minus className="h-4 w-4 text-gray-400" />;
  let trendColor = "text-gray-500";
  if (showTrend && historyValues && historyValues.length >= 2) {
    const last = historyValues[historyValues.length - 1];
    const prev = historyValues[historyValues.length - 2];
    if (prev !== 0) {
      const change = ((last - prev) / Math.abs(prev)) * 100;
      const isPositive = thresholds.lowerIsBetter ? change < 0 : change > 0;
      if (isPositive) {
        trendIcon = <ArrowUpRight className="h-4 w-4 text-green-500" />;
        trendColor = "text-green-600";
      } else {
        trendIcon = <ArrowDownRight className="h-4 w-4 text-red-500" />;
        trendColor = "text-red-600";
      }
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <StatusBadge status={status} />
      </div>
      <div className="flex items-end gap-2">
        <span
          className={`text-2xl font-bold ${
            status === "good"
              ? "text-green-600"
              : status === "poor"
              ? "text-red-600"
              : "text-gray-900"
          }`}
        >
          {value.toFixed(2)}
          {unit}
        </span>
        {showTrend && <span className={`mb-1 ${trendColor}`}>{trendIcon}</span>}
      </div>
      <div className="mt-3 text-xs text-gray-400">
        Good: {thresholds.good[0]}–{thresholds.good[1]}
        {unit} | Avg: {thresholds.average[0]}–{thresholds.average[1]}
        {unit}
      </div>
    </div>
  );
}

export default function FinancialRatiosPage() {
  const [datePreset, setDatePreset] = useState<DateRangePreset>("90d");
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRange("90d"));
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [ratios, setRatios] = useState<FinancialRatios | null>(null);
  const [history, setHistory] = useState<RatioHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [r, h] = await Promise.all([
        getFinancialRatios(dateRange.start_date, dateRange.end_date),
        getRatioHistory(12),
      ]);
      setRatios(r);
      setHistory(h);
    } catch (err: any) {
      setError(err?.message || "Failed to load financial ratios");
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
      a.download = `ratios-${dateRange.start_date}-${dateRange.end_date}.xlsx`;
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

  // Build history chart data for key ratios
  const chartData = history.map((h) => ({
    period: h.period,
    gross_margin: h.gross_margin_percent,
    net_margin: h.net_margin_percent,
    current_ratio: h.current_ratio,
    roe: h.roe,
  }));

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
            <h1 className="text-2xl font-bold text-gray-900">Financial Ratios</h1>
            <p className="text-gray-500 mt-1">
              Key financial health indicators and benchmarks
            </p>
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
              {formatDDMMYYYY(dateRange.start_date)} —{" "}
              {formatDDMMYYYY(dateRange.end_date)}
            </span>
          )}
        </div>
      </div>

      {/* Profitability Ratios */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Profitability Ratios
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : ratios ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <RatioCard
              label="Gross Margin"
              value={ratios.gross_margin_percent}
              unit="%"
              thresholds={RATIO_THRESHOLDS.gross_margin_percent}
              showTrend
              historyValues={history.map((h) => h.gross_margin_percent)}
            />
            <RatioCard
              label="Net Margin"
              value={ratios.net_margin_percent}
              unit="%"
              thresholds={RATIO_THRESHOLDS.net_margin_percent}
              showTrend
              historyValues={history.map((h) => h.net_margin_percent)}
            />
            <RatioCard
              label="Return on Assets (ROA)"
              value={ratios.roa}
              unit="%"
              thresholds={RATIO_THRESHOLDS.roa}
              showTrend
              historyValues={history.map((h) => h.roa)}
            />
            <RatioCard
              label="Return on Equity (ROE)"
              value={ratios.roe}
              unit="%"
              thresholds={RATIO_THRESHOLDS.roe}
              showTrend
              historyValues={history.map((h) => h.roe)}
            />
          </div>
        ) : null}
      </section>

      {/* Liquidity Ratios */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Liquidity Ratios
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : ratios ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <RatioCard
              label="Current Ratio"
              value={ratios.current_ratio}
              thresholds={RATIO_THRESHOLDS.current_ratio}
              showTrend
              historyValues={history.map((h) => h.current_ratio)}
            />
            <RatioCard
              label="Quick Ratio"
              value={ratios.quick_ratio}
              thresholds={RATIO_THRESHOLDS.quick_ratio}
              showTrend
              historyValues={history.map((h) => h.quick_ratio)}
            />
          </div>
        ) : null}
      </section>

      {/* Efficiency Ratios */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-500" />
          Efficiency Ratios
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : ratios ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <RatioCard
              label="Inventory Turnover"
              value={ratios.inventory_turnover}
              unit="x"
              thresholds={RATIO_THRESHOLDS.inventory_turnover}
              showTrend
              historyValues={history.map((h) => h.inventory_turnover)}
            />
            <RatioCard
              label="Days Sales Outstanding (DSO)"
              value={ratios.dso}
              unit=" days"
              thresholds={RATIO_THRESHOLDS.dso}
              showTrend
              historyValues={history.map((h) => h.dso)}
            />
            <RatioCard
              label="Days Payable Outstanding (DPO)"
              value={ratios.dpo}
              unit=" days"
              thresholds={RATIO_THRESHOLDS.dpo}
              showTrend
              historyValues={history.map((h) => h.dpo)}
            />
          </div>
        ) : null}
      </section>

      {/* Leverage Ratios */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-orange-500" />
          Leverage Ratios
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : ratios ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <RatioCard
              label="Debt-to-Equity"
              value={ratios.debt_to_equity}
              thresholds={RATIO_THRESHOLDS.debt_to_equity}
              showTrend
              historyValues={history.map((h) => h.debt_to_equity)}
            />
            <RatioCard
              label="Interest Coverage"
              value={ratios.interest_coverage}
              thresholds={RATIO_THRESHOLDS.interest_coverage}
              showTrend
              historyValues={history.map((h) => h.interest_coverage)}
            />
          </div>
        ) : null}
      </section>

      {/* Historical Trends Chart */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-72 bg-gray-200 rounded" />
        </div>
      ) : history.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Historical Ratio Trends
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="gross_margin"
                  name="Gross Margin %"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="net_margin"
                  name="Net Margin %"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="current_ratio"
                  name="Current Ratio"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="roe"
                  name="ROE %"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {/* Ratio Reference Table */}
      {loading ? null : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ratio Reference Guide
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Ratio</th>
                  <th className="text-center py-2 px-3 text-green-600 font-medium">Good</th>
                  <th className="text-center py-2 px-3 text-yellow-600 font-medium">Average</th>
                  <th className="text-center py-2 px-3 text-red-600 font-medium">Poor</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: "Gross Margin %",
                    desc: "Percentage of revenue remaining after COGS",
                  },
                  {
                    name: "Net Margin %",
                    desc: "Percentage of revenue remaining after all expenses",
                  },
                  { name: "ROA", desc: "How efficiently assets generate profit" },
                  { name: "ROE", desc: "Return generated on shareholder equity" },
                  {
                    name: "Current Ratio",
                    desc: "Ability to pay short-term obligations",
                  },
                  {
                    name: "Quick Ratio",
                    desc: "Ability to pay short-term obligations without inventory",
                  },
                  {
                    name: "Inventory Turnover",
                    desc: "How many times inventory is sold and replaced",
                  },
                  {
                    name: "DSO",
                    desc: "Average days to collect payment from customers",
                  },
                  {
                    name: "DPO",
                    desc: "Average days to pay suppliers",
                  },
                  {
                    name: "Debt-to-Equity",
                    desc: "Proportion of debt to equity financing",
                  },
                  {
                    name: "Interest Coverage",
                    desc: "Ability to pay interest on outstanding debt",
                  },
                ].map((row) => {
                  const key = row.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "_")
                    .replace(/_+$/, "");
                  const keyMap: Record<string, string> = {
                    gross_margin: "gross_margin_percent",
                    net_margin: "net_margin_percent",
                    roa: "roa",
                    roe: "roe",
                    current_ratio: "current_ratio",
                    quick_ratio: "quick_ratio",
                    inventory_turnover: "inventory_turnover",
                    dso: "dso",
                    dpo: "dpo",
                    debt_to_equity: "debt_to_equity",
                    interest_coverage: "interest_coverage",
                  };
                  const t = RATIO_THRESHOLDS[keyMap[key] || ""];
                  if (!t) return null;
                  return (
                    <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-900">{row.name}</td>
                      <td className="py-2 px-3 text-center text-green-600">
                        {t.good[0]}–{t.good[1]}
                      </td>
                      <td className="py-2 px-3 text-center text-yellow-600">
                        {t.average[0]}–{t.average[1]}
                      </td>
                      <td className="py-2 px-3 text-center text-red-600">
                        {t.lowerIsBetter
                          ? `>${t.average[1]}`
                          : `<${t.average[0]}`}
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs">{row.desc}</td>
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
