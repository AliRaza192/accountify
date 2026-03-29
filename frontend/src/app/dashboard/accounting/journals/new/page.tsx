"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface Account {
  id: string
  code: string
  name: string
  account_type: string
}

interface JournalLine {
  id: string
  account_id: string
  description: string
  debit: number
  credit: number
}

export default function NewJournalEntryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [lines, setLines] = useState<JournalLine[]>([])

  // Form fields
  const [reference, setReference] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")

  // Calculated totals
  const [totalDebit, setTotalDebit] = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)

  useEffect(() => {
    fetchAccounts()
    // Generate auto reference
    const now = new Date()
    const ref = `JV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-001`
    setReference(ref)
    // Add two empty lines by default
    addLine()
    addLine()
  }, [])

  useEffect(() => {
    const debit = lines.reduce((sum, line) => sum + line.debit, 0)
    const credit = lines.reduce((sum, line) => sum + line.credit, 0)
    setTotalDebit(debit)
    setTotalCredit(credit)
  }, [lines])

  const fetchAccounts = async () => {
    try {
      const response = await api.get("/api/accounts")
      setAccounts(response.data.data || [])
    } catch (error: any) {
      console.error("Failed to fetch accounts:", error)
    }
  }

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: `line-${Date.now()}`,
        account_id: "",
        description: "",
        debit: 0,
        credit: 0,
      },
    ])
  }

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      toast({
        title: "Warning",
        description: "Journal entry must have at least 2 lines",
        
      })
      return
    }
    setLines(lines.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }
    setLines(newLines)
  }

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const handleSubmit = async (isPosted: boolean) => {
    if (!reference || !date || !description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        
      })
      return
    }

    if (lines.length < 2) {
      toast({
        title: "Error",
        description: "Journal entry must have at least 2 lines",
        
      })
      return
    }

    if (!isBalanced) {
      toast({
        title: "Error",
        description: `Debit and Credit must be equal. Difference: ${formatCurrency(Math.abs(totalDebit - totalCredit))}`,
        
      })
      return
    }

    // Validate each line has an account and either debit or credit
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.account_id) {
        toast({
          title: "Error",
          description: `Please select an account for line ${i + 1}`,
          
        })
        return
      }
      if (line.debit === 0 && line.credit === 0) {
        toast({
          title: "Error",
          description: `Line ${i + 1} must have either a debit or credit amount`,
          
        })
        return
      }
    }

    setIsLoading(true)

    try {
      const payload = {
        reference,
        date: new Date(date).toISOString(),
        description,
        is_posted: isPosted,
        lines: lines.map((line) => ({
          account_id: line.account_id,
          debit: line.debit,
          credit: line.credit,
          description: line.description || null,
        })),
      }

      const response = await api.post("/api/journals", payload)

      if (!response.data.success) {
        throw new Error("Failed to create journal entry")
      }

      // If posting, call the post endpoint
      if (isPosted) {
        const entryId = response.data.data.id
        await api.post(`/api/journals/${entryId}/post`)
      }

      toast({
        title: "Success",
        description: isPosted ? "Journal entry posted successfully" : "Journal entry saved as draft",
        
      })

      router.push("/dashboard/accounting/journals")
    } catch (error: any) {
      console.error("Failed to create journal entry:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || error.response?.data?.message || "Failed to create journal entry",
        
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/accounting/journals"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Journal Entry</h1>
          <p className="text-gray-500 mt-1">Record a general journal entry</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Entry Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="reference">Reference Number</Label>
            <input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="JV-20250101-001"
            />
          </div>

          <div>
            <Label htmlFor="date">Date *</Label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of entry"
              required
            />
          </div>
        </div>

        {/* Lines Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Entry Lines</h2>
            <Button
              type="button"
              onClick={addLine}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Line
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-40">Debit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-40">Credit</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, index) => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <select
                        value={line.account_id}
                        onChange={(e) => updateLine(index, "account_id", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Select account</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(index, "description", e.target.value)}
                        placeholder="Line description"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={line.debit}
                        onChange={(e) => updateLine(index, "debit", parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={line.credit}
                        onChange={(e) => updateLine(index, "credit", parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right font-medium text-gray-900">Totals:</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(totalDebit)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(totalCredit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Balance Warning */}
        {!isBalanced && (
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Entry is not balanced</p>
              <p className="text-sm text-yellow-700">
                Difference: {formatCurrency(Math.abs(totalDebit - totalCredit))}
              </p>
            </div>
          </div>
        )}

        {isBalanced && totalDebit > 0 && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="font-medium text-green-800">Entry is balanced</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
          <Button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isLoading || !isBalanced}
            className="px-6 bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isLoading || !isBalanced || totalDebit === 0}
            className="px-6 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {isLoading ? "Posting..." : "Post Entry"}
          </Button>
          <Link
            href="/dashboard/accounting/journals"
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
