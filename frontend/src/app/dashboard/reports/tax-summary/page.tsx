"use client"

import { useState, useCallback } from "react"
import { Download, FileDown, Printer, Loader2 } from "lucide-react"
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

// Sales Tax Report Types
interface SalesByRate {
  taxable_amount: number
  tax_amount: number
  count: number
}

interface SalesTaxData {
  period: string
  output_tax: {
    total_sales: number
    taxable_sales: number
    exempt_sales: number
    zero_rated: number
    total_output_tax: number
    sales_by_rate: Record<string, SalesByRate>
  }
  input_tax: {
    total_purchases: number
    total_input_tax: number
  }
  net_tax_payable: number
  input_tax_credit: number
}

// WHT Report Types
interface WHTCategory {
  total_amount: number
  total_wht: number
  count: number
  rate: number
}

interface WHTData {
  period: string
  categories: Record<string, WHTCategory>
  total_amount: number
  total_wht_deducted: number
  transaction_count: number
}

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company"

export default function TaxSummaryReportPage() {
  const { toast } = useToast()
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1)
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(false)
  const [salesTaxData, setSalesTaxData] = useState<SalesTaxData | null>(null)
  const [whtData, setWHTData] = useState<WHTData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"sales-tax" | "wht">("sales-tax")

  const generateReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [stRes, whtRes] = await Promise.all([
        api.get("/api/reports/sales-tax-report", { params: { period_month: periodMonth, period_year: periodYear } }),
        api.get("/api/reports/wht-report", { params: { period_month: periodMonth, period_year: periodYear } }),
      ])
      setSalesTaxData(stRes.data.data)
      setWHTData(whtRes.data.data)
    } catch (err: any) {
      console.error("Failed to generate report:", err)
      const msg = err.response?.data?.detail || "Failed to generate Tax Report"
      setError(msg)
      toast({
        title: "Error",
        description: msg,
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }, [periodMonth, periodYear, toast])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleExportCSV = useCallback(() => {
    if (activeTab === "sales-tax" && salesTaxData) {
      const headers = ["Section", "Tax Rate", "Taxable Amount", "Tax Amount", "Count"]
      const rows: string[][] = []
      rows.push(["OUTPUT TAX"])
      for (const [rate, info] of Object.entries(salesTaxData.output_tax.sales_by_rate)) {
        rows.push(["Output Tax", `${rate}%`, info.taxable_amount.toFixed(2), info.tax_amount.toFixed(2), String(info.count)])
      }
      rows.push(["", "Total", salesTaxData.output_tax.taxable_sales.toFixed(2), salesTaxData.output_tax.total_output_tax.toFixed(2), ""])
      rows.push([])
      rows.push(["INPUT TAX"])
      rows.push(["", "Total", salesTaxData.input_tax.total_purchases.toFixed(2), salesTaxData.input_tax.total_input_tax.toFixed(2), ""])
      rows.push([])
      rows.push(["NET TAX PAYABLE", "", "", salesTaxData.net_tax_payable.toFixed(2), ""])

      const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sales-tax-${salesTaxData.period}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Exported", description: "Sales Tax CSV downloaded" })
    } else if (activeTab === "wht" && whtData) {
      const headers = ["WHT Category", "Rate %", "Total Amount", "WHT Deducted", "Count"]
      const rows: string[][] = []
      for (const [cat, info] of Object.entries(whtData.categories)) {
        rows.push([cat, `${info.rate}%`, info.total_amount.toFixed(2), info.total_wht.toFixed(2), String(info.count)])
      }
      rows.push(["Totals", "", whtData.total_amount.toFixed(2), whtData.total_wht_deducted.toFixed(2), String(whtData.transaction_count)])

      const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `wht-report-${whtData.period}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Exported", description: "WHT CSV downloaded" })
    }
  }, [activeTab, salesTaxData, whtData, toast])

  const months = [
    { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
    { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
    { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Tax Summary" subtitle="Sales Tax and Withholding Tax Reports (FBR/SRB Compliant)" />

      {/* Filters - hide when printing */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={periodMonth}
              onChange={(e) => setPeriodMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              value={periodYear}
              onChange={(e) => setPeriodYear(Number(e.target.value))}
              min={2020}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
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
            <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2" disabled={!salesTaxData && !whtData}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2" disabled={!salesTaxData && !whtData}>
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
          <p className="mt-4 text-gray-500">Generating Tax Reports...</p>
        </div>
      )}

      {/* Tabs - hide when printing */}
      {(salesTaxData || whtData) && !isLoading && (
        <div className="print:hidden">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("sales-tax")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "sales-tax" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sales Tax Report
            </button>
            <button
              onClick={() => setActiveTab("wht")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "wht" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              WHT Report
            </button>
          </div>
        </div>
      )}

      {/* Sales Tax Report */}
      {salesTaxData && !isLoading && activeTab === "sales-tax" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
          <div className="p-6 border-b border-gray-100 print:p-4">
            <h2 className="text-xl font-bold text-gray-900 text-center">{COMPANY_NAME}</h2>
            <h3 className="text-lg font-semibold text-gray-700 text-center mt-1">Sales Tax Report (SRB/FBR)</h3>
            <p className="text-sm text-gray-500 text-center mt-1">Period: {salesTaxData.period}</p>
          </div>

          <div className="p-6 space-y-8 print:p-4 print:space-y-4">
            {/* Output Tax */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">OUTPUT TAX (Sales)</h3>

              {/* Sales by Tax Rate */}
              <div className="mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tax Rate</TableHead>
                      <TableHead className="text-right">Taxable Amount</TableHead>
                      <TableHead className="text-right">Tax Amount</TableHead>
                      <TableHead className="text-right">Invoices</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(salesTaxData.output_tax.sales_by_rate).map(([rate, info]) => (
                      <TableRow key={rate}>
                        <TableCell className="font-medium">{rate}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(info.taxable_amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(info.tax_amount)}</TableCell>
                        <TableCell className="text-right">{info.count}</TableCell>
                      </TableRow>
                    ))}
                    {Object.keys(salesTaxData.output_tax.sales_by_rate).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-gray-500">No sales recorded</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <tfoot className="bg-gray-50">
                    <TableRow>
                      <TableCell className="font-bold">Total</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(salesTaxData.output_tax.taxable_sales)}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{formatCurrency(salesTaxData.output_tax.total_output_tax)}</TableCell>
                      <TableCell className="text-right"></TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              </div>

              <div className="grid grid-cols-3 gap-4 print:grid-cols-3">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Total Sales</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(salesTaxData.output_tax.total_sales)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600">Taxable Sales</p>
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(salesTaxData.output_tax.taxable_sales)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-600">Output Tax</p>
                  <p className="text-xl font-bold text-red-700">{formatCurrency(salesTaxData.output_tax.total_output_tax)}</p>
                </div>
              </div>
            </div>

            {/* Input Tax */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">INPUT TAX (Purchases)</h3>
              <div className="grid grid-cols-2 gap-4 print:grid-cols-2">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Purchases</p>
                  <p className="text-xl font-bold text-gray-700">{formatCurrency(salesTaxData.input_tax.total_purchases)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Input Tax Credit</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(salesTaxData.input_tax.total_input_tax)}</p>
                </div>
              </div>
            </div>

            {/* Net Tax Payable */}
            <div className={`p-6 rounded-lg ${salesTaxData.net_tax_payable > 0 ? "bg-red-50" : "bg-green-50"}`}>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">NET TAX PAYABLE</span>
                <span className={`text-2xl font-bold ${salesTaxData.net_tax_payable > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(salesTaxData.net_tax_payable)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Output Tax: {formatCurrency(salesTaxData.output_tax.total_output_tax)} - Input Tax Credit: {formatCurrency(salesTaxData.input_tax.total_input_tax)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WHT Report */}
      {whtData && !isLoading && activeTab === "wht" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
          <div className="p-6 border-b border-gray-100 print:p-4">
            <h2 className="text-xl font-bold text-gray-900 text-center">{COMPANY_NAME}</h2>
            <h3 className="text-lg font-semibold text-gray-700 text-center mt-1">Withholding Tax (WHT) Report</h3>
            <p className="text-sm text-gray-500 text-center mt-1">Period: {whtData.period}</p>
          </div>

          <div className="p-6 space-y-6 print:p-4 print:space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{whtData.transaction_count}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(whtData.total_amount)}</p>
              </div>
              <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4">
                <p className="text-sm text-red-600">Total WHT Deducted</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(whtData.total_wht_deducted)}</p>
              </div>
            </div>

            {/* WHT by Category */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">WHT by Category</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>WHT Category</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">WHT Deducted</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(whtData.categories).map(([cat, info]) => (
                    <TableRow key={cat}>
                      <TableCell className="font-medium">{cat}</TableCell>
                      <TableCell className="text-right">{info.rate}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(info.total_amount)}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">{formatCurrency(info.total_wht)}</TableCell>
                      <TableCell className="text-right">{info.count}</TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(whtData.categories).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No WHT transactions for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {Object.keys(whtData.categories).length > 0 && (
                  <tfoot className="bg-gray-50">
                    <TableRow>
                      <TableCell className="font-bold">Total</TableCell>
                      <TableCell className="text-right"></TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(whtData.total_amount)}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{formatCurrency(whtData.total_wht_deducted)}</TableCell>
                      <TableCell className="text-right font-bold">{whtData.transaction_count}</TableCell>
                    </TableRow>
                  </tfoot>
                )}
              </Table>
            </div>
          </div>
        </div>
      )}

      {!salesTaxData && !whtData && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Select period and click "Generate Report" to view Tax Reports</p>
        </div>
      )}
    </div>
  )
}
