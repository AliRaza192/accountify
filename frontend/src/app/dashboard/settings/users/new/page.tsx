"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { UserPlus, ArrowLeft, Mail, User, Shield, Building2, Loader2 } from "lucide-react"
import { inviteUser, fetchRoles, type Role, type InviteUserData } from "@/lib/api/roles"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"

export default function InviteUserPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [rolesLoading, setRolesLoading] = useState(true)
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role_id: "",
    branch_id: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      const data = await fetchRoles()
      setRoles(data)
      if (data.length > 0) {
        setFormData((prev) => ({ ...prev, role_id: data[0].id }))
      }
    } catch (error: any) {
      console.error("Failed to load roles:", error)
      toast({
        title: "Error",
        description: "Failed to load roles",
        variant: "error",
      })
    } finally {
      setRolesLoading(false)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.email.trim()) newErrors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format"
    if (!formData.full_name.trim()) newErrors.full_name = "Full name is required"
    if (!formData.role_id) newErrors.role_id = "Role is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const data: InviteUserData = {
        email: formData.email,
        full_name: formData.full_name,
        role_id: formData.role_id,
      }
      if (formData.branch_id) {
        data.branch_id = formData.branch_id
      }
      await inviteUser(data)
      toast({
        title: "Success",
        description: `Invitation sent to ${formData.email}`,
      })
      router.push("/dashboard/settings/users")
    } catch (error: any) {
      console.error("Failed to invite user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings/users">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invite User</h1>
          <p className="text-gray-500 mt-1">Send an invitation to a new user</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="h-4 w-4 inline mr-1" />
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? "border-red-300" : "border-gray-200"
              }`}
              placeholder="user@company.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="h-4 w-4 inline mr-1" />
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.full_name ? "border-red-300" : "border-gray-200"
              }`}
              placeholder="John Doe"
            />
            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Shield className="h-4 w-4 inline mr-1" />
            Role
          </label>
          <select
            value={formData.role_id}
            onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
              errors.role_id ? "border-red-300" : "border-gray-200"
            }`}
          >
            <option value="">Select a role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {errors.role_id && <p className="text-red-500 text-xs mt-1">{errors.role_id}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Building2 className="h-4 w-4 inline mr-1" />
            Branch (Optional)
          </label>
          <select
            value={formData.branch_id}
            onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Branches</option>
            <option value="main">Main Branch</option>
          </select>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
          <Button
            type="submit"
            disabled={loading}
            className="px-6 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending Invitation...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Send Invitation
              </>
            )}
          </Button>
          <Link href="/dashboard/settings/users">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
