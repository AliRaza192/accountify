"use client"

import { useState, useCallback } from "react"
import { Download, FileDown, Printer, Loader2, TrendingUp } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface BranchData {
  branch_id: number
  branch_name: string
  branch_code: string
  revenue: number
  expenses: number
  net_profit: number
  invoice_count: number
  bill_count: number
}

interface BranchWiseData {
  start_date: string
  end_date: string
  branches: BranchData[]
  totals: {
    total_revenue: number
    total_expenses: number
    total_net_profit: number
  }
}

const REPORT_TITLE = "Branch-wise Profit & Loss"

export default function BranchWiseReportPage() {
  const { toast } = useToast()
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<BranchWiseData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get("/api/reports/branch-wise-pl", {
        params: { start_date: startDate, end_date: endDate },
      })
      setData(response.data.data)
      if (!response.data.success) {
        setError(response.data.message || "Failed to generate report")
      }
    } catch (err: any) {
      console.error("Failed to generate report:", err)
      const msg = err.response?.data?.detail || "Failed to generate Branch-wise P&L"
      setError(msg)
      toast({
        title: "Error",
        description: msg,
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate, toast])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleExportCSV = useCallback(() => {
    if (!data?.branches.length) return
    const headers = ["Branch Code", "Branch Name", "Revenue (PKR)", "Expenses (PKR)", "Net Profit (PKR)", "Invoices", "Bills"]
    const rows = data.branches.map((b) => [
      b.branch_code,
      b.branch_name,
      b.revenue.toFixed(2),
      b.expenses.toFixed(2),
      b.net_profit.toFixed(2),
      String(b.invoice_count),
      String(b.bill_count),
    ])
    rows.push(["", "Totals", data.totals.total_revenue.toFixed(2), data.totals.total_expenses.toFixed(2), data.totals.total_net_profit.toFixed(2), "", ""])

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `branch-wise-pl-${startDate}-to-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: "CSV file downloaded" })
  }, [data, startDate, endDate, toast])

  const chartData = data?.branches.map((b) => ({
    name: b.branch_code,
    revenue: b.revenue,
    expenses: b.expenses,
    net_profit: b.net_profit,
  })) || []

  return (
    <div className="space-y-6">
      <PageHeader title={REPORT_TITLE} subtitle="Branch-wise revenue, expenses, and profitability" />

      {/* Filters - hide when printing */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button
            onClick={generateReport}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Generate Report
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2" disabled={!data}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2" disabled={!data}>
              <FileDown className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-500">Generating Branch-wise Report...</p>
        </div>
      )}

      {/* Report Content */}
      {data && !isLoading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(data.totals.total_revenue)}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(data.totals.total_expenses)}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
            <div className={`rounded-xl shadow-sm border p-4 ${data.totals.total_net_profit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${data.totals.total_net_profit >= 0 ? "text-green-600" : "text-red-600"}`}>Net Profit</p>
                  <p className={`text-2xl font-bold ${data.totals.total_net_profit >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatCurrency(Math.abs(data.totals.total_net_profit))}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${data.totals.total_net_profit >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                  <TrendingUp className={`h-6 w-6 ${data.totals.total_net_profit >= 0 ? "text-green-600" : "text-red-600"}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Chart - hide when printing */}
          {data.branches.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:hidden">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Comparison</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `PKR ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name.replace("_", " ")]}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#22c55e" name="Revenue" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="net_profit" fill="#3b82f6" name="Net Profit" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Branch Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
            <div className="p-6 border-b border-gray-100 print:p-4">
              <h2 className="text-xl font-bold text-gray-900 text-center">Branch-wise P&L Report</h2>
              <p className="text-sm text-gray-500 text-center mt-1">
                {formatDate(data.start_date, "long")} - {formatDate(data.end_date, "long")}
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Code</TableHead>
                    <TableHead>Branch Name</TableHead>
                    <TableHead className="text-right">Revenue (PKR)</TableHead>
                    <TableHead className="text-right">Expenses (PKR)</TableHead>
                    <TableHead className="text-right">Net Profit/(Loss)</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Bills</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.branches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No branches found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.branches.map((branch) => (
                      <TableRow key={branch.branch_id}>
                        <TableCell className="font-mono text-sm text-gray-600">{branch.branch_code}</TableCell>
                        <TableCell className="font-medium text-gray-900">{branch.branch_name}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">{formatCurrency(branch.revenue)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(branch.expenses)}</TableCell>
                        <TableCell className={`text-right font-bold ${branch.net_profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {branch.net_profit >= 0 ? "" : "( "}{formatCurrency(Math.abs(branch.net_profit))}{branch.net_profit < 0 ? " )" : ""}
                        </TableCell>
                        <TableCell className="text-right">{branch.invoice_count}</TableCell>
                        <TableCell className="text-right">{branch.bill_count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <tfoot className="bg-gray-50">
                  <TableRow>
                    <TableCell colSpan={2} className="font-bold text-gray-900">Totals</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(data.totals.total_revenue)}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">{formatCurrency(data.totals.total_expenses)}</TableCell>
                    <TableCell className={`text-right font-bold text-lg ${data.totals.total_net_profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(Math.abs(data.totals.total_net_profit))}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {data.branches.reduce((s, b) => s + b.invoice_count, 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {data.branches.reduce((s, b) => s + b.bill_count, 0)}
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          </div>
        </>
      )}

      {!data && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Select date range and click "Generate Report" to view Branch-wise P&L</p>
        </div>
      )}
    </div>
  )
}
