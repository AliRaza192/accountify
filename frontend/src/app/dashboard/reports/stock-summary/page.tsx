"use client"

import { useState, useCallback, useEffect } from "react"
import { Download, FileDown, Printer, Loader2, AlertTriangle } from "lucide-react"
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

interface StockItem {
  product_code: string
  product_name: string
  category: string
  quantity_on_hand: number
  unit_cost: number
  total_value: number
  quantity_in: number
  quantity_out: number
  reorder_level: number
}

interface StockSummaryData {
  items: StockItem[]
  summary: {
    total_items: number
    total_value: number
    low_stock_count: number
  }
}

const REPORT_TITLE = "Stock Summary"

export default function StockSummaryReportPage() {
  const { toast } = useToast()
  const [category, setCategory] = useState("")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<StockSummaryData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await api.get("/api/products")
      const cats = new Set<string>()
      for (const p of response.data.data || []) {
        if (p.category) cats.add(p.category)
      }
      setCategories(Array.from(cats).sort())
    } catch {
      // silently fail
    }
  }

  const generateReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, string | boolean> = { low_stock_only: lowStockOnly }
      if (category) params.category = category

      const response = await api.get("/api/reports/stock-summary", { params })
      setData(response.data.data)
      if (!response.data.success) {
        setError(response.data.message || "Failed to generate report")
      }
    } catch (err: any) {
      console.error("Failed to generate report:", err)
      const msg = err.response?.data?.detail || "Failed to generate Stock Summary"
      setError(msg)
      toast({
        title: "Error",
        description: msg,
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }, [category, lowStockOnly, toast])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleExportCSV = useCallback(() => {
    if (!data?.items.length) return
    const headers = ["Product Code", "Product Name", "Category", "Qty On Hand", "Unit Cost", "Total Value", "Qty In", "Qty Out", "Reorder Level"]
    const rows = data.items.map((item) => [
      item.product_code,
      item.product_name,
      item.category,
      item.quantity_on_hand.toFixed(2),
      item.unit_cost.toFixed(2),
      item.total_value.toFixed(2),
      item.quantity_in.toFixed(2),
      item.quantity_out.toFixed(2),
      item.reorder_level.toFixed(2),
    ])
    rows.push(["", "", "Totals", "", "", data.summary.total_value.toFixed(2), "", "", ""])

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stock-summary-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: "CSV file downloaded" })
  }, [data, toast])

  return (
    <div className="space-y-6">
      <PageHeader title={REPORT_TITLE} subtitle="Current inventory levels and value" />

      {/* Filters - hide when printing */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="lowStockOnly"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="lowStockOnly" className="text-sm text-gray-700">Low Stock Only</label>
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
          <p className="mt-4 text-gray-500">Generating Stock Summary...</p>
        </div>
      )}

      {/* Report Content */}
      {data && !isLoading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary.total_items}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm text-gray-600">Total Stock Value</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.summary.total_value)}</p>
            </div>
            <div className={`rounded-xl shadow-sm border p-4 ${data.summary.low_stock_count > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
              <div className="flex items-center gap-2">
                {data.summary.low_stock_count > 0 && <AlertTriangle className="h-5 w-5 text-red-500" />}
                <div>
                  <p className={`text-sm ${data.summary.low_stock_count > 0 ? "text-red-600" : "text-green-600"}`}>Low Stock Items</p>
                  <p className={`text-2xl font-bold ${data.summary.low_stock_count > 0 ? "text-red-600" : "text-green-600"}`}>{data.summary.low_stock_count}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
            <div className="p-6 border-b border-gray-100 print:p-4">
              <h2 className="text-xl font-bold text-gray-900 text-center">Stock Summary Report</h2>
              <p className="text-sm text-gray-500 text-center mt-1">
                {category ? `Category: ${category}` : "All Categories"} {lowStockOnly ? "| Low Stock Only" : ""}
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Code</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead className="text-right w-28">Qty On Hand</TableHead>
                    <TableHead className="text-right w-28">Unit Cost</TableHead>
                    <TableHead className="text-right w-32">Total Value</TableHead>
                    <TableHead className="text-right w-24">Qty In</TableHead>
                    <TableHead className="text-right w-24">Qty Out</TableHead>
                    <TableHead className="text-right w-28">Reorder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        No stock items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.items.map((item) => (
                      <TableRow key={item.product_code} className={item.quantity_on_hand <= item.reorder_level ? "bg-red-50" : ""}>
                        <TableCell className="font-mono text-sm text-gray-600">{item.product_code || "-"}</TableCell>
                        <TableCell className="font-medium text-gray-900">{item.product_name}</TableCell>
                        <TableCell className="text-sm text-gray-500">{item.category}</TableCell>
                        <TableCell className="text-right font-medium">{item.quantity_on_hand.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total_value)}</TableCell>
                        <TableCell className="text-right text-green-600">{item.quantity_in.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-red-600">{item.quantity_out.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm text-gray-500">{item.reorder_level.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <tfoot className="bg-gray-50">
                  <TableRow>
                    <TableCell colSpan={5} className="font-bold text-gray-900 text-right">Total Stock Value</TableCell>
                    <TableCell className="text-right font-bold text-lg text-blue-600">
                      {formatCurrency(data.summary.total_value)}
                    </TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          </div>
        </>
      )}

      {!data && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Click "Generate Report" to view Stock Summary</p>
        </div>
      )}
    </div>
  )
}
