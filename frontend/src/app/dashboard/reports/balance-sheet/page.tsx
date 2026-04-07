"use client"

import { useState, useCallback } from "react"
import { Download, FileDown, Printer, Loader2 } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"

interface BalanceSheetItem {
  name: string
  code: string
  balance: number
}

interface BalanceSheetSection {
  total: number
  items: BalanceSheetItem[]
}

interface BalanceSheetData {
  date: string
  assets: BalanceSheetSection
  liabilities: BalanceSheetSection
  equity: BalanceSheetSection
}

const REPORT_TITLE = "Balance Sheet"
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company"

export default function BalanceSheetReportPage() {
  const { toast } = useToast()
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<BalanceSheetData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get("/api/reports/balance-sheet", {
        params: { date },
      })
      setData(response.data.data)
      if (!response.data.success) {
        setError(response.data.message || "Failed to generate report")
      }
    } catch (err: any) {
      console.error("Failed to generate report:", err)
      const msg = err.response?.data?.detail || "Failed to generate Balance Sheet"
      setError(msg)
      toast({
        title: "Error",
        description: msg,
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }, [date, toast])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleExportCSV = useCallback(() => {
    if (!data) return
    const headers = ["Section", "Account Code", "Account Name", "Amount (PKR)"]
    const rows: string[][] = []

    rows.push(["ASSETS"])
    data.assets.items.forEach((item) => rows.push(["Asset", item.code, item.name, item.balance.toFixed(2)]))
    rows.push(["", "", "Total Assets", data.assets.total.toFixed(2)])
    rows.push([])

    rows.push(["LIABILITIES"])
    data.liabilities.items.forEach((item) => rows.push(["Liability", item.code, item.name, item.balance.toFixed(2)]))
    rows.push(["", "", "Total Liabilities", data.liabilities.total.toFixed(2)])
    rows.push([])

    rows.push(["EQUITY"])
    data.equity.items.forEach((item) => rows.push(["Equity", item.code, item.name, item.balance.toFixed(2)]))
    rows.push(["", "", "Total Equity", data.equity.total.toFixed(2)])

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `balance-sheet-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: "CSV file downloaded" })
  }, [data, date, toast])

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title={REPORT_TITLE} subtitle="Assets, liabilities, and equity" />

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 print:hidden">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-4 text-gray-500">Generating Balance Sheet...</p>
          </div>
        )}

        {!isLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-500">Select a date and click "Generate Report" to view Balance Sheet</p>
          </div>
        )}
      </div>
    )
  }

  const totalAssets = data.assets.total
  const totalLiabilities = data.liabilities.total
  const totalEquity = data.equity.total
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01

  return (
    <div className="space-y-6">
      <PageHeader title={REPORT_TITLE} subtitle="Financial position statement" />

      {/* Filters - hide when printing */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
            <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* Report Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border-0 print:p-4">
        <h2 className="text-xl font-bold text-gray-900 text-center">{COMPANY_NAME}</h2>
        <h3 className="text-lg font-semibold text-gray-700 text-center mt-1">{REPORT_TITLE}</h3>
        <p className="text-sm text-gray-500 text-center mt-1">As of {formatDate(date, "long")}</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
        {/* Assets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
          <div className="p-4 bg-blue-50 border-b border-blue-100 print:bg-blue-50 print:border-blue-200">
            <h2 className="text-lg font-bold text-blue-900">ASSETS</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Current Assets */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Current Assets</h3>
              <div className="space-y-1">
                {data.assets.items
                  .filter((item) => item.code.startsWith("11") || item.code.startsWith("12") || item.code.startsWith("13"))
                  .map((item) => (
                    <div key={item.code} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.name} <span className="text-gray-400 font-mono text-xs">({item.code})</span></span>
                      <span className="font-medium">{formatCurrency(item.balance)}</span>
                    </div>
                  ))}
                {data.assets.items.filter((item) => item.code.startsWith("11") || item.code.startsWith("12") || item.code.startsWith("13")).length === 0 && (
                  <p className="text-sm text-gray-400">No current assets</p>
                )}
              </div>
            </div>

            {/* Fixed Assets */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Fixed Assets</h3>
              <div className="space-y-1">
                {data.assets.items
                  .filter((item) => item.code.startsWith("15") || item.code.startsWith("14"))
                  .map((item) => (
                    <div key={item.code} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.name} <span className="text-gray-400 font-mono text-xs">({item.code})</span></span>
                      <span className="font-medium">{formatCurrency(item.balance)}</span>
                    </div>
                  ))}
                {data.assets.items.filter((item) => item.code.startsWith("15") || item.code.startsWith("14")).length === 0 && (
                  <p className="text-sm text-gray-400">No fixed assets</p>
                )}
              </div>
            </div>

            {/* Other Assets */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Other Assets</h3>
              <div className="space-y-1">
                {data.assets.items
                  .filter((item) => !item.code.startsWith("11") && !item.code.startsWith("12") && !item.code.startsWith("13") && !item.code.startsWith("15") && !item.code.startsWith("14"))
                  .map((item) => (
                    <div key={item.code} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.name} <span className="text-gray-400 font-mono text-xs">({item.code})</span></span>
                      <span className="font-medium">{formatCurrency(item.balance)}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">Total Assets</span>
                <span className="font-bold text-blue-600">{formatCurrency(totalAssets)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
          <div className="p-4 bg-red-50 border-b border-red-100 print:bg-red-50 print:border-red-200">
            <h2 className="text-lg font-bold text-red-900">LIABILITIES & EQUITY</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Liabilities */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Liabilities</h3>
              <div className="space-y-1">
                {data.liabilities.items.map((item) => (
                  <div key={item.code} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name} <span className="text-gray-400 font-mono text-xs">({item.code})</span></span>
                    <span className="font-medium">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
                {data.liabilities.items.length === 0 && (
                  <p className="text-sm text-gray-400">No liabilities</p>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Total Liabilities</span>
                  <span className="font-medium">{formatCurrency(totalLiabilities)}</span>
                </div>
              </div>
            </div>

            {/* Equity */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Equity</h3>
              <div className="space-y-1">
                {data.equity.items.map((item) => (
                  <div key={item.code} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name} <span className="text-gray-400 font-mono text-xs">({item.code})</span></span>
                    <span className="font-medium">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
                {data.equity.items.length === 0 && (
                  <p className="text-sm text-gray-400">No equity entries</p>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Total Equity</span>
                  <span className="font-medium">{formatCurrency(totalEquity)}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">Total Liabilities & Equity</span>
                <span className={`font-bold ${isBalanced ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(totalLiabilitiesAndEquity)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Check */}
      <div className={`p-4 rounded-xl print:p-3 ${isBalanced ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isBalanced ? "bg-green-500" : "bg-red-500"}`} />
            <span className={`font-medium ${isBalanced ? "text-green-800" : "text-red-800"}`}>
              {isBalanced ? "Balance Sheet is balanced" : "Balance Sheet is NOT balanced"}
            </span>
          </div>
          <span className={`font-bold ${isBalanced ? "text-green-600" : "text-red-600"}`}>
            Difference: {formatCurrency(Math.abs(totalAssets - totalLiabilitiesAndEquity))}
          </span>
        </div>
      </div>
    </div>
  )
}
