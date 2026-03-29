"use client"

import { useState } from "react"
import { Download, FileDown } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
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

export default function ProfitLossReportPage() {
  const { toast } = useToast()
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<ProfitLossData | null>(null)

  const generateReport = async () => {
    setIsLoading(true)
    try {
      const response = await api.get("/api/reports/profit-loss", {
        params: { start_date: startDate, end_date: endDate },
      })
      setData(response.data.data)
    } catch (error: any) {
      console.error("Failed to generate report:", error)
      toast({
        title: "Error",
        description: "Failed to generate Profit & Loss report",
        
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = (format: "pdf" | "excel") => {
    toast({
      title: "Info",
      description: `${format.toUpperCase()} export coming soon`,
      
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & Loss Statement"
        subtitle="Revenue, expenses, and net income"
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
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
            Generate Report
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button
              onClick={() => handleExport("pdf")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              onClick={() => handleExport("excel")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileDown className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {data && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 text-center">Profit & Loss Statement</h2>
            <p className="text-sm text-gray-500 text-center mt-1">
              {new Date(data.start_date).toLocaleDateString()} - {new Date(data.end_date).toLocaleDateString()}
            </p>
          </div>

          <div className="p-6">
            {/* Revenue Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">REVENUE</h3>
              {data.revenue_accounts && data.revenue_accounts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.revenue_accounts.map((acc) => (
                      <TableRow key={acc.code}>
                        <TableCell className="text-gray-600">{acc.name}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(acc.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-4">No revenue recorded</p>
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
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expense_accounts.map((acc) => (
                      <TableRow key={acc.code}>
                        <TableCell className="text-gray-600">{acc.name}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(acc.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-4">No expenses recorded</p>
              )}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total Expenses</span>
                <span className="text-xl font-bold text-red-600">{formatCurrency(data.expenses)}</span>
              </div>
            </div>

            {/* Net Income */}
            <div className={`p-6 rounded-lg ${data.net_income >= 0 ? "bg-green-50" : "bg-red-50"}`}>
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
