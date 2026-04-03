"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, X, Package } from "lucide-react"
import { z } from "zod"
import api from "@/lib/api"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"

interface Branch {
  id: number
  name: string
  code: string
}

interface Product {
  id: number
  name: string
  code: string
  stock_quantity: number
}

interface TransferItem {
  id: string
  product_id: number | null
  quantity: number
  notes: string
}

const transferSchema = z.object({
  source_branch_id: z.number().min(1, "Source branch is required"),
  destination_branch_id: z.number().min(1, "Destination branch is required"),
  items: z.array(z.object({
    product_id: z.number().min(1, "Product is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
  })).min(1, "At least one item is required"),
})

export default function BranchTransferPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [sourceBranch, setSourceBranch] = useState<number>(0)
  const [destinationBranch, setDestinationBranch] = useState<number>(0)
  const [items, setItems] = useState<TransferItem[]>([
    { id: `item-${Date.now()}`, product_id: null, quantity: 1, notes: "" },
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [branchesRes, productsRes] = await Promise.all([
        api.get("/api/branches"),
        api.get("/api/products"),
      ])
      setBranches(branchesRes.data || [])
      setProducts(productsRes.data.data || productsRes.data || [])
    } catch (error: any) {
      console.error("Failed to fetch data:", error)
      toast({
        title: "Error",
        description: "Failed to load branches or products",
      })
    }
  }

  const addItem = () => {
    setItems([
      ...items,
      { id: `item-${Date.now()}`, product_id: null, quantity: 1, notes: "" },
    ])
  }

  const removeItem = (id: string) => {
    if (items.length === 1) {
      toast({
        title: "Error",
        description: "At least one item is required",
      })
      return
    }
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof TransferItem, value: number | string) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      const payload = {
        source_branch_id: sourceBranch,
        destination_branch_id: destinationBranch,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes || null,
        })),
      }

      const validated = transferSchema.parse({
        source_branch_id: payload.source_branch_id,
        destination_branch_id: payload.destination_branch_id,
        items: payload.items,
      })

      await api.post("/api/branches/transfer", validated)

      toast({
        title: "Success",
        description: "Branch transfer created successfully",
      })
      router.push("/dashboard/branches")
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err: any) => {
          const path = err.path.join(".")
          fieldErrors[path] = err.message
        })
        setErrors(fieldErrors)
      } else {
        console.error("Failed to create transfer:", error)
        toast({
          title: "Error",
          description: error.response?.data?.detail || "Failed to create transfer",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const isSameBranch = sourceBranch > 0 && destinationBranch > 0 && sourceBranch === destinationBranch

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/branches"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inter-Branch Transfer</h1>
          <p className="text-gray-500 mt-1">Transfer inventory between branches</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branch Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Branches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Branch <span className="text-red-500">*</span>
              </label>
              <select
                value={sourceBranch}
                onChange={(e) => setSourceBranch(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={0}>Select source branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
              {errors.source_branch_id && (
                <p className="text-red-500 text-sm mt-1">{errors.source_branch_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Branch <span className="text-red-500">*</span>
              </label>
              <select
                value={destinationBranch}
                onChange={(e) => setDestinationBranch(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={0}>Select destination branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id} disabled={branch.id === sourceBranch}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
              {errors.destination_branch_id && (
                <p className="text-red-500 text-sm mt-1">{errors.destination_branch_id}</p>
              )}
            </div>
          </div>
          {isSameBranch && (
            <p className="text-red-500 text-sm mt-2">Source and destination branches must be different</p>
          )}
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Transfer Items</h2>
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No items added yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={item.product_id || 0}
                      onChange={(e) => updateItem(item.id, "product_id", Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value={0}>Select product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.code}) - Stock: {product.stock_quantity}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                      placeholder="Optional notes"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
                      title="Remove item"
                    >
                      <X className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {errors.items && (
            <p className="text-red-500 text-sm mt-2">{errors.items}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={isLoading || isSameBranch || items.length === 0}
            className="px-6 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {isLoading ? "Creating Transfer..." : "Create Transfer"}
          </Button>
          <Link
            href="/dashboard/branches"
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
