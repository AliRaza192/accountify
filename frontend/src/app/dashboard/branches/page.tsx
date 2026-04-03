"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, Plus, Search, Building2, Eye } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/toaster"
import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

export default function BranchesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchBranches()
  }, [search])

  const fetchBranches = async () => {
    try {
      setIsLoading(true)
      const response = await api.get("/api/branches")
      const data: Branch[] = response.data || []
      setBranches(data)
    } catch (error: any) {
      console.error("Failed to fetch branches:", error)
      toast({
        title: "Error",
        description: "Failed to load branches",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (branchId: number) => {
    try {
      await api.delete(`/api/branches/${branchId}`)
      toast({
        title: "Success",
        description: "Branch deactivated successfully",
      })
      fetchBranches()
      setDeleteConfirm(null)
    } catch (error: any) {
      console.error("Failed to delete branch:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to deactivate branch",
      })
    }
  }

  const filteredBranches = branches.filter((branch) => {
    if (!search) return true
    const lower = search.toLowerCase()
    return (
      branch.name.toLowerCase().includes(lower) ||
      branch.code.toLowerCase().includes(lower) ||
      (branch.address || "").toLowerCase().includes(lower)
    )
  })

  // Pagination
  const totalPages = Math.ceil(filteredBranches.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBranches = filteredBranches.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        subtitle="Manage your branch locations"
        action={{
          label: "New Branch",
          href: "/dashboard/branches/create",
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, code, or address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Branches Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  {["Code", "Name", "Address", "Phone", "Status", "Default", "Actions"].map((header) => (
                    <TableHead key={header}>
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <Building2 className="h-12 w-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No branches found</h3>
            <p className="text-gray-500 mb-4">
              {search ? "No branches match your search criteria" : "Get started by adding your first branch"}
            </p>
            {!search && (
              <Link
                href="/dashboard/branches/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Branch
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Code</TableHead>
                    <TableHead className="font-medium">Name</TableHead>
                    <TableHead className="font-medium">Address</TableHead>
                    <TableHead className="font-medium">Phone</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Default</TableHead>
                    <TableHead className="font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBranches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium text-gray-600">{branch.code}</TableCell>
                      <TableCell className="font-medium text-gray-900">{branch.name}</TableCell>
                      <TableCell className="text-gray-600 max-w-xs truncate">{branch.address || "-"}</TableCell>
                      <TableCell className="text-gray-600">{branch.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={branch.is_active ? "default" : "secondary"}>
                          {branch.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {branch.is_default && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/branches/${branch.id}`)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(branch.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deactivate"
                            disabled={branch.is_default}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredBranches.length)} of{" "}
                  {filteredBranches.length} branches
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
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
