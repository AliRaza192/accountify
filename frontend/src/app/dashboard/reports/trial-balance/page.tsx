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

const REPORT_TITLE = "Trial Balance"
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company"

export default function TrialBalanceReportPage() {
  const { toast } = useToast()
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<TrialBalanceData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get("/api/reports/trial-balance", {
        params: { date },
      })
      setData(response.data.data)
      if (!response.data.success) {
        setError(response.data.message || "Failed to generate report")
      }
    } catch (err: any) {
      console.error("Failed to generate report:", err)
      const msg = err.response?.data?.detail || "Failed to generate Trial Balance"
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
    if (!data?.data.length) return
    const headers = ["Account Code", "Account Name", "Type", "Debit", "Credit"]
    const rows = data.data.map((item) => [
      item.account_code,
      item.account_name,
      item.account_type,
      item.debit.toFixed(2),
      item.credit.toFixed(2),
    ])
    const totalDebits = data.data.reduce((s, i) => s + i.debit, 0)
    const totalCredits = data.data.reduce((s, i) => s + i.credit, 0)
    rows.push(["", "", "Totals", totalDebits.toFixed(2), totalCredits.toFixed(2)])

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `trial-balance-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: "CSV file downloaded" })
  }, [data, date, toast])

  const totalDebits = data?.data.reduce((sum, item) => sum + item.debit, 0) || 0
  const totalCredits = data?.data.reduce((sum, item) => sum + item.credit, 0) || 0
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

  return (
    <div className="space-y-6">
      <PageHeader title={REPORT_TITLE} subtitle="All accounts with debit and credit balances" />

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
          <p className="mt-4 text-gray-500">Generating Trial Balance...</p>
        </div>
      )}

      {/* Report Content */}
      {data && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
          <div className="p-6 border-b border-gray-100 print:p-4">
            <h2 className="text-xl font-bold text-gray-900 text-center">{COMPANY_NAME}</h2>
            <h3 className="text-lg font-semibold text-gray-700 text-center mt-1">{REPORT_TITLE}</h3>
            <p className="text-sm text-gray-500 text-center mt-1">
              As of {formatDate(date, "long")}
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="text-right">Debit (PKR)</TableHead>
                  <TableHead className="text-right">Credit (PKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No accounts with balances
                    </TableCell>
                  </TableRow>
                ) : (
                  data.data.map((item) => (
                    <TableRow key={item.account_code}>
                      <TableCell className="font-mono text-sm text-gray-600">{item.account_code}</TableCell>
                      <TableCell className="font-medium text-gray-900">{item.account_name}</TableCell>
                      <TableCell className="text-sm text-gray-500 capitalize">{item.account_type}</TableCell>
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
                  <TableCell colSpan={3} className="font-bold text-gray-900">Totals</TableCell>
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
          <div className={`p-4 border-t print:p-3 ${isBalanced ? "bg-green-50" : "bg-red-50"}`}>
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
