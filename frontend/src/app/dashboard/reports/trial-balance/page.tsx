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

interface TrialBalanceItem {
  account_code: string
  account_name: string
  account_type: string
  debit: number
  credit: number
}

interface TrialBalanceData {
  data: TrialBalanceItem[]
  message: string
}

export default function TrialBalanceReportPage() {
  const { toast } = useToast()
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<TrialBalanceData | null>(null)

  const generateReport = async () => {
    setIsLoading(true)
    try {
      const response = await api.get("/api/reports/trial-balance", {
        params: { date },
      })
      setData(response.data.data)
    } catch (error: any) {
      console.error("Failed to generate report:", error)
      toast({
        title: "Error",
        description: "Failed to generate Trial Balance",
        
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

  const totalDebits = data?.data.reduce((sum, item) => sum + item.debit, 0) || 0
  const totalCredits = data?.data.reduce((sum, item) => sum + item.credit, 0) || 0
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trial Balance"
        subtitle="All accounts with debit and credit balances"
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

      {/* Report Content */}
      {data && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 text-center">Trial Balance</h2>
            <p className="text-sm text-gray-500 text-center mt-1">
              As of {new Date(date).toLocaleDateString()}
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No accounts with balances
                    </TableCell>
                  </TableRow>
                ) : (
                  data.data.map((item) => (
                    <TableRow key={item.account_code}>
                      <TableCell className="font-mono text-sm text-gray-600">{item.account_code}</TableCell>
                      <TableCell className="font-medium text-gray-900">{item.account_name}</TableCell>
                      <TableCell className="text-right">
                        {item.debit > 0 ? formatCurrency(item.debit) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.credit > 0 ? formatCurrency(item.credit) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <tfoot className="bg-gray-50">
                <TableRow>
                  <TableCell colSpan={2} className="font-bold text-gray-900">Totals:</TableCell>
                  <TableCell className="text-right font-bold text-gray-900">
                    {formatCurrency(totalDebits)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-gray-900">
                    {formatCurrency(totalCredits)}
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>

          {/* Balance Check */}
          <div className={`p-4 border-t ${isBalanced ? "bg-green-50" : "bg-red-50"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isBalanced ? "bg-green-500" : "bg-red-500"}`} />
                <span className={`font-medium ${isBalanced ? "text-green-800" : "text-red-800"}`}>
                  {isBalanced ? "Trial Balance is balanced" : "Trial Balance is NOT balanced"}
                </span>
              </div>
              <span className={`font-bold ${isBalanced ? "text-green-600" : "text-red-600"}`}>
                Difference: {formatCurrency(Math.abs(totalDebits - totalCredits))}
              </span>
            </div>
          </div>
        </div>
      )}

      {!data && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Select a date and click "Generate Report" to view Trial Balance</p>
        </div>
      )}
    </div>
  )
}
