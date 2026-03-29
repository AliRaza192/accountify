"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Printer, CheckCircle, Plus, X } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"

interface InvoiceItem {
  id: string
  product_name: string
  product_code: string | null
  description: string | null
  quantity: number
  rate: number
  tax_rate: number
  tax_amount: number
  amount: number
}

interface Payment {
  id: string
  amount: number
  date: string
  method: string
  reference: string | null
  created_at: string
}

interface Invoice {
  id: string
  invoice_number: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  date: string
  due_date: string
  subtotal: number
  tax_total: number
  discount: number
  total: number
  amount_paid: number
  balance_due: number
  status: string
  notes: string | null
  items: InvoiceItem[]
  payments: Payment[]
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PaymentData) => Promise<void>
  balanceDue: number
}

interface PaymentData {
  amount: number
  date: string
  method: string
  reference: string
}

function PaymentModal({ isOpen, onClose, onSubmit, balanceDue }: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<PaymentData>({
    amount: balanceDue,
    date: new Date().toISOString().split("T")[0],
    method: "cash",
    reference: "",
  })

  useEffect(() => {
    setFormData((prev) => ({ ...prev, amount: balanceDue }))
  }, [balanceDue])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error("Failed to submit payment:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              max={balanceDue}
              step="0.01"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Balance due: {formatCurrency(balanceDue)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="card">Credit/Debit Card</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference (Optional)</label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Cheque #, Transaction ID, etc."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  partial: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
}

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const invoiceId = params.id as string

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice()
    }
  }, [invoiceId])

  const fetchInvoice = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/api/invoices/${invoiceId}`)
      setInvoice(response.data.data)
    } catch (error: any) {
      console.error("Failed to fetch invoice:", error)
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "error",
      })
      router.push("/dashboard/sales/invoices")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await api.post(`/api/invoices/${invoiceId}/confirm`)
      toast({
        title: "Success",
        description: "Invoice confirmed successfully",
        variant: "success",
      })
      fetchInvoice()
    } catch (error: any) {
      console.error("Failed to confirm invoice:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to confirm invoice",
        variant: "error",
      })
    } finally {
      setIsConfirming(false)
    }
  }

  const handlePayment = async (data: PaymentData) => {
    try {
      await api.post(`/api/invoices/${invoiceId}/payment`, {
        amount: data.amount,
        date: new Date(data.date).toISOString(),
        method: data.method,
        reference: data.reference || null,
      })
      toast({
        title: "Success",
        description: "Payment recorded successfully",
        variant: "success",
      })
      fetchInvoice()
    } catch (error: any) {
      console.error("Failed to record payment:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to record payment",
        variant: "error",
      })
      throw error
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/sales/invoices" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!invoice) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/sales/invoices"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors print:hidden"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            <p className="text-gray-500 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[invoice.status]}`}>
                {invoice.status}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {invoice.status === "draft" && (
            <Button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4" />
              {isConfirming ? "Confirming..." : "Confirm Invoice"}
            </Button>
          )}
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <Button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Record Payment
            </Button>
          )}
          <Button
            onClick={handlePrint}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Invoice Content - Printable */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 print:shadow-none print:border-0">
        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Invoice</h2>
            <p className="text-gray-600 mt-1">#{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <span className="text-sm text-gray-600">Invoice Date: </span>
              <span className="font-medium">{formatDate(invoice.date)}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Due Date: </span>
              <span className="font-medium">{formatDate(invoice.due_date)}</span>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Bill To</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-lg font-semibold text-gray-900">{invoice.customer_name}</p>
            {invoice.customer_email && (
              <p className="text-gray-600 mt-1">{invoice.customer_email}</p>
            )}
            {invoice.customer_phone && (
              <p className="text-gray-600">{invoice.customer_phone}</p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">Tax %</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.product_name}</p>
                    {item.description && item.description !== item.product_name && (
                      <p className="text-sm text-gray-500">{item.description}</p>
                    )}
                    {item.product_code && (
                      <p className="text-xs text-gray-400">Code: {item.product_code}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.tax_rate}%</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(item.amount + item.tax_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-full max-w-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax Total:</span>
              <span className="font-medium text-gray-900">{formatCurrency(invoice.tax_total)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="font-medium text-red-600">-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
              <span className="text-gray-900">Total:</span>
              <span className="text-blue-600">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount Paid:</span>
              <span className="font-medium text-green-600">{formatCurrency(invoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold bg-gray-50 px-3 py-2 rounded">
              <span className="text-gray-900">Balance Due:</span>
              <span className={invoice.balance_due > 0 ? "text-red-600" : "text-green-600"}>
                {formatCurrency(invoice.balance_due)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Notes</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          </div>
        )}

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Payment History</h3>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-2 text-gray-600">{formatDate(payment.date)}</td>
                    <td className="px-4 py-2 text-gray-600 capitalize">{payment.method}</td>
                    <td className="px-4 py-2 text-gray-600">{payment.reference || "-"}</td>
                    <td className="px-4 py-2 text-right font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handlePayment}
        balanceDue={invoice.balance_due}
      />
    </div>
  )
}
