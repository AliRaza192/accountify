"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Pencil, Trash2, Building2, MapPin, Phone, Mail, Calendar, DollarSign, Percent } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/toaster"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Branch {
  id: number
  name: string
  code: string
  address: string | null
  phone: string | null
  email: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
}

interface BranchSettings {
  id: number
  branch_id: number
  price_list_id: number | null
  tax_rate: number
  currency: string
  fiscal_year_start: string
}

export default function BranchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const branchId = params.id as string
  const [branch, setBranch] = useState<Branch | null>(null)
  const [settings, setSettings] = useState<BranchSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchBranch()
  }, [branchId])

  const fetchBranch = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/api/branches/${branchId}`)
      setBranch(response.data)
      // Try to fetch settings if they exist
      try {
        const settingsRes = await api.get(`/api/branches/${branchId}/settings`)
        if (settingsRes.data) {
          setSettings(settingsRes.data)
        }
      } catch {
        // Settings may not exist yet
        setSettings(null)
      }
    } catch (error: any) {
      console.error("Failed to fetch branch:", error)
      toast({
        title: "Error",
        description: "Failed to load branch details",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!branch) return
    try {
      await api.delete(`/api/branches/${branch.id}`)
      toast({
        title: "Success",
        description: "Branch deactivated successfully",
      })
      router.push("/dashboard/branches")
    } catch (error: any) {
      console.error("Failed to delete branch:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to deactivate branch",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!branch) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard/branches"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Branch Not Found</h1>
          </div>
        </div>
      </div>
    )
  }

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
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{branch.name}</h1>
            <Badge variant={branch.is_active ? "default" : "secondary"}>
              {branch.is_active ? "Active" : "Inactive"}
            </Badge>
            {branch.is_default && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Default
              </Badge>
            )}
          </div>
          <p className="text-gray-500 mt-1">Branch code: {branch.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/branches/${branch.id}/edit`)}
            className="flex items-center gap-2"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2"
            disabled={branch.is_default}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Branch Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Branch Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-500">Branch Name</label>
              <p className="text-gray-900 mt-1">{branch.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Branch Code</label>
              <p className="text-gray-900 mt-1 font-mono">{branch.code}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </label>
              <p className="text-gray-900 mt-1">{branch.address || "No address provided"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </label>
              <p className="text-gray-900 mt-1">{branch.phone || "No phone provided"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <p className="text-gray-900 mt-1">{branch.email || "No email provided"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branch Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Branch Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settings ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Tax Rate
                </label>
                <p className="text-gray-900 mt-1 text-lg font-semibold">{settings.tax_rate}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Currency
                </label>
                <p className="text-gray-900 mt-1 text-lg font-semibold">{settings.currency}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fiscal Year Start
                </label>
                <p className="text-gray-900 mt-1 text-lg font-semibold">{settings.fiscal_year_start}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No settings configured yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Deactivate Branch?</h3>
            <p className="text-gray-600 mb-6">
              This will deactivate the branch. It will be removed from active listings but can be reactivated later.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
