"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { z } from "zod"
import api from "@/lib/api"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

const employeeSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  cnic: z.string().min(1, "CNIC is required"),
  designation: z.string().min(1, "Designation is required"),
  department: z.string().optional(),
  join_date: z.string().min(1, "Join date is required"),
  employee_type: z.enum(["permanent", "contract"]),
  basic_salary: z.string().min(1, "Basic salary is required"),
  house_rent_allowance: z.string().optional(),
  medical_allowance: z.string().optional(),
  other_allowance: z.string().optional(),
  eobi_rate: z.string().optional(),
  tax_rate: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

export default function NewEmployeePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof EmployeeFormData, string>>>({})
  const [formData, setFormData] = useState<EmployeeFormData>({
    full_name: "",
    email: "",
    phone: "",
    cnic: "",
    designation: "",
    department: "",
    join_date: new Date().toISOString().split("T")[0],
    employee_type: "permanent",
    basic_salary: "",
    house_rent_allowance: "0",
    medical_allowance: "0",
    other_allowance: "0",
    eobi_rate: "1",
    tax_rate: "0",
    bank_name: "",
    bank_account_number: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof EmployeeFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      const validatedData = employeeSchema.parse(formData)

      const payload = {
        full_name: validatedData.full_name,
        email: validatedData.email,
        phone: validatedData.phone,
        cnic: validatedData.cnic,
        designation: validatedData.designation,
        department: validatedData.department || null,
        join_date: new Date(validatedData.join_date).toISOString(),
        employee_type: validatedData.employee_type,
        basic_salary: parseFloat(validatedData.basic_salary),
        house_rent_allowance: parseFloat(validatedData.house_rent_allowance || "0"),
        medical_allowance: parseFloat(validatedData.medical_allowance || "0"),
        other_allowance: parseFloat(validatedData.other_allowance || "0"),
        eobi_rate: parseFloat(validatedData.eobi_rate || "1"),
        tax_rate: parseFloat(validatedData.tax_rate || "0"),
        bank_name: validatedData.bank_name || null,
        bank_account_number: validatedData.bank_account_number || null,
      }

      const response = await api.post("/api/payroll/employees", payload)

      if (response.data.id) {
        toast({
          title: "Success",
          description: "Employee created successfully",
          variant: "success",
        })
        router.push("/dashboard/payroll")
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof EmployeeFormData, string>> = {}
        error.errors.forEach((err: any) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof EmployeeFormData] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        console.error("Failed to create employee:", error)
        toast({
          title: "Error",
          description: error.response?.data?.detail || "Failed to create employee",
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
        <Link href="/dashboard/payroll" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Employee</h1>
          <p className="text-gray-500 mt-1">Create a new employee record</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Personal Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone">Phone *</Label>
              <input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <Label htmlFor="cnic">CNIC *</Label>
              <input
                id="cnic"
                name="cnic"
                value={formData.cnic}
                onChange={handleChange}
                placeholder="00000-0000000-0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.cnic && <p className="text-red-500 text-sm mt-1">{errors.cnic}</p>}
            </div>
          </div>
        </div>

        {/* Employment Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Employment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="designation">Designation *</Label>
              <input
                id="designation"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.designation && <p className="text-red-500 text-sm mt-1">{errors.designation}</p>}
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="join_date">Join Date *</Label>
              <input
                id="join_date"
                name="join_date"
                type="date"
                value={formData.join_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.join_date && <p className="text-red-500 text-sm mt-1">{errors.join_date}</p>}
            </div>

            <div>
              <Label htmlFor="employee_type">Employee Type *</Label>
              <select
                id="employee_type"
                name="employee_type"
                value={formData.employee_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="permanent">Permanent</option>
                <option value="contract">Contract</option>
              </select>
            </div>
          </div>
        </div>

        {/* Salary Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Salary Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="basic_salary">Basic Salary (PKR) *</Label>
              <input
                id="basic_salary"
                name="basic_salary"
                type="number"
                step="0.01"
                value={formData.basic_salary}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.basic_salary && <p className="text-red-500 text-sm mt-1">{errors.basic_salary}</p>}
            </div>

            <div>
              <Label htmlFor="house_rent_allowance">House Rent Allowance</Label>
              <input
                id="house_rent_allowance"
                name="house_rent_allowance"
                type="number"
                step="0.01"
                value={formData.house_rent_allowance}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="medical_allowance">Medical Allowance</Label>
              <input
                id="medical_allowance"
                name="medical_allowance"
                type="number"
                step="0.01"
                value={formData.medical_allowance}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="other_allowance">Other Allowance</Label>
              <input
                id="other_allowance"
                name="other_allowance"
                type="number"
                step="0.01"
                value={formData.other_allowance}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="eobi_rate">EOBI Rate (%)</Label>
              <input
                id="eobi_rate"
                name="eobi_rate"
                type="number"
                step="0.01"
                value={formData.eobi_rate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="tax_rate">Income Tax Rate (%)</Label>
              <input
                id="tax_rate"
                name="tax_rate"
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Bank Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bank_name">Bank Name</Label>
              <input
                id="bank_name"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="bank_account_number">Account Number</Label>
              <input
                id="bank_account_number"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
          <Button type="submit" disabled={isLoading} className="px-6 bg-blue-600 hover:bg-blue-700 text-white">
            {isLoading ? "Creating..." : "Create Employee"}
          </Button>
          <Link href="/dashboard/payroll" className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
