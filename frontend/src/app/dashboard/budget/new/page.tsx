"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, DollarSign, Calendar, Plus, Trash2, Loader2 } from "lucide-react"
import { createBudget, type CreateBudgetData } from "@/lib/api/budget"
import { useToast } from "@/components/ui/toaster"

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

interface BudgetLineInput {
  account_code: string
  account_name: string
  months: Record<string, number>
}

export default function NewBudgetPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear())
  const [lines, setLines] = useState<BudgetLineInput[]>([
    { account_code: "", account_name: "", months: Object.fromEntries(MONTHS.map((m) => [m, 0])) }
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const addLine = () => {
    setLines([...lines, { account_code: "", account_name: "", months: Object.fromEntries(MONTHS.map((m) => [m, 0])) }])
  }

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const updateMonth = (lineIndex: number, month: string, value: number) => {
    setLines((prev) => {
      const updated = [...prev]
      updated[lineIndex] = {
        ...updated[lineIndex],
        months: { ...updated[lineIndex].months, [month]: value }
      }
      return updated
    })
  }

  const lineTotal = (line: BudgetLineInput) => {
    return Object.values(line.months).reduce((sum, val) => sum + val, 0)
  }

  const grandTotal = lines.reduce((sum, line) => sum + lineTotal(line), 0)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = "Budget name is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const data: CreateBudgetData = {
        fiscal_year: fiscalYear,
        name,
        lines: lines.map((line) => ({
          ...line.months,
          total: lineTotal(line),
        })),
      }
      await createBudget(data)
      toast({
        title: "Success",
        description: `Budget "${name}" created successfully`,
      })
      router.push("/dashboard/budget")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create budget",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Create Budget</h1>
          <p className="text-gray-500 mt-1">Set up a new annual budget</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Budget Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Budget Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? "border-red-300" : "border-gray-200"
                }`}
                placeholder="e.g., FY 2026 Operating Budget"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Fiscal Year
              </label>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Budget Lines */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Budget Lines</h2>
            <button
              type="button"
              onClick={addLine}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Account</th>
                  {MONTHS.map((m) => (
                    <th key={m} className="px-2 py-2 text-center text-xs font-medium text-gray-500 capitalize w-24">
                      {m}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={line.account_name}
                        onChange={(e) => {
                          const updated = [...lines]
                          updated[idx].account_name = e.target.value
                          setLines(updated)
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                        placeholder="Account name"
                      />
                    </td>
                    {MONTHS.map((m) => (
                      <td key={m} className="px-2 py-2">
                        <input
                          type="number"
                          value={line.months[m]}
                          onChange={(e) => updateMonth(idx, m, parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded text-right"
                          min="0"
                          step="0.01"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right font-medium">
                      PKR {lineTotal(line).toLocaleString("en-PK")}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td className="px-2 py-2" colSpan={1}>Grand Total</td>
                  <td className="px-2 py-2" colSpan={12}></td>
                  <td className="px-2 py-2 text-right">PKR {grandTotal.toLocaleString("en-PK")}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4" />
                Create Budget
              </>
            )}
          </button>
          <Link href="/dashboard/budget">
            <button type="button" className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </Link>
        </div>
      </form>
    </div>
  )
}
