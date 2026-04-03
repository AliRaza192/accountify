"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Shield, ArrowLeft, Loader2, Check, X, Save } from "lucide-react"
import { fetchRole, updateRole, type Role, type CreateRoleData } from "@/lib/api/roles"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"

const PERMISSION_ACTIONS = ["create", "read", "update", "delete"]

export default function EditRolePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState<Record<string, string[]>>({})
  const [roleName, setRoleName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    loadRole()
  }, [params.id])

  const loadRole = async () => {
    try {
      const data = await fetchRole(params.id)
      setRole(data)
      setRoleName(data.name)
      setDescription(data.description || "")
      setPermissions(data.permissions || {})
    } catch (error: any) {
      console.error("Failed to load role:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load role",
        variant: "error",
      })
    } finally {
      setLoading(false)
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

  const handleSave = async () => {
    setSaving(true)
    try {
      const data: Partial<CreateRoleData> = {
        name: roleName,
        description: description || undefined,
        permissions,
      }
      await updateRole(params.id, data)
      toast({
        title: "Success",
        description: "Role updated successfully",
      })
      router.push("/dashboard/settings/roles")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  const totalPermissions = Object.values(permissions).reduce((sum, p) => sum + p.length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!role) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">Role not found</p>
        <Link href="/dashboard/settings/roles">
          <Button className="mt-4">Back to Roles</Button>
        </Link>
      </div>
    )
  }

  const modules = Object.keys(permissions).map((module) => ({
    module,
    actions: PERMISSION_ACTIONS,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings/roles">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Role</h1>
            <p className="text-gray-500 mt-1">{role.name}</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || role.is_system}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Role Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Role Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              disabled={role.is_system}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Permission Matrix</h2>
          <span className="text-sm text-gray-500">{totalPermissions} permissions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                {PERMISSION_ACTIONS.map((action) => (
                  <th key={action} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    {action}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">All</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {modules.map((mod) => {
                const modulePerms = permissions[mod.module] || []
                const allSelected = modulePerms.length === PERMISSION_ACTIONS.length
                return (
                  <tr key={mod.module} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 capitalize">{mod.module}</td>
                    {PERMISSION_ACTIONS.map((action) => (
                      <td key={action} className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission(mod.module, action)}
                          disabled={role.is_system}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-50 ${
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
                        disabled={role.is_system}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
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
      </div>
    </div>
  )
}
