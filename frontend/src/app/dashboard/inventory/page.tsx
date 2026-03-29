"use client"

import { useEffect, useState } from "react"
import { Package, AlertTriangle, Plus, Search } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
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

interface InventoryItem {
  id: string
  product_id: string
  product_name: string
  product_code: string
  warehouse_id: string | null
  warehouse_name: string | null
  quantity: number
  reorder_level: number
  unit: string
  created_at: string
  updated_at: string
}

interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: StockAdjustmentData) => Promise<void>
  products: ProductOption[]
}

interface StockAdjustmentData {
  product_id: string
  quantity: number
  reason: string
  warehouse_id?: string
}

interface ProductOption {
  id: string
  name: string
  code: string
}

function StockAdjustmentModal({ isOpen, onClose, onSubmit, products }: StockAdjustmentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<StockAdjustmentData>({
    product_id: "",
    quantity: 0,
    reason: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSubmit(formData)
      onClose()
      setFormData({ product_id: "", quantity: 0, reason: "" })
    } catch (error) {
      console.error("Failed to submit adjustment:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Adjustment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity Adjustment (+ for add, - for remove)
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 10 or -5"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="e.g., Stock count adjustment, damaged goods, etc."
              required
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
              {isLoading ? "Submitting..." : "Submit Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const { toast } = useToast()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [filterLowStock, setFilterLowStock] = useState(false)

  useEffect(() => {
    fetchInventory()
    fetchProducts()
  }, [])

  const fetchInventory = async () => {
    try {
      setIsLoading(true)
      const response = await api.get("/api/inventory")
      setInventory(response.data.data || [])
    } catch (error: any) {
      console.error("Failed to fetch inventory:", error)
      toast({
        title: "Error",
        description: "Failed to load inventory",
        
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await api.get("/api/products")
      const productList = response.data.data || []
      setProducts(
        productList.map((p: any) => ({
          id: p.id,
          name: p.name,
          code: p.code,
        }))
      )
    } catch (error: any) {
      console.error("Failed to fetch products:", error)
    }
  }

  const handleAdjustment = async (data: StockAdjustmentData) => {
    try {
      await api.post("/api/inventory/adjustment", data)
      toast({
        title: "Success",
        description: "Stock adjustment recorded successfully",
        
      })
      fetchInventory()
    } catch (error: any) {
      console.error("Failed to submit adjustment:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to submit adjustment",
        
      })
      throw error
    }
  }

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      item.product_code.toLowerCase().includes(search.toLowerCase()) ||
      (item.warehouse_name && item.warehouse_name.toLowerCase().includes(search.toLowerCase()))

    const matchesLowStock = filterLowStock ? item.quantity < item.reorder_level : true

    return matchesSearch && matchesLowStock
  })

  const lowStockCount = inventory.filter((item) => item.quantity < item.reorder_level).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Track and manage your stock levels"
        action={{
          label: "Stock Adjustment",
          onClick: () => setShowAdjustmentModal(true),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name, code, or warehouse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              filterLowStock
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Low Stock ({lowStockCount})
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Product Name",
                    "Code",
                    "Warehouse",
                    "Quantity",
                    "Reorder Level",
                    "Unit",
                    "Status",
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
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filterLowStock ? "No low stock items" : "No inventory found"}
            </h3>
            <p className="text-gray-500">
              {filterLowStock
                ? "All items are above their reorder levels"
                : search
                ? "No items match your search criteria"
                : "Add products to start tracking inventory"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">Product Name</TableHead>
                  <TableHead className="font-medium">Code</TableHead>
                  <TableHead className="font-medium">Warehouse</TableHead>
                  <TableHead className="font-medium">Quantity</TableHead>
                  <TableHead className="font-medium">Reorder Level</TableHead>
                  <TableHead className="font-medium">Unit</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => {
                  const isLowStock = item.quantity < item.reorder_level
                  const isOutOfStock = item.quantity === 0

                  return (
                    <TableRow
                      key={item.id}
                      className={isLowStock ? "bg-red-50" : ""}
                    >
                      <TableCell className="font-medium text-gray-900">
                        {item.product_name}
                      </TableCell>
                      <TableCell className="text-gray-600">{item.product_code}</TableCell>
                      <TableCell className="text-gray-600">
                        {item.warehouse_name || "Main Warehouse"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${
                            isOutOfStock
                              ? "text-red-600"
                              : isLowStock
                              ? "text-orange-600"
                              : "text-gray-900"
                          }`}
                        >
                          {item.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">{item.reorder_level}</TableCell>
                      <TableCell className="text-gray-600">{item.unit}</TableCell>
                      <TableCell>
                        {isOutOfStock ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            In Stock
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        onSubmit={handleAdjustment}
        products={products}
      />
    </div>
  )
}
