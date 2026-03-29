"use client"

import { useState, useEffect } from "react"
import { Download } from "lucide-react"
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

interface Customer {
  id: string
  name: string
}

interface LedgerEntry {
  id: string
  date: string
  description: string
  reference: string
  debit: number
  credit: number
  balance: number
}

interface LedgerData {
  customer: Customer
  opening_balance: number
  entries: LedgerEntry[]
  closing_balance: number
}

export default function CustomerLedgerReportPage() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<LedgerData | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await api.get("/api/customers")
      setCustomers(response.data.data || [])
    } catch (error: any) {
      console.error("Failed to fetch customers:", error)
    }
  }

  const generateReport = async () => {
    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "error",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await api.get(`/api/reports/customer-ledger/${selectedCustomer}`, {
        params: { start_date: startDate, end_date: endDate },
      })
      setData(response.data.data)
    } catch (error: any) {
      console.error("Failed to generate report:", error)
      toast({
        title: "Error",
        description: "Failed to generate Customer Ledger",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Ledger"
        subtitle="Transaction history by customer"
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
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
            disabled={isLoading || !selectedCustomer}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            Generate Report
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="flex items-center gap-2"
            disabled={!data}
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Report Content */}
      {data && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 text-center">Customer Ledger</h2>
            <p className="text-sm text-gray-500 text-center mt-1">
              {data.customer.name}
            </p>
            <p className="text-xs text-gray-400 text-center mt-1">
              {new Date(data.start_date).toLocaleDateString()} - {new Date(data.end_date).toLocaleDateString()}
            </p>
          </div>

          <div className="p-6">
            {/* Opening Balance */}
            <div className="mb-4 pb-4 border-b">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Opening Balance</span>
                <span className={`font-bold ${data.opening_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(data.opening_balance)}
                  {data.opening_balance > 0 && " (Receivable)"}
                  {data.opening_balance < 0 && " (Payable)"}
                </span>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-gray-600">{formatDate(entry.date)}</TableCell>
                        <TableCell className="font-medium text-gray-900">{entry.description}</TableCell>
                        <TableCell className="text-gray-600">{entry.reference}</TableCell>
                        <TableCell className="text-right">
                          {entry.debit > 0 ? (
                            <span className="text-gray-900">{formatCurrency(entry.debit)}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.credit > 0 ? (
                            <span className="text-gray-900">{formatCurrency(entry.credit)}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${entry.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(Math.abs(entry.balance))}
                          {entry.balance > 0 && " Dr"}
                          {entry.balance < 0 && " Cr"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <tfoot className="bg-gray-50">
                  <TableRow>
                    <TableCell colSpan={5} className="font-bold text-gray-900 text-right">Closing Balance:</TableCell>
                    <TableCell className={`text-right font-bold text-lg ${data.closing_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(Math.abs(data.closing_balance))}
                      {data.closing_balance > 0 && " Dr"}
                      {data.closing_balance < 0 && " Cr"}
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          </div>
        </div>
      )}

      {!data && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Select a customer and date range, then click "Generate Report"</p>
        </div>
      )}
    </div>
  )
}
