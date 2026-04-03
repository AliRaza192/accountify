"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, FileText, Calendar, Hash, Weight, Percent } from "lucide-react"
import { fetchBOM, activateBOM, type BOM } from "@/lib/api/manufacturing"
import { useToast } from "@/components/ui/toaster"

export default function BOMDetailPage({ params }: { params: { id: string } }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [bom, setBom] = useState<BOM | null>(null)

  useEffect(() => {
    loadBOM()
  }, [params.id])

  const loadBOM = async () => {
    try {
      const data = await fetchBOM(parseInt(params.id))
      setBom(data)
    } catch (error: any) {
      console.error("Failed to load BOM:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load BOM",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async () => {
    try {
      await activateBOM(parseInt(params.id))
      toast({ title: "Success", description: "BOM activated successfully" })
      loadBOM()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to activate BOM",
        variant: "error",
      })
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-PK")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!bom) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">BOM not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/manufacturing/bom">
            <button className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {bom.product_name || `Product #${bom.product_id}`} - v{bom.version}
            </h1>
            <p className="text-gray-500 mt-1">Bill of Materials</p>
          </div>
        </div>
        {bom.status === "draft" && (
          <button
            onClick={handleActivate}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
          >
            Activate BOM
          </button>
        )}
      </div>

      {/* BOM Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">BOM Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Product ID</p>
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <Hash className="h-4 w-4" />
              {bom.product_id}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Version</p>
            <p className="font-medium text-gray-900">{bom.version}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${
                bom.status === "active"
                  ? "bg-green-100 text-green-800"
                  : bom.status === "draft"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {bom.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Effective Date</p>
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(bom.effective_date)}
            </p>
          </div>
        </div>
        {bom.notes && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Notes</p>
            <p className="text-gray-700 mt-1">{bom.notes}</p>
          </div>
        )}
      </div>

      {/* Components */}
      {bom.lines && bom.lines.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Components</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Component</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Quantity</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Unit</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Waste %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bom.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400">{line.sequence}</td>
                    <td className="px-4 py-2 font-medium">
                      {line.component_name || `Component #${line.component_id}`}
                    </td>
                    <td className="px-4 py-2 text-center flex items-center justify-center gap-1">
                      <Weight className="h-3 w-3 text-gray-400" />
                      {line.quantity}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{line.unit}</span>
                    </td>
                    <td className="px-4 py-2 text-center flex items-center justify-center gap-1">
                      <Percent className="h-3 w-3 text-gray-400" />
                      {line.waste_percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
