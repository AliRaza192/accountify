"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DollarSign, Plus, TrendingUp, TrendingDown, Calendar, FileText } from "lucide-react"
import { fetchBudgets, type Budget } from "@/lib/api/budget"
import { useToast } from "@/components/ui/toaster"

export default function BudgetDashboardPage() {
  const { toast } = useToast()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear())

  useEffect(() => {
    loadBudgets()
  }, [yearFilter])

  const loadBudgets = async () => {
    setLoading(true)
    try {
      const data = await fetchBudgets(yearFilter)
      setBudgets(data)
    } catch (error: any) {
      console.error("Failed to load budgets:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load budgets",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatPKR = (amount?: number) => {
    if (amount === undefined) return "PKR 0"
    return `PKR ${amount.toLocaleString("en-PK")}`
  }

  const totalBudget = budgets.reduce((sum, b) => sum + (b.total_amount || 0), 0)
  const draftCount = budgets.filter((b) => b.status === "draft").length
  const approvedCount = budgets.filter((b) => b.status === "approved").length

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
          <h1 className="text-2xl font-bold text-gray-900">Budget Management</h1>
          <p className="text-gray-500 mt-1">Plan and track budgets by department and period</p>
        </div>
        <Link href="/dashboard/budget/new">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="h-4 w-4" />
            Create Budget
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatPKR(totalBudget)}</p>
            <p className="text-sm text-gray-500">Total Budget</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
            <FileText className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{budgets.length}</p>
            <p className="text-sm text-gray-500">Total Budgets</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{draftCount}</p>
            <p className="text-sm text-gray-500">Draft</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingDown className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
            <p className="text-sm text-gray-500">Approved</p>
          </div>
        </div>
      </div>

      {/* Year Filter */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(parseInt(e.target.value))}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Budget List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {budgets.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No budgets found for {yearFilter}</p>
            <Link href="/dashboard/budget/new" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
              Create your first budget →
            </Link>
          </div>
        ) : (
          budgets.map((budget) => (
            <Link
              key={budget.id}
              href={`/dashboard/budget/${budget.id}`}
              className="block p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{budget.name}</h3>
                  <p className="text-sm text-gray-500">Fiscal Year {budget.fiscal_year}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatPKR(budget.total_amount)}</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${
                      budget.status === "draft"
                        ? "bg-yellow-100 text-yellow-800"
                        : budget.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {budget.status.charAt(0).toUpperCase() + budget.status.slice(1)}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
