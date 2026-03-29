"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, Plus, Search, Eye, Download, FileText } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Invoice {
  id: string
  invoice_number: string
  customer_name: string
  customer_id: string
  date: string
  due_date: string
  total: number
  amount_paid: number
  balance_due: number
  status: "draft" | "confirmed" | "paid" | "partial" | "cancelled"
  created_at: string
}

interface Customer {
  id: string
  name: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  partial: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
}

export default function InvoicesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filters
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [customerFilter, setCustomerFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [startDate, endDate, customerFilter, statusFilter])

  const fetchCustomers = async () => {
    try {
      const response = await api.get("/api/customers")
      setCustomers(response.data.data || [])
    } catch (error: any) {
      console.error("Failed to fetch customers:", error)
    }
  }

  const fetchInvoices = async () => {
    try {
      setIsLoading(true)
      const params: Record<string, string> = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      if (customerFilter) params.customer_id = customerFilter
      if (statusFilter) params.status_filter = statusFilter

      const response = await api.get("/api/invoices", { params })
      setInvoices(response.data.data || [])
    } catch (error: any) {
      console.error("Failed to fetch invoices:", error)
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (invoiceId: string) => {
    try {
      await api.delete(`/api/invoices/${invoiceId}`)
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
        variant: "success",
      })
      fetchInvoices()
      setDeleteConfirm(null)
    } catch (error: any) {
      console.error("Failed to delete invoice:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete invoice",
        variant: "error",
      })
    }
  }

  const handleDownloadPdf = async (invoiceId: string) => {
    try {
      const response = await api.get(`/api/invoices/${invoiceId}/pdf`)
      toast({
        title: "Info",
        description: "PDF generation coming soon",
        variant: "default",
      })
    } catch (error: any) {
      console.error("Failed to download PDF:", error)
    }
  }

  // Pagination
  const totalPages = Math.ceil(invoices.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedInvoices = invoices.slice(startIndex, endIndex)

  const clearFilters = () => {
    setStartDate("")
    setEndDate("")
    setCustomerFilter("")
    setStatusFilter("")
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Invoices"
        subtitle="Manage your sales invoices"
        action={{
          label: "New Invoice",
          href: "/dashboard/sales/invoices/new",
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex flex-wrap gap-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={customerFilter}
                onChange={(e) => {
                  setCustomerFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          {(startDate || endDate || customerFilter || statusFilter) && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Invoice #",
                    "Date",
                    "Customer",
                    "Due Date",
                    "Total",
                    "Paid",
                    "Balance",
                    "Status",
                    "Actions",
                  ].map((header) => (
                    <TableHead key={header}>
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(9)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500 mb-4">
              {startDate || endDate || customerFilter || statusFilter
                ? "No invoices match your filter criteria"
                : "Get started by creating your first invoice"}
            </p>
            {!startDate && !endDate && !customerFilter && !statusFilter && (
              <Link
                href="/dashboard/sales/invoices/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Invoice
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Invoice #</TableHead>
                    <TableHead className="font-medium">Date</TableHead>
                    <TableHead className="font-medium">Customer</TableHead>
                    <TableHead className="font-medium">Due Date</TableHead>
                    <TableHead className="font-medium">Total</TableHead>
                    <TableHead className="font-medium">Paid</TableHead>
                    <TableHead className="font-medium">Balance</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium text-blue-600">
                        <Link
                          href={`/dashboard/sales/invoices/${invoice.id}`}
                          className="hover:underline"
                        >
                          {invoice.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-gray-600">{formatDate(invoice.date)}</TableCell>
                      <TableCell className="text-gray-900">{invoice.customer_name}</TableCell>
                      <TableCell className="text-gray-600">{formatDate(invoice.due_date)}</TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell className="text-green-600">{formatCurrency(invoice.amount_paid)}</TableCell>
                      <TableCell className={`font-medium ${invoice.balance_due > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(invoice.balance_due)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            STATUS_COLORS[invoice.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/sales/invoices/${invoice.id}`}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {invoice.status === "draft" && (
                            <Link
                              href={`/dashboard/sales/invoices/${invoice.id}/edit`}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          )}
                          <button
                            onClick={() => handleDownloadPdf(invoice.id)}
                            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {invoice.status === "draft" && (
                            <button
                              onClick={() => setDeleteConfirm(invoice.id)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, invoices.length)} of {invoices.length} invoices
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Invoice?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. The invoice will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
