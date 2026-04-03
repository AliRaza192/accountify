"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, BarChart3 } from "lucide-react"
import { fetchBudget, fetchBudgetVsActual, type Budget, type BudgetVsActual } from "@/lib/api/budget"
import { useToast } from "@/components/ui/toaster"

export default function BudgetDetailPage({ params }: { params: { id: string } }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [budget, setBudget] = useState<Budget | null>(null)
  const [vsActual, setVsActual] = useState<BudgetVsActual | null>(null)

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [budgetData, vsData] = await Promise.all([
        fetchBudget(parseInt(params.id)),
        fetchBudgetVsActual(parseInt(params.id)).catch(() => null),
      ])
      setBudget(budgetData)
      setVsActual(vsData)
    } catch (error: any) {
      console.error("Failed to load budget:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load budget",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatPKR = (amount?: number) => {
    if (amount === undefined || amount === 0) return "PKR 0"
    return `PKR ${amount.toLocaleString("en-PK")}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!budget) {
    return (
      <div className="text-center py-12">
        <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">Budget not found</p>
        <Link href="/dashboard/budget">
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Budgets
          </button>
        </Link>
      </div>
    )
  }

  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/budget">
          <button className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{budget.name}</h1>
          <p className="text-gray-500 mt-1">Fiscal Year {budget.fiscal_year}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total Budget</p>
          <p className="text-2xl font-bold text-gray-900">{formatPKR(budget.total_amount)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Status</p>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Created</p>
          <p className="text-lg font-medium text-gray-900">
            {new Date(budget.created_at).toLocaleDateString("en-PK")}
          </p>
        </div>
      </div>

      {/* Budget Lines */}
      {budget.lines && budget.lines.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget Lines</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Account</th>
                  {months.map((m) => (
                    <th key={m} className="px-2 py-2 text-center text-xs font-medium text-gray-500 capitalize w-20">
                      {m}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {budget.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 font-medium">{line.account_code || line.account_id || "—"}</td>
                    {months.map((m) => (
                      <td key={m} className="px-2 py-2 text-right text-gray-600">
                        {(line as any)[m] ? formatPKR((line as any)[m]) : "—"}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right font-semibold">{formatPKR(line.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Budget vs Actual */}
      {vsActual && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Budget vs Actual
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Budgeted</p>
              <p className="text-xl font-bold text-blue-900">{formatPKR(vsActual.summary.total_budget)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Actual</p>
              <p className="text-xl font-bold text-green-900">{formatPKR(vsActual.summary.total_actual)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600">Utilization</p>
              <p className="text-xl font-bold text-purple-900">
                {vsActual.summary.utilization_percent.toFixed(1)}%
              </p>
            </div>
          </div>

          {vsActual.lines.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Account</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Budgeted</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Actual</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Variance</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Variance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vsActual.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{line.account_code || line.account_id}</td>
                      <td className="px-3 py-2 text-right">{formatPKR(line.budgeted)}</td>
                      <td className="px-3 py-2 text-right">{formatPKR(line.actual)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`flex items-center justify-end gap-1 ${line.variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {line.variance >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatPKR(Math.abs(line.variance))}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-medium ${line.variance_percent >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {line.variance_percent.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
