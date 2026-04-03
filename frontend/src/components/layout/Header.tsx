"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Menu, Search, Bell, User, Settings, LogOut, Building2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import useAuth from "@/hooks/useAuth"
import api from "@/lib/api"

interface HeaderProps {
  title: string
  onMenuClick?: () => void
}

interface Branch {
  id: number
  name: string
  code: string
  is_default: boolean
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const { getUser, logout } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)

  const user = getUser()

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      const response = await api.get("/api/branches")
      const data: Branch[] = response.data || []
      setBranches(data)

      // Load selected branch from localStorage
      const storedId = localStorage.getItem("selected_branch_id")
      if (storedId) {
        const stored = parseInt(storedId, 10)
        const exists = data.find((b) => b.id === stored)
        if (exists) {
          setSelectedBranchId(stored)
          return
        }
      }

      // Default to default branch or first branch
      const defaultBranch = data.find((b) => b.is_default)
      if (defaultBranch) {
        setSelectedBranchId(defaultBranch.id)
        localStorage.setItem("selected_branch_id", String(defaultBranch.id))
      } else if (data.length > 0) {
        setSelectedBranchId(data[0].id)
        localStorage.setItem("selected_branch_id", String(data[0].id))
      }
    } catch (error: any) {
      console.error("Failed to fetch branches:", error)
    }
  }

  const handleBranchChange = (branchId: number) => {
    setSelectedBranchId(branchId)
    localStorage.setItem("selected_branch_id", String(branchId))
    setIsBranchDropdownOpen(false)
  }

  const selectedBranch = branches.find((b) => b.id === selectedBranchId)

  const handleLogout = () => {
    logout()
    setIsDropdownOpen(false)
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left: Menu & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900 hidden sm:block">{title}</h1>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-xl mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices, customers, reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Right: Branch Selector, Notifications & User */}
      <div className="flex items-center gap-2">
        {/* Branch Selector */}
        {branches.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
            >
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="text-gray-700 max-w-32 truncate">
                {selectedBranch?.name || "Select Branch"}
              </span>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>

            {isBranchDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsBranchDropdownOpen(false)}
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
        )}

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
              {user?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden md:block">
              {user?.full_name?.split(" ")[0] || "User"}
            </span>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name || "User"}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
                </div>
                <button
                  onClick={() => {
                    router.push("/settings")
                    setIsDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    router.push("/settings")
                    setIsDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
