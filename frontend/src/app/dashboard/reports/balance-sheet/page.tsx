"use client"

import { useState } from "react"
import { Download, FileDown } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
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

export default function BalanceSheetReportPage() {
  const { toast } = useToast()
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<BalanceSheetData | null>(null)

  const generateReport = async () => {
    setIsLoading(true)
    try {
      const response = await api.get("/api/reports/balance-sheet", {
        params: { date },
      })
      setData(response.data.data)
    } catch (error: any) {
      console.error("Failed to generate report:", error)
      toast({
        title: "Error",
        description: "Failed to generate Balance Sheet",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = (format: "pdf" | "excel") => {
    toast({
      title: "Info",
      description: `${format.toUpperCase()} export coming soon`,
      variant: "default",
    })
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Balance Sheet"
          subtitle="Assets, liabilities, and equity"
        />

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
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
              Generate Report
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <FileDown className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Select a date and click "Generate Report" to view Balance Sheet</p>
        </div>
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
      <PageHeader
        title="Balance Sheet"
        subtitle="Financial position statement"
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
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
            Generate Report
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Report Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <h2 className="text-lg font-bold text-blue-900">ASSETS</h2>
          </div>
          <div className="p-4 space-y-6">
            {/* Current Assets */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Current Assets</h3>
              <div className="space-y-2">
                {data.assets.items
                  .filter((item) => item.code.startsWith("11") || item.code.startsWith("12") || item.code.startsWith("13"))
                  .map((item) => (
                    <div key={item.code} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.balance)}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Fixed Assets */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Fixed Assets</h3>
              <div className="space-y-2">
                {data.assets.items
                  .filter((item) => item.code.startsWith("15"))
                  .map((item) => (
                    <div key={item.code} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.balance)}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">Total Assets</span>
                <span className="font-bold text-blue-600">{formatCurrency(totalAssets)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
          <div className="p-4 bg-red-50 border-b border-red-100">
            <h2 className="text-lg font-bold text-red-900">LIABILITIES & EQUITY</h2>
          </div>
          <div className="p-4 space-y-6">
            {/* Liabilities */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Liabilities</h3>
              <div className="space-y-2">
                {data.liabilities.items.map((item) => (
                  <div key={item.code} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-medium">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
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
              <div className="space-y-2">
                {data.equity.items.map((item) => (
                  <div key={item.code} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-medium">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Total Equity</span>
                  <span className="font-medium">{formatCurrency(totalEquity)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
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
      <div className={`p-4 rounded-xl ${isBalanced ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
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
