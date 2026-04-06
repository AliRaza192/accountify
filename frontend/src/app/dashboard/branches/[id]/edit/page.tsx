"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { z } from "zod"
import { fetchBranch, updateBranch, type Branch, type BranchUpdateData } from "@/lib/api/branches"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

const branchSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  code: z.string().min(1, "Code is required").max(20, "Code must be 20 characters or less"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
})

type BranchFormData = z.infer<typeof branchSchema>

export default function EditBranchPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const branchId = params.id as string
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof BranchFormData, string>>>({})
  const [formData, setFormData] = useState<BranchFormData>({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
    is_default: false,
    is_active: true,
  })
  const [originalBranch, setOriginalBranch] = useState<Branch | null>(null)

  useEffect(() => {
    loadBranch()
  }, [branchId])

  const loadBranch = async () => {
    try {
      setIsLoading(true)
      const branch = await fetchBranch(parseInt(branchId))
      setOriginalBranch(branch)
      setFormData({
        name: branch.name,
        code: branch.code,
        address: branch.address || "",
        phone: branch.phone || "",
        email: branch.email || "",
        is_default: branch.is_default,
        is_active: branch.is_active,
      })
    } catch (error: any) {
      console.error("Failed to load branch:", error)
      toast({
        title: "Error",
        description: "Failed to load branch details",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
    if (errors[name as keyof BranchFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      const validatedData = branchSchema.parse(formData)

      const payload: BranchUpdateData = {
        name: validatedData.name,
        code: validatedData.code,
        ...(validatedData.address ? { address: validatedData.address } : {}),
        ...(validatedData.phone ? { phone: validatedData.phone } : {}),
        ...(validatedData.email ? { email: validatedData.email } : {}),
        is_default: validatedData.is_default,
        is_active: validatedData.is_active,
      }

      await updateBranch(parseInt(branchId), payload)

      toast({
        title: "Success",
        description: "Branch updated successfully",
      })
      router.push(`/dashboard/branches/${branchId}`)
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof BranchFormData, string>> = {}
        error.errors.forEach((err: any) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof BranchFormData] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        console.error("Failed to update branch:", error)
        toast({
          title: "Error",
          description: error.response?.data?.detail || "Failed to update branch",
          variant: "error",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/dashboard/branches/${branchId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Edit Branch</h1>
          <p className="text-gray-500 mt-1">Update branch details</p>
        </div>
        {originalBranch && (
          <Badge variant={originalBranch.is_active ? "default" : "secondary"}>
            {originalBranch.is_active ? "Active" : "Inactive"}
          </Badge>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Branch Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Branch name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="code">
                Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g., BR001"
                className={errors.code ? "border-red-500" : ""}
              />
              {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Full branch address"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Contact phone number"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="branch@example.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                id="is_default"
                name="is_default"
                type="checkbox"
                checked={formData.is_default}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="is_default" className="text-sm font-medium text-gray-700 cursor-pointer">
                Set as default branch
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                Branch is active
              </Label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          <Link
            href={`/dashboard/branches/${branchId}`}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
