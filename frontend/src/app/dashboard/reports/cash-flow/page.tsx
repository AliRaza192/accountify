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

export default function CashFlowReportPage() {
  const { toast } = useToast()
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<CashFlowData | null>(null)

  const generateReport = async () => {
    setIsLoading(true)
    try {
      const response = await api.get("/api/reports/cash-flow", {
        params: { start_date: startDate, end_date: endDate },
      })
      setData(response.data.data)
    } catch (error: any) {
      console.error("Failed to generate report:", error)
      toast({
        title: "Error",
        description: "Failed to generate Cash Flow Statement",
        
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
        title="Cash Flow Statement"
        subtitle="Cash inflows and outflows"
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

      {/* Report Content */}
      {data && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 text-center">Cash Flow Statement</h2>
            <p className="text-sm text-gray-500 text-center mt-1">
              {new Date(data.start_date).toLocaleDateString()} - {new Date(data.end_date).toLocaleDateString()}
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* Opening Balance */}
            <div className="flex justify-between items-center pb-4 border-b">
              <span className="font-medium text-gray-700">Opening Cash Balance</span>
              <span className="font-bold text-gray-900">{formatCurrency(data.opening_balance)}</span>
            </div>

            {/* Operating Activities */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                OPERATING ACTIVITIES
              </h3>
              <div className="space-y-2">
                {data.operating.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.description}</span>
                    <span className={`font-medium ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(Math.abs(item.amount))}
                      {item.amount < 0 && " (Out)"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t bg-gray-50 px-4 py-2 rounded">
                <span className="font-semibold text-gray-900">Net Cash from Operating</span>
                <span className={`font-bold ${data.operating.total >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(data.operating.total)}
                </span>
              </div>
            </div>

            {/* Investing Activities */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                INVESTING ACTIVITIES
              </h3>
              <div className="space-y-2">
                {data.investing.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.description}</span>
                    <span className={`font-medium ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(Math.abs(item.amount))}
                      {item.amount < 0 && " (Out)"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t bg-gray-50 px-4 py-2 rounded">
                <span className="font-semibold text-gray-900">Net Cash from Investing</span>
                <span className={`font-bold ${data.investing.total >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(data.investing.total)}
                </span>
              </div>
            </div>

            {/* Financing Activities */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                FINANCING ACTIVITIES
              </h3>
              <div className="space-y-2">
                {data.financing.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.description}</span>
                    <span className={`font-medium ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(Math.abs(item.amount))}
                      {item.amount < 0 && " (Out)"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t bg-gray-50 px-4 py-2 rounded">
                <span className="font-semibold text-gray-900">Net Cash from Financing</span>
                <span className={`font-bold ${data.financing.total >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(data.financing.total)}
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="border-t-2 border-gray-300 pt-6 space-y-3">
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
              <div className="flex justify-between items-center bg-blue-50 px-4 py-3 rounded-lg">
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
