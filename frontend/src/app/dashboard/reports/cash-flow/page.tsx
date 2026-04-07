"use client"

import { useState, useCallback } from "react"
import { Download, FileDown, Printer, Loader2 } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"

interface CashFlowItem {
  description: string
  amount: number
}

interface CashFlowSection {
  items: CashFlowItem[]
  total: number
}

interface CashFlowData {
  start_date: string
  end_date: string
  operating: CashFlowSection
  investing: CashFlowSection
  financing: CashFlowSection
  net_cash_flow: number
  opening_balance: number
  closing_balance: number
}

const REPORT_TITLE = "Cash Flow Statement"
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company"

export default function CashFlowReportPage() {
  const { toast } = useToast()
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<CashFlowData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get("/api/reports/cash-flow", {
        params: { start_date: startDate, end_date: endDate },
      })
      setData(response.data.data)
      if (!response.data.success) {
        setError(response.data.message || "Failed to generate report")
      }
    } catch (err: any) {
      console.error("Failed to generate report:", err)
      const msg = err.response?.data?.detail || "Failed to generate Cash Flow Statement"
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
    const headers = ["Section", "Description", "Amount (PKR)"]
    const rows: string[][] = []

    rows.push(["Opening Balance", "", data.opening_balance.toFixed(2)])
    rows.push([])

    rows.push(["OPERATING ACTIVITIES"])
    data.operating.items.forEach((item) => rows.push(["Operating", item.description, item.amount.toFixed(2)]))
    rows.push(["", "Net Cash from Operating", data.operating.total.toFixed(2)])
    rows.push([])

    rows.push(["INVESTING ACTIVITIES"])
    data.investing.items.forEach((item) => rows.push(["Investing", item.description, item.amount.toFixed(2)]))
    rows.push(["", "Net Cash from Investing", data.investing.total.toFixed(2)])
    rows.push([])

    rows.push(["FINANCING ACTIVITIES"])
    data.financing.items.forEach((item) => rows.push(["Financing", item.description, item.amount.toFixed(2)]))
    rows.push(["", "Net Cash from Financing", data.financing.total.toFixed(2)])
    rows.push([])

    rows.push(["Summary", "Net Change in Cash", data.net_cash_flow.toFixed(2)])
    rows.push(["Summary", "Closing Balance", data.closing_balance.toFixed(2)])

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cash-flow-${startDate}-to-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: "CSV file downloaded" })
  }, [data, startDate, endDate, toast])

  const renderSection = (title: string, section: CashFlowSection) => (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b print:mb-2 print:pb-1">
        {title}
      </h3>
      {section.items.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">No transactions</p>
      ) : (
        <div className="space-y-2">
          {section.items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-600">{item.description}</span>
              <span className={`font-medium ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                {item.amount >= 0 ? "+" : "-"}{formatCurrency(Math.abs(item.amount))}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between items-center mt-4 pt-4 border-t bg-gray-50 px-4 py-2 rounded print:bg-gray-100">
        <span className="font-semibold text-gray-900">Net {title}</span>
        <span className={`font-bold ${section.total >= 0 ? "text-green-600" : "text-red-600"}`}>
          {formatCurrency(section.total)}
        </span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader title={REPORT_TITLE} subtitle="Cash inflows and outflows" />

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
          <p className="mt-4 text-gray-500">Generating Cash Flow Statement...</p>
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

          <div className="p-6 space-y-8 print:p-4 print:space-y-4">
            {/* Opening Balance */}
            <div className="flex justify-between items-center pb-4 border-b">
              <span className="font-medium text-gray-700">Opening Cash Balance</span>
              <span className="font-bold text-gray-900">{formatCurrency(data.opening_balance)}</span>
            </div>

            {/* Operating Activities */}
            {renderSection("Operating Activities", data.operating)}

            {/* Investing Activities */}
            {renderSection("Investing Activities", data.investing)}

            {/* Financing Activities */}
            {renderSection("Financing Activities", data.financing)}

            {/* Summary */}
            <div className="border-t-2 border-gray-300 pt-6 space-y-3 print:pt-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Net Increase/(Decrease) in Cash</span>
                <span className={`font-bold text-lg ${data.net_cash_flow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(data.net_cash_flow)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Opening Balance</span>
                <span className="font-medium text-gray-900">{formatCurrency(data.opening_balance)}</span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 px-4 py-3 rounded-lg print:bg-blue-50">
                <span className="font-bold text-gray-900 text-lg">Closing Cash Balance</span>
                <span className="font-bold text-blue-600 text-xl">{formatCurrency(data.closing_balance)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!data && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Select date range and click "Generate Report" to view Cash Flow Statement</p>
        </div>
      )}
    </div>
  )
}
