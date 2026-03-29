"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Building, Printer, RefreshCw } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"

interface Product {
  id: string
  name: string
  code: string
  sale_price: number
  stock_quantity: number
  category: string | null
  tax_rate?: number
}

interface Customer {
  id: string
  name: string
}

interface CartItem {
  product: Product
  quantity: number
  rate: number
  tax_rate: number
}

interface ReceiptData {
  invoice_number: string
  date: string
  customer_name: string | null
  items: {
    product_name: string
    product_code: string
    quantity: number
    rate: number
    tax_rate: number
    amount: number
  }[]
  subtotal: number
  tax_total: number
  discount: number
  total: number
  payment_method: string
  notes: string | null
}

const CATEGORIES = ["All", "Electronics", "Clothing", "Food & Beverages", "Office Supplies", "Other"]

export default function POSPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [discount, setDiscount] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchCustomers()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault()
        clearCart()
      } else if (e.key === "F12") {
        e.preventDefault()
        if (cart.length > 0) {
          processSale()
        }
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [cart])

  const fetchProducts = async () => {
    try {
      const response = await api.get("/api/products")
      setProducts(response.data.data || [])
    } catch (error: any) {
      console.error("Failed to fetch products:", error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await api.get("/api/customers")
      setCustomers(response.data.data || [])
    } catch (error: any) {
      console.error("Failed to fetch customers:", error)
    }
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id)
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1)
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        rate: product.sale_price,
        tax_rate: product.tax_rate || 18,
      }])
    }
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(cart.map((item) =>
      item.product.id === productId ? { ...item, quantity } : item
    ))
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const clearCart = () => {
    setCart([])
    setSelectedCustomer("")
    setDiscount(0)
    setPaymentMethod("cash")
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory
    return matchesSearch && matchesCategory && product.stock_quantity > 0
  })

  const subtotal = cart.reduce((sum, item) => sum + (item.rate * item.quantity), 0)
  const taxTotal = cart.reduce((sum, item) => sum + ((item.rate * item.quantity) * (item.tax_rate / 100)), 0)
  const total = subtotal + taxTotal - discount

  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        
      })
      return
    }

    setIsProcessing(true)
    try {
      const items = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        rate: item.rate,
        tax_rate: item.tax_rate,
      }))

      const response = await api.post("/api/pos/sale", {
        customer_id: selectedCustomer || null,
        items,
        discount,
        payment_method: paymentMethod,
      })

      setReceipt(response.data.receipt)
      setShowReceiptModal(true)
      clearCart()

      toast({
        title: "Success",
        description: `Sale ${response.data.invoice_number} processed successfully`,
        
      })
    } catch (error: any) {
      console.error("Failed to process sale:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to process sale",
        
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Left Side - Product Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search and Filter */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products... (F2 for new sale)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left"
              >
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  <span className="text-4xl">📦</span>
                </div>
                <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{product.code}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-blue-600">{formatCurrency(product.sale_price)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    product.stock_quantity > 10
                      ? "bg-green-100 text-green-700"
                      : product.stock_quantity > 0
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {product.stock_quantity} in stock
                  </span>
                </div>
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Cart */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart
          </h2>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Cart is empty</p>
              <p className="text-sm mt-2">Click products to add to cart</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.product.name}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(item.rate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer (Optional)</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Walk-in Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount (PKR)</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
                  paymentMethod === "cash"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Banknote className="h-4 w-4" />
                <span className="text-sm">Cash</span>
              </button>
              <button
                onClick={() => setPaymentMethod("card")}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
                  paymentMethod === "card"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">Card</span>
              </button>
              <button
                onClick={() => setPaymentMethod("bank")}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
                  paymentMethod === "bank"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Building className="h-4 w-4" />
                <span className="text-sm">Bank</span>
              </button>
            </div>
          </div>

          {/* Totals */}
          <div className="pt-3 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">{formatCurrency(taxTotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="font-medium text-red-600">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span className="text-gray-900">Total:</span>
              <span className="text-blue-600">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3">
            <Button
              onClick={clearCart}
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Clear
            </Button>
            <Button
              onClick={processSale}
              disabled={isProcessing || cart.length === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processing..." : "Process Sale (F12)"}
            </Button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && receipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Sale Completed!</h3>
              <p className="text-sm text-gray-500">{receipt.invoice_number}</p>
            </div>

            {/* Receipt Content - Printable */}
            <div className="border-t border-b border-gray-200 py-4 space-y-2 print:border-none">
              {receipt.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.product_name} x {item.quantity}</span>
                  <span>{formatCurrency(item.amount)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(receipt.total)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Payment:</span>
                  <span className="capitalize">{receipt.payment_method}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handlePrint}
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                New Sale
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
