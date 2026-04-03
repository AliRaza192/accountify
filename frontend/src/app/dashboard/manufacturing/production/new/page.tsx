"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Factory, Calendar, Loader2 } from "lucide-react"
import { createProductionOrder, fetchBOMs, type CreateProductionOrderData, type BOM } from "@/lib/api/manufacturing"
import { useToast } from "@/components/ui/toaster"

export default function NewProductionOrderPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [boms, setBoms] = useState<BOM[]>([])
  const [bomsLoading, setBomsLoading] = useState(true)
  const [formData, setFormData] = useState({
    bom_id: "",
    quantity: "",
    start_date: "",
    end_date: "",
    labor_rate: "",
    notes: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadBOMs()
  }, [])

  const loadBOMs = async () => {
    setBomsLoading(true)
    try {
      const data = await fetchBOMs("active")
      setBoms(data)
    } catch (error: any) {
      console.error("Failed to load BOMs:", error)
    } finally {
      setBomsLoading(false)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.bom_id) newErrors.bom_id = "BOM is required"
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = "Quantity must be greater than 0"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const data: CreateProductionOrderData = {
        bom_id: parseInt(formData.bom_id),
        quantity: parseFloat(formData.quantity),
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        labor_rate: formData.labor_rate ? parseFloat(formData.labor_rate) : undefined,
        notes: formData.notes || undefined,
      }
      await createProductionOrder(data)
      toast({
        title: "Success",
        description: "Production order created successfully",
      })
      router.push("/dashboard/manufacturing/production")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create production order",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/manufacturing/production">
          <button className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Production Order</h1>
          <p className="text-gray-500 mt-1">Start a new production run</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Factory className="h-4 w-4 inline mr-1" />
            Select BOM *
          </label>
          <select
            value={formData.bom_id}
            onChange={(e) => setFormData({ ...formData, bom_id: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
              errors.bom_id ? "border-red-300" : "border-gray-200"
            }`}
          >
            <option value="">Select a BOM</option>
            {boms.map((bom) => (
              <option key={bom.id} value={bom.id}>
                Product #{bom.product_id} - v{bom.version}
              </option>
            ))}
          </select>
          {errors.bom_id && <p className="text-red-500 text-xs mt-1">{errors.bom_id}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Production Quantity *
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.quantity ? "border-red-300" : "border-gray-200"
            }`}
            placeholder="e.g., 1000"
            min="0"
            step="0.001"
          />
          {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              Planned Start Date
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              Planned End Date
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Labor Rate (PKR/hour)
          </label>
          <input
            type="number"
            value={formData.labor_rate}
            onChange={(e) => setFormData({ ...formData, labor_rate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 500"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Production notes..."
          />
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Factory className="h-4 w-4" />
                Create Production Order
              </>
            )}
          </button>
          <Link href="/dashboard/manufacturing/production">
            <button type="button" className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </Link>
        </div>
      </form>
    </div>
  )
}
