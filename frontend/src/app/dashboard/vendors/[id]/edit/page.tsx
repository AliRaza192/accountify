"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { z } from "zod"
import api from "@/lib/api"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const vendorSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  ntn: z.string().optional(),
  strn: z.string().optional(),
  credit_limit: z.string().optional(),
  payment_terms: z.string().optional(),
  opening_balance: z.string().optional(),
})

type VendorFormData = z.infer<typeof vendorSchema>

interface Vendor {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  ntn: string | null
  credit_limit: number
  payment_terms: number
  balance: number
}

export default function EditVendorPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof VendorFormData, string>>>({})
  const [formData, setFormData] = useState<VendorFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    ntn: "",
    strn: "",
    credit_limit: "",
    payment_terms: "30",
    opening_balance: "0",
  })

  const vendorId = params.id as string

  useEffect(() => {
    if (vendorId) {
      fetchVendor()
    }
  }, [vendorId])

  const fetchVendor = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/api/vendors/${vendorId}`)
      const vendor: Vendor = response.data.data

      setFormData({
        name: vendor.name || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        address: vendor.address || "",
        ntn: vendor.ntn || "",
        strn: "",
        credit_limit: vendor.credit_limit?.toString() || "0",
        payment_terms: vendor.payment_terms?.toString() || "30",
        opening_balance: vendor.balance?.toString() || "0",
      })
    } catch (error: any) {
      console.error("Failed to fetch vendor:", error)
      toast({
        title: "Error",
        description: "Failed to load vendor details",
        variant: "error",
      })
      router.push("/dashboard/vendors")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name as keyof VendorFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrors({})

    try {
      // Validate form data
      const validatedData = vendorSchema.parse(formData)

      // Prepare payload for API
      const payload: Record<string, any> = {
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address || null,
        ntn: validatedData.ntn || null,
        credit_limit: parseFloat(validatedData.credit_limit || "0"),
        payment_terms: parseInt(validatedData.payment_terms || "30"),
      }

      const response = await api.put(`/api/vendors/${vendorId}`, payload)

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Vendor updated successfully",
          variant: "success",
        })
        router.push("/dashboard/vendors")
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof VendorFormData, string>> = {}
        error.errors.forEach((err: any) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof VendorFormData] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        console.error("Failed to update vendor:", error)
        toast({
          title: "Error",
          description: error.response?.data?.detail || "Failed to update vendor",
          variant: "error",
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/vendors" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(2)].map((_, j) => (
                  <div key={j}>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-10 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/vendors"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Vendor</h1>
          <p className="text-gray-500 mt-1">Update vendor information</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+92 300 1234567"
              />
            </div>

            <div>
              <Label htmlFor="ntn">NTN</Label>
              <Input
                id="ntn"
                name="ntn"
                value={formData.ntn}
                onChange={handleChange}
                placeholder="NTN number"
              />
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="address">Address</Label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter address"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Tax Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="strn">STRN</Label>
              <Input
                id="strn"
                name="strn"
                value={formData.strn}
                onChange={handleChange}
                placeholder="Sales Tax Registration Number"
              />
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="credit_limit">Credit Limit (PKR)</Label>
              <Input
                id="credit_limit"
                name="credit_limit"
                type="number"
                step="0.01"
                value={formData.credit_limit}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="payment_terms">Payment Terms (Days)</Label>
              <Input
                id="payment_terms"
                name="payment_terms"
                type="number"
                value={formData.payment_terms}
                onChange={handleChange}
                placeholder="30"
              />
            </div>

            <div>
              <Label htmlFor="opening_balance">Opening Balance (PKR)</Label>
              <Input
                id="opening_balance"
                name="opening_balance"
                type="number"
                step="0.01"
                value={formData.opening_balance}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
          <Button
            type="submit"
            disabled={isSaving}
            className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Link
            href="/dashboard/vendors"
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
