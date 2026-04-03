"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Shield, Plus, Users, Eye, Edit, Trash2, Lock } from "lucide-react"
import { fetchRoles, deleteRole, type Role } from "@/lib/api/roles"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"

export default function RolesListPage() {
  const { toast } = useToast()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      const data = await fetchRoles()
      setRoles(data)
    } catch (error: any) {
      console.error("Failed to load roles:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load roles",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRole(id)
      setRoles((prev) => prev.filter((r) => r.id !== id))
      setDeleteConfirm(null)
      toast({
        title: "Success",
        description: "Role deleted successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "error",
      })
    }
  }

  const formatPermissions = (perms: Record<string, string[]>) => {
    return Object.entries(perms)
      .map(([module, actions]) => `${module}: ${actions.join(", ")}`)
      .join(" | ")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-500 mt-1">Manage roles and their access levels</p>
        </div>
        <Link href="/dashboard/settings/roles/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </Link>
      </div>

      {/* Roles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-100">
            <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No roles found</p>
          </div>
        ) : (
          roles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{role.name}</h3>
                    {role.is_system && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Lock className="h-3 w-3" />
                        System Role
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {role.description && (
                <p className="text-sm text-gray-600">{role.description}</p>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="h-4 w-4" />
                <span>{role.user_count} users</span>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center gap-2">
                <Link href={`/dashboard/settings/roles/${role.id}`}>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                </Link>
                {!role.is_system && (
                  <>
                    <Link href={`/dashboard/settings/roles/${role.id}/edit`}>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                    </Link>
                    {deleteConfirm === role.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(role.id)}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        onClick={() => setDeleteConfirm(role.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
