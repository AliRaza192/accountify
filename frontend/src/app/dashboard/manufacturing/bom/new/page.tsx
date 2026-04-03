"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText, Calendar, Plus, Trash2, Loader2 } from "lucide-react"
import { createBOM, type CreateBOMData } from "@/lib/api/manufacturing"
import { useToast } from "@/components/ui/toaster"

interface BOMLineInput {
  component_code: string
  component_name: string
  quantity: number
  unit: string
  waste_percent: number
}

export default function NewBOMPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [productId, setProductId] = useState("")
  const [version, setVersion] = useState(1)
  const [effectiveDate, setEffectiveDate] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<BOMLineInput[]>([
    { component_code: "", component_name: "", quantity: 0, unit: "pcs", waste_percent: 0 }
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const addLine = () => {
    setLines([...lines, { component_code: "", component_name: "", quantity: 0, unit: "pcs", waste_percent: 0 }])
  }

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, field: keyof BOMLineInput, value: string | number) => {
    setLines((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!productId.trim()) newErrors.productId = "Product ID is required"
    if (version < 1) newErrors.version = "Version must be >= 1"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const data: CreateBOMData = {
        product_id: parseInt(productId),
        version,
        effective_date: effectiveDate || undefined,
        notes: notes || undefined,
        lines: lines.map((line, idx) => ({
          component_id: parseInt(line.component_code) || idx + 1,
          quantity: line.quantity,
          unit: line.unit,
          waste_percent: line.waste_percent,
          sequence: idx + 1,
        })),
      }
      await createBOM(data)
      toast({
        title: "Success",
        description: "BOM created successfully",
      })
      router.push("/dashboard/manufacturing/bom")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create BOM",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/manufacturing/bom">
          <button className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create BOM</h1>
          <p className="text-gray-500 mt-1">Define a new Bill of Materials</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BOM Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">BOM Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product ID *</label>
              <input
                type="number"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.productId ? "border-red-300" : "border-gray-200"
                }`}
                placeholder="e.g., 101"
              />
              {errors.productId && <p className="text-red-500 text-xs mt-1">{errors.productId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version *</label>
              <input
                type="number"
                value={version}
                onChange={(e) => setVersion(parseInt(e.target.value) || 1)}
                min="1"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.version ? "border-red-300" : "border-gray-200"
                }`}
              />
              {errors.version && <p className="text-red-500 text-xs mt-1">{errors.version}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Effective Date
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional notes..."
            />
          </div>
        </div>

        {/* BOM Lines */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Components</h2>
            <button
              type="button"
              onClick={addLine}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Component
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Component</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 w-24">Quantity</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 w-20">Unit</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 w-24">Waste %</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={line.component_name}
                        onChange={(e) => updateLine(idx, "component_name", e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                        placeholder="Component name"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded text-center"
                        min="0"
                        step="0.001"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={line.unit}
                        onChange={(e) => updateLine(idx, "unit", e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded bg-white"
                      >
                        <option value="pcs">pcs</option>
                        <option value="kg">kg</option>
                        <option value="ltr">ltr</option>
                        <option value="mtr">mtr</option>
                        <option value="sqft">sqft</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={line.waste_percent}
                        onChange={(e) => updateLine(idx, "waste_percent", parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded text-center"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
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
                <FileText className="h-4 w-4" />
                Create BOM
              </>
            )}
          </button>
          <Link href="/dashboard/manufacturing/bom">
            <button type="button" className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </Link>
        </div>
      </form>
    </div>
  )
}
