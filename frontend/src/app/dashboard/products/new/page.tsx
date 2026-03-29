"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { z } from "zod"
import api from "@/lib/api"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  code: z.string().min(1, "Product code is required"),
  category: z.string().optional(),
  description: z.string().optional(),
  sale_price: z.string().min(1, "Sale price is required"),
  purchase_price: z.string().min(1, "Purchase price is required"),
  tax_rate: z.string().optional(),
  unit: z.string().optional(),
  track_inventory: z.boolean().optional(),
  reorder_level: z.string().optional(),
})

type ProductFormData = z.infer<typeof productSchema>

const CATEGORIES = [
  "Electronics",
  "Clothing",
  "Food & Beverages",
  "Office Supplies",
  "Raw Materials",
  "Finished Goods",
  "Services",
  "Other",
]

const UNITS = [
  "unit",
  "piece",
  "kg",
  "g",
  "liter",
  "ml",
  "meter",
  "cm",
  "box",
  "pack",
  "dozen",
]

export default function NewProductPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({})
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    code: "",
    category: "",
    description: "",
    sale_price: "",
    purchase_price: "",
    tax_rate: "0",
    unit: "unit",
    track_inventory: true,
    reorder_level: "0",
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
    // Clear error when user starts typing
    if (errors[name as keyof ProductFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      // Validate form data
      const validatedData = productSchema.parse(formData)

      // Prepare payload for API
      const payload = {
        name: validatedData.name,
        code: validatedData.code,
        category: validatedData.category || null,
        sale_price: parseFloat(validatedData.sale_price),
        purchase_price: parseFloat(validatedData.purchase_price),
        tax_rate: parseFloat(validatedData.tax_rate || "0"),
        unit: validatedData.unit || "unit",
        track_inventory: validatedData.track_inventory,
        reorder_level: parseInt(validatedData.reorder_level || "0"),
      }

      const response = await api.post("/api/products", payload)

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Product created successfully",
          variant: "success",
        })
        router.push("/dashboard/products")
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof ProductFormData, string>> = {}
        error.errors.forEach((err: any) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof ProductFormData] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        console.error("Failed to create product:", error)
        toast({
          title: "Error",
          description: error.response?.data?.detail || "Failed to create product",
          variant: "error",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/products"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>
          <p className="text-gray-500 mt-1">Create a new product record</p>
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
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter product name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="code">
                Product Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g., PROD-001"
                className={errors.code ? "border-red-500" : ""}
              />
              {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="unit">Unit</Label>
              <select
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter product description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Pricing */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="purchase_price">
                Purchase Price (PKR) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="purchase_price"
                name="purchase_price"
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={handleChange}
                placeholder="0.00"
                className={errors.purchase_price ? "border-red-500" : ""}
              />
              {errors.purchase_price && (
                <p className="text-red-500 text-sm mt-1">{errors.purchase_price}</p>
              )}
            </div>

            <div>
              <Label htmlFor="sale_price">
                Sale Price (PKR) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sale_price"
                name="sale_price"
                type="number"
                step="0.01"
                value={formData.sale_price}
                onChange={handleChange}
                placeholder="0.00"
                className={errors.sale_price ? "border-red-500" : ""}
              />
              {errors.sale_price && (
                <p className="text-red-500 text-sm mt-1">{errors.sale_price}</p>
              )}
            </div>

            <div>
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                name="tax_rate"
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Inventory Settings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
              <input
                id="track_inventory"
                name="track_inventory"
                type="checkbox"
                checked={formData.track_inventory}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="track_inventory" className="mb-0 cursor-pointer">
                Track Inventory
              </Label>
            </div>

            <div>
              <Label htmlFor="reorder_level">Reorder Level</Label>
              <Input
                id="reorder_level"
                name="reorder_level"
                type="number"
                value={formData.reorder_level}
                onChange={handleChange}
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Alert when stock falls below this level
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
          <Button
            type="submit"
            disabled={isLoading}
            className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? "Creating..." : "Create Product"}
          </Button>
          <Link
            href="/dashboard/products"
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
