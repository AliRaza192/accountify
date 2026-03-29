"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { PageHeader } from "@/components/ui/page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface OutstandingInvoice {
  id: string
  customer_name: string
  invoice_number: string
  invoice_date: string
  due_date: string
  amount: number
  paid: number
  balance: number
  days_overdue: number
}

interface OutstandingSummary {
  total_outstanding: number
  overdue: number
  due_this_week: number
  future: number
}

export default function OutstandingReceivablesPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<{ summary: OutstandingSummary; invoices: OutstandingInvoice[] } | null>(null)

  const generateReport = async () => {
    setIsLoading(true)
    try {
      const response = await api.get("/api/reports/outstanding-receivables")
      setData(response.data.data)
    } catch (error: any) {
      console.error("Failed to generate report:", error)
      toast({
        title: "Error",
        description: "Failed to load Outstanding Receivables",
        
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendReminder = (invoiceId: string, customerName: string) => {
    toast({
      title: "Info",
      description: `Payment reminder will be sent to ${customerName}`,
      
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outstanding Receivables"
        subtitle="Unpaid invoices and amounts due"
      />

      {/* Generate Button */}
      {!data && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500 mb-4">Click below to view outstanding receivables</p>
          <button
            onClick={generateReport}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading..." : "Generate Report"}
          </button>
        </div>
      )}

      {/* Report Content */}
      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm text-gray-600">Total Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.summary.total_outstanding)}</p>
            </div>
            <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4">
              <p className="text-sm text-red-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(data.summary.overdue)}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 p-4">
              <p className="text-sm text-yellow-600">Due This Week</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(data.summary.due_this_week)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-4">
              <p className="text-sm text-blue-600">Future Due</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.summary.future)}</p>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        No outstanding invoices
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.invoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className={invoice.days_overdue > 0 ? "bg-red-50" : ""}
                      >
                        <TableCell className="font-medium">{invoice.customer_name}</TableCell>
                        <TableCell className="text-blue-600">{invoice.invoice_number}</TableCell>
                        <TableCell className="text-gray-600">{formatDate(invoice.invoice_date)}</TableCell>
                        <TableCell className="text-gray-600">{formatDate(invoice.due_date)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(invoice.paid)}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">{formatCurrency(invoice.balance)}</TableCell>
                        <TableCell className="text-right">
                          {invoice.days_overdue > 0 ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              {invoice.days_overdue} days
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => handleSendReminder(invoice.id, invoice.customer_name)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Send Reminder"
                          >
                            <Bell className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
