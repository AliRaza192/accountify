"use client"

import { useState, useCallback } from "react"
import { Download, FileDown, Printer, Loader2 } from "lucide-react"
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

interface AccountBalance {
  code: string
  name: string
  amount: number
}

interface ProfitLossData {
  start_date: string
  end_date: string
  revenue: number
  expenses: number
  net_income: number
  revenue_accounts?: AccountBalance[]
  expense_accounts?: AccountBalance[]
}

const REPORT_TITLE = "Profit & Loss Statement"
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company"

export default function ProfitLossReportPage() {
  const { toast } = useToast()
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<ProfitLossData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get("/api/reports/profit-loss", {
        params: { start_date: startDate, end_date: endDate },
      })
      setData(response.data.data)
      if (!response.data.success) {
        setError(response.data.message || "Failed to generate report")
      }
    } catch (err: any) {
      console.error("Failed to generate report:", err)
      const msg = err.response?.data?.detail || "Failed to generate Profit & Loss report"
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
    if (!data) return
    const headers = ["Section", "Account Code", "Account Name", "Amount (PKR)"]
    const rows: string[][] = []

    rows.push(["REVENUE"])
    data.revenue_accounts?.forEach((acc) => rows.push(["Revenue", acc.code, acc.name, acc.amount.toFixed(2)]))
    rows.push(["", "", "Total Revenue", data.revenue.toFixed(2)])
    rows.push([])

    rows.push(["EXPENSES"])
    data.expense_accounts?.forEach((acc) => rows.push(["Expense", acc.code, acc.name, acc.amount.toFixed(2)]))
    rows.push(["", "", "Total Expenses", data.expenses.toFixed(2)])
    rows.push([])

    rows.push(["", "", data.net_income >= 0 ? "Net Profit" : "Net Loss", Math.abs(data.net_income).toFixed(2)])

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `profit-loss-${startDate}-to-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: "CSV file downloaded" })
  }, [data, startDate, endDate, toast])

  return (
    <div className="space-y-6">
      <PageHeader title={REPORT_TITLE} subtitle="Revenue, expenses, and net income" />

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
          <p className="mt-4 text-gray-500">Generating Profit & Loss Statement...</p>
        </div>
      )}

      {/* Report Content */}
      {data && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
          <div className="p-6 border-b border-gray-100 print:p-4">
            <h2 className="text-xl font-bold text-gray-900 text-center">{COMPANY_NAME}</h2>
            <h3 className="text-lg font-semibold text-gray-700 text-center mt-1">{REPORT_TITLE}</h3>
            <p className="text-sm text-gray-500 text-center mt-1">
              {formatDate(data.start_date, "long")} - {formatDate(data.end_date, "long")}
            </p>
          </div>

          <div className="p-6 print:p-4">
            {/* Revenue Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">REVENUE</h3>
              {data.revenue_accounts && data.revenue_accounts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount (PKR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.revenue_accounts.map((acc) => (
                      <TableRow key={acc.code}>
                        <TableCell className="text-gray-600">{acc.name} <span className="text-gray-400 font-mono text-xs">({acc.code})</span></TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(acc.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-4">No revenue recorded for this period</p>
              )}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total Revenue</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(data.revenue)}</span>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">EXPENSES</h3>
              {data.expense_accounts && data.expense_accounts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount (PKR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expense_accounts.map((acc) => (
                      <TableRow key={acc.code}>
                        <TableCell className="text-gray-600">{acc.name} <span className="text-gray-400 font-mono text-xs">({acc.code})</span></TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(acc.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-4">No expenses recorded for this period</p>
              )}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total Expenses</span>
                <span className="text-xl font-bold text-red-600">{formatCurrency(data.expenses)}</span>
              </div>
            </div>

            {/* Net Income */}
            <div className={`p-6 rounded-lg print:p-4 ${data.net_income >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">
                  {data.net_income >= 0 ? "NET PROFIT" : "NET LOSS"}
                </span>
                <span className={`text-2xl font-bold ${data.net_income >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(Math.abs(data.net_income))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!data && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Select date range and click "Generate Report" to view Profit & Loss statement</p>
        </div>
      )}
    </div>
  )
}
