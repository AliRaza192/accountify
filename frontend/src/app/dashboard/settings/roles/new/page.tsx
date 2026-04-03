"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Shield, Plus, ArrowLeft, Loader2, Check, X } from "lucide-react"
import { createRole, fetchPermissionModules, type CreateRoleData, type PermissionModule } from "@/lib/api/roles"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"

const PERMISSION_ACTIONS = ["create", "read", "update", "delete"]

export default function CreateRolePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [modulesLoading, setModulesLoading] = useState(false)
  const [modules, setModules] = useState<PermissionModule[]>([])
  const [roleName, setRoleName] = useState("")
  const [description, setDescription] = useState("")
  const [permissions, setPermissions] = useState<Record<string, string[]>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useState(() => {
    loadModules()
  })

  const loadModules = async () => {
    setModulesLoading(true)
    try {
      const data = await fetchPermissionModules()
      setModules(data)
    } catch (error: any) {
      console.error("Failed to load modules:", error)
      // Fallback to default modules
      setModules([
        { module: "users", actions: ["create", "read", "update", "delete"] },
        { module: "roles", actions: ["create", "read", "update", "delete"] },
        { module: "branches", actions: ["create", "read", "update", "delete"] },
        { module: "invoices", actions: ["create", "read", "update", "delete"] },
        { module: "bills", actions: ["create", "read", "update", "delete"] },
        { module: "reports", actions: ["read"] },
        { module: "settings", actions: ["read", "update"] },
      ])
    } finally {
      setModulesLoading(false)
    }
  }

  const togglePermission = (module: string, action: string) => {
    setPermissions((prev) => {
      const modulePerms = prev[module] || []
      const updated = modulePerms.includes(action)
        ? modulePerms.filter((a) => a !== action)
        : [...modulePerms, action]
      return { ...prev, [module]: updated }
    })
  }

  const toggleAllModulePermissions = (module: string) => {
    setPermissions((prev) => {
      const modulePerms = prev[module] || []
      if (modulePerms.length === PERMISSION_ACTIONS.length) {
        const { [module]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [module]: [...PERMISSION_ACTIONS] }
    })
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!roleName.trim()) newErrors.roleName = "Role name is required"
    const hasPermissions = Object.values(permissions).some((p) => p.length > 0)
    if (!hasPermissions) newErrors.permissions = "At least one permission is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const data: CreateRoleData = {
        name: roleName,
        description: description || undefined,
        permissions,
      }
      await createRole(data)
      toast({
        title: "Success",
        description: `Role "${roleName}" created successfully`,
      })
      router.push("/dashboard/settings/roles")
    } catch (error: any) {
      console.error("Failed to create role:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const totalPermissions = Object.values(permissions).reduce((sum, p) => sum + p.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings/roles">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Role</h1>
          <p className="text-gray-500 mt-1">Define a new role with specific permissions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Role Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Name *
              </label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.roleName ? "border-red-300" : "border-gray-200"
                }`}
                placeholder="e.g., Accountant"
              />
              {errors.roleName && <p className="text-red-500 text-xs mt-1">{errors.roleName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description"
              />
            </div>
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Permissions</h2>
            <span className="text-sm text-gray-500">
              {totalPermissions} permissions selected
            </span>
          </div>
          {errors.permissions && <p className="text-red-500 text-sm">{errors.permissions}</p>}

          {modulesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Module
                    </th>
                    {PERMISSION_ACTIONS.map((action) => (
                      <th key={action} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        {action}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      All
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {modules.map((mod) => {
                    const modulePerms = permissions[mod.module] || []
                    const allSelected = modulePerms.length === PERMISSION_ACTIONS.length
                    return (
                      <tr key={mod.module} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 capitalize">
                          {mod.module}
                        </td>
                        {PERMISSION_ACTIONS.map((action) => (
                          <td key={action} className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => togglePermission(mod.module, action)}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                                modulePerms.includes(action)
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                              }`}
                            >
                              {modulePerms.includes(action) ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleAllModulePermissions(mod.module)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              allSelected
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {allSelected ? "All" : "Select All"}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="px-6 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Create Role
              </>
            )}
          </Button>
          <Link href="/dashboard/settings/roles">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
