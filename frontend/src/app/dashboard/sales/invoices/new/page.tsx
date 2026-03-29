"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Calculator } from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
}

interface Product {
  id: string
  name: string
  code: string
  sale_price: number
}

interface InvoiceItem {
  id: string
  product_id: string
  description: string
  quantity: number
  rate: number
  tax_rate: number
}

export default function NewInvoicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<InvoiceItem[]>([])
  
  // Form fields
  const [customerId, setCustomerId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [discount, setDiscount] = useState(0)

  // Auto-calculated values
  const [subtotal, setSubtotal] = useState(0)
  const [taxTotal, setTaxTotal] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchCustomers()
    fetchProducts()
    // Set default due date to 30 days from now
    const defaultDue = new Date()
    defaultDue.setDate(defaultDue.getDate() + 30)
    setDueDate(defaultDue.toISOString().split("T")[0])
  }, [])

  // Recalculate totals whenever items or discount change
  useEffect(() => {
    calculateTotals()
  }, [items, discount])

  const fetchCustomers = async () => {
    try {
      const response = await api.get("/api/customers")
      setCustomers(response.data.data || [])
    } catch (error: any) {
      console.error("Failed to fetch customers:", error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await api.get("/api/products")
      setProducts(response.data.data || [])
    } catch (error: any) {
      console.error("Failed to fetch products:", error)
    }
  }

  const calculateTotals = useCallback(() => {
    let newSubtotal = 0
    let newTaxTotal = 0

    items.forEach((item) => {
      const lineTotal = item.rate * item.quantity
      const lineTax = lineTotal * (item.tax_rate / 100)
      newSubtotal += lineTotal
      newTaxTotal += lineTax
    })

    setSubtotal(newSubtotal)
    setTaxTotal(newTaxTotal)
    setTotal(newSubtotal + newTaxTotal - discount)
  }, [items, discount])

  const addItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        product_id: "",
        description: "",
        quantity: 1,
        rate: 0,
        tax_rate: 0,
      },
    ])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Auto-fill rate when product is selected
    if (field === "product_id" && value) {
      const product = products.find((p) => p.id === value)
      if (product) {
        newItems[index].rate = product.sale_price
        newItems[index].description = product.name
      }
    }

    setItems(newItems)
  }

  const getItemTotal = (item: InvoiceItem) => {
    return item.rate * item.quantity
  }

  const getItemTax = (item: InvoiceItem) => {
    return getItemTotal(item) * (item.tax_rate / 100)
  }

  const handleSubmit = async (status: "draft" | "confirmed") => {
    if (!customerId) {
      toast({
        title: "Error",
        description: "Please select a customer",
        
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        
      })
      return
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.product_id) {
        toast({
          title: "Error",
          description: `Please select a product for item ${i + 1}`,
          
        })
        return
      }
      if (item.quantity <= 0) {
        toast({
          title: "Error",
          description: `Quantity must be positive for item ${i + 1}`,
          
        })
        return
      }
      if (item.rate < 0) {
        toast({
          title: "Error",
          description: `Rate cannot be negative for item ${i + 1}`,
          
        })
        return
      }
    }

    setIsLoading(true)

    try {
      // Prepare items for API
      const apiItems = items.map((item) => ({
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        tax_rate: item.tax_rate,
      }))

      // Create invoice
      const payload = {
        customer_id: customerId,
        date: new Date(date).toISOString(),
        due_date: new Date(dueDate).toISOString(),
        items: apiItems,
        notes: notes || null,
        discount: discount,
      }

      const response = await api.post("/api/invoices", payload)

      if (!response.data.success) {
        throw new Error("Failed to create invoice")
      }

      const invoiceId = response.data.data.id

      // If confirming, call confirm endpoint
      if (status === "confirmed") {
        await api.post(`/api/invoices/${invoiceId}/confirm`)
      }

      toast({
        title: "Success",
        description: status === "draft" ? "Invoice saved as draft" : "Invoice created and confirmed",
        
      })

      router.push("/dashboard/sales/invoices")
    } catch (error: any) {
      console.error("Failed to create invoice:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || error.response?.data?.message || "Failed to create invoice",
        
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/sales/invoices"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
          <p className="text-gray-500 mt-1">Create a new sales invoice</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Invoice Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="customer">Customer *</Label>
            <select
              id="customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            <Label htmlFor="date">Invoice Date *</Label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <Label htmlFor="dueDate">Due Date *</Label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Items Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Invoice Items</h2>
            <Button
              type="button"
              onClick={addItem}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">
                    Tax %
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(index, "product_id", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder="Item description"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                        min="1"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(index, "rate", parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.tax_rate}
                        onChange={(e) => updateItem(index, "tax_rate", parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(getItemTotal(item) + getItemTax(item))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calculator className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No items added. Click "Add Row" to add items to this invoice.</p>
            </div>
          )}
        </div>

        {/* Summary Section */}
        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax Total:</span>
              <span className="font-medium text-gray-900">{formatCurrency(taxTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Discount:</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-28 px-2 py-1 border border-gray-200 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-3">
              <span className="text-gray-900">Total:</span>
              <span className="text-blue-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes or terms..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
          <Button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={isLoading}
            className="px-6 bg-gray-600 hover:bg-gray-700 text-white"
          >
            {isLoading ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit("confirmed")}
            disabled={isLoading}
            className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? "Creating..." : "Confirm Invoice"}
          </Button>
          <Link
            href="/dashboard/sales/invoices"
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
