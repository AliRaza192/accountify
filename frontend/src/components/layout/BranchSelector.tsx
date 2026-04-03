"use client"

import { useState, useEffect } from "react"
import { Building2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchBranches, type Branch } from "@/lib/api/branches"

interface BranchSelectorProps {
  className?: string
}

export default function BranchSelector({ className }: BranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBranches()
  }, [])

  const loadBranches = async () => {
    try {
      const data = await fetchBranches(true)
      setBranches(data)

      const storedId = localStorage.getItem("selected_branch_id")
      if (storedId) {
        const stored = parseInt(storedId, 10)
        const exists = data.find((b) => b.id === stored)
        if (exists) {
          setSelectedBranchId(stored)
          return
        }
      }

      const defaultBranch = data.find((b) => b.is_default)
      if (defaultBranch) {
        setSelectedBranchId(defaultBranch.id)
        localStorage.setItem("selected_branch_id", String(defaultBranch.id))
      } else if (data.length > 0) {
        setSelectedBranchId(data[0].id)
        localStorage.setItem("selected_branch_id", String(data[0].id))
      }
    } catch (error) {
      console.error("Failed to load branches:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleBranchChange = (branchId: number) => {
    setSelectedBranchId(branchId)
    localStorage.setItem("selected_branch_id", String(branchId))
    setIsOpen(false)
  }

  const selectedBranch = branches.find((b) => b.id === selectedBranchId)

  if (loading || branches.length === 0) {
    return null
  }

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
      >
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="text-gray-700 max-w-32 truncate">
          {selectedBranch?.name || "Select Branch"}
        </span>
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-in fade-in zoom-in-95">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase">Switch Branch</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => handleBranchChange(branch.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors",
                    selectedBranchId === branch.id ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  )}
                >
                  <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="font-medium truncate">{branch.name}</p>
                    <p className="text-xs text-gray-500">{branch.code}</p>
                  </div>
                  {branch.is_default && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
