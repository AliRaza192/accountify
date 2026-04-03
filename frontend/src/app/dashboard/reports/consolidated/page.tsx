"use client"

import { useState, useEffect } from "react"
import { FileText, TrendingUp, TrendingDown, Package, DollarSign, Calendar } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Branch {
  id: number
  name: string
  code: string
}

interface ConsolidatedReport {
  branch_id: number
  branch_name: string
  branch_code: string
  sales: {
    total_revenue: number
    total_orders: number
    average_order_value: number
  }
  expenses: {
    total_expenses: number
    total_transactions: number
  }
  inventory: {
    total_items: number
    total_value: number
    low_stock_items: number
  }
  net_profit: number
}

type ReportType = "sales" | "expenses" | "inventory" | "all"

export default function ConsolidatedReportsPage() {
  const { toast } = useToast()
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranches, setSelectedBranches] = useState<number[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [reportType, setReportType] = useState<ReportType>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [reportData, setReportData] = useState<ConsolidatedReport[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)

  useEffect(() => {
    fetchBranches()
    // Set default date range (current month)
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    setDateFrom(firstDay.toISOString().split("T")[0])
    setDateTo(today.toISOString().split("T")[0])
  }, [])

  const fetchBranches = async () => {
    try {
      const response = await api.get("/api/branches")
      const data: Branch[] = response.data || []
      setBranches(data)
      // Default to all branches
      setSelectedBranches(data.map((b) => b.id))
    } catch (error: any) {
      console.error("Failed to fetch branches:", error)
    }
  }

  const toggleBranch = (branchId: number) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    )
  }

  const selectAllBranches = () => {
    setSelectedBranches(branches.map((b) => b.id))
  }

  const generateReport = async () => {
    if (selectedBranches.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one branch",
        variant: "error",
      })
      return
    }

    setIsLoading(true)
    setHasGenerated(true)

    try {
      const params: Record<string, string> = {
        branch_ids: selectedBranches.join(","),
        report_type: reportType,
      }
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const response = await api.get("/api/reports/branches/consolidated", { params })
      setReportData(response.data.data || response.data || [])
    } catch (error: any) {
      console.error("Failed to generate report:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to generate report",
        variant: "error",
      })
      setReportData([])
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate totals across all branches
  const totalRevenue = reportData.reduce((sum, r) => sum + (r.sales?.total_revenue || 0), 0)
  const totalExpenses = reportData.reduce((sum, r) => sum + (r.expenses?.total_expenses || 0), 0)
  const totalInventoryValue = reportData.reduce((sum, r) => sum + (r.inventory?.total_value || 0), 0)
  const totalNetProfit = reportData.reduce((sum, r) => sum + (r.net_profit || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Consolidated Reports</h1>
        <p className="text-gray-500 mt-1">View combined reports across multiple branches</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Branch Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Branches</label>
              <button
                type="button"
                onClick={selectAllBranches}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Select All
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-lg">
              {branches.map((branch) => (
                <label
                  key={branch.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedBranches.includes(branch.id)}
                    onChange={() => toggleBranch(branch.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 truncate">{branch.name}</span>
                </label>
              ))}
            </div>
            {selectedBranches.length === 0 && (
              <p className="text-red-500 text-sm mt-1">Please select at least one branch</p>
            )}
          </div>

          {/* Date Range and Report Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Reports</option>
                <option value="sales">Sales</option>
                <option value="expenses">Expenses</option>
                <option value="inventory">Inventory</option>
              </select>
            </div>
          </div>

          <Button
            onClick={generateReport}
            disabled={isLoading || selectedBranches.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {hasGenerated && reportData.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-gray-500">
                  From {reportData.length} branch(es)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                <p className="text-xs text-gray-500">
                  Across all branches
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalInventoryValue)}</div>
                <p className="text-xs text-gray-500">
                  Total stock value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalNetProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(totalNetProfit)}
                </div>
                <p className="text-xs text-gray-500">
                  Revenue - Expenses
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Branch Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Branch Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Branch</TableHead>
                    {(reportType === "all" || reportType === "sales") && (
                      <>
                        <TableHead className="text-right font-medium">Revenue</TableHead>
                        <TableHead className="text-right font-medium">Orders</TableHead>
                      </>
                    )}
                    {(reportType === "all" || reportType === "expenses") && (
                      <TableHead className="text-right font-medium">Expenses</TableHead>
                    )}
                    {(reportType === "all" || reportType === "inventory") && (
                      <>
                        <TableHead className="text-right font-medium">Items</TableHead>
                        <TableHead className="text-right font-medium">Inventory Value</TableHead>
                      </>
                    )}
                    {reportType === "all" && (
                      <TableHead className="text-right font-medium">Net Profit</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((report) => (
                    <TableRow key={report.branch_id}>
                      <TableCell className="font-medium">
                        <div>
                          <p className="text-gray-900">{report.branch_name}</p>
                          <p className="text-xs text-gray-500">{report.branch_code}</p>
                        </div>
                      </TableCell>
                      {(reportType === "all" || reportType === "sales") && (
                        <>
                          <TableCell className="text-right text-green-600 font-medium">
                            {formatCurrency(report.sales?.total_revenue || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {report.sales?.total_orders || 0}
                          </TableCell>
                        </>
                      )}
                      {(reportType === "all" || reportType === "expenses") && (
                        <TableCell className="text-right text-red-600 font-medium">
                          {formatCurrency(report.expenses?.total_expenses || 0)}
                        </TableCell>
                      )}
                      {(reportType === "all" || reportType === "inventory") && (
                        <>
                          <TableCell className="text-right">
                            {report.inventory?.total_items || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(report.inventory?.total_value || 0)}
                          </TableCell>
                        </>
                      )}
                      {reportType === "all" && (
                        <TableCell className={`text-right font-medium ${report.net_profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(report.net_profit || 0)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {hasGenerated && reportData.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
            <p className="text-gray-500">
              No report data available for the selected branches and date range.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
