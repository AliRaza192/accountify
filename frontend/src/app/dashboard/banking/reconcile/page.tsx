"use client"

import { useEffect, useState } from "react"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"

interface BankAccount {
  id: string
  name: string
  account_number: string
  bank_name: string
  balance: number
}

interface Transaction {
  id: string
  transaction_type: string
  amount: number
  date: string
  description: string
  reference: string | null
}

interface StatementEntry {
  id: string
  date: string
  description: string
  amount: number
  type: "debit" | "credit"
}

export default function BankReconciliationPage() {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [systemTransactions, setSystemTransactions] = useState<Transaction[]>([])
  const [statementEntries, setStatementEntries] = useState<StatementEntry[]>([])
  const [matchedIds, setMatchedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Statement entry form
  const [newEntry, setNewEntry] = useState<Omit<StatementEntry, "id">>({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: 0,
    type: "debit",
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      fetchUnreconciledTransactions()
    }
  }, [selectedAccount])

  const fetchAccounts = async () => {
    try {
      const response = await api.get("/api/banking")
      setAccounts(response.data.data || [])
      if (response.data.data && response.data.data.length > 0) {
        setSelectedAccount(response.data.data[0].id)
      }
    } catch (error: any) {
      console.error("Failed to fetch accounts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUnreconciledTransactions = async () => {
    if (!selectedAccount) return

    try {
      const response = await api.get(`/api/banking/${selectedAccount}/reconcile`)
      setSystemTransactions(response.data.data || [])
    } catch (error: any) {
      console.error("Failed to fetch transactions:", error)
    }
  }

  const addStatementEntry = () => {
    const entry: StatementEntry = {
      id: `stmt-${Date.now()}`,
      ...newEntry,
    }
    setStatementEntries([...statementEntries, entry])
    setNewEntry({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: 0,
      type: "debit",
    })
  }

  const removeStatementEntry = (id: string) => {
    setStatementEntries(statementEntries.filter((e) => e.id !== id))
    setMatchedIds(matchedIds.filter((m) => m !== id))
  }

  const matchTransaction = (txnId: string, stmtId: string) => {
    if (matchedIds.includes(stmtId)) {
      setMatchedIds(matchedIds.filter((id) => id !== stmtId))
    } else {
      setMatchedIds([...matchedIds, stmtId])
    }
  }

  const findMatchingStatement = (txn: Transaction) => {
    return statementEntries.find(
      (stmt) =>
        Math.abs(stmt.amount - txn.amount) < 0.01 &&
        !matchedIds.includes(stmt.id)
    )
  }

  const handleCompleteReconciliation = async () => {
    if (!selectedAccount) return

    try {
      await api.post(`/api/banking/${selectedAccount}/reconcile`, {
        transaction_ids: matchedIds,
      })
      toast({
        title: "Success",
        description: "Reconciliation completed successfully",
        
      })
      setMatchedIds([])
      setStatementEntries([])
      fetchUnreconciledTransactions()
    } catch (error: any) {
      console.error("Failed to complete reconciliation:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to complete reconciliation",
        
      })
    }
  }

  // Calculate reconciliation summary
  const systemTotal = systemTransactions.reduce((sum, txn) => sum + txn.amount, 0)
  const statementTotal = statementEntries.reduce((sum, stmt) => sum + stmt.amount, 0)
  const matchedTotal = matchedIds.reduce((sum, id) => {
    const entry = statementEntries.find((e) => e.id === id)
    return sum + (entry?.amount || 0)
  }, 0)
  const difference = systemTotal - matchedTotal

  const unmatchedSystem = systemTransactions.filter(
    (txn) => !findMatchingStatement(txn)
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Reconciliation"
        subtitle="Match your bank statement with system transactions"
      />

      {/* Account Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Bank Account</label>
        <select
          value={selectedAccount || ""}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.bank_name} - {account.name} (****{account.account_number.slice(-4)})
            </option>
          ))}
        </select>
      </div>

      {/* Reconciliation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-600">System Total</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(systemTotal)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-600">Statement Total</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(statementTotal)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-600">Matched</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(matchedTotal)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-600">Difference</p>
          <p className={`text-2xl font-bold ${difference === 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(Math.abs(difference))}
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Bank Statement */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Bank Statement Entries</h3>
            <p className="text-sm text-gray-500 mt-1">Enter transactions from your bank statement</p>
          </div>

          {/* Add Entry Form */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={newEntry.date}
                onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newEntry.type}
                onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value as "debit" | "credit" })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <input
              type="text"
              value={newEntry.description}
              onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
              placeholder="Description"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={newEntry.amount}
                onChange={(e) => setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) || 0 })}
                placeholder="Amount"
                step="0.01"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={addStatementEntry} className="bg-blue-600 hover:bg-blue-700 text-white">
                Add
              </Button>
            </div>
          </div>

          {/* Statement Entries List */}
          <div className="max-h-96 overflow-y-auto">
            {statementEntries.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No statement entries added
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statementEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={matchedIds.includes(entry.id) ? "bg-green-50" : ""}
                    >
                      <td className="px-4 py-2 text-sm text-gray-600">{formatDate(entry.date)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{entry.description}</td>
                      <td className={`px-4 py-2 text-sm text-right font-medium ${
                        entry.type === "credit" ? "text-green-600" : "text-red-600"
                      }`}>
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => removeStatementEntry(entry.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: System Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">System Transactions</h3>
            <p className="text-sm text-gray-500 mt-1">Unreconciled transactions from the system</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {systemTransactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No unreconciled transactions
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {systemTransactions.map((txn) => {
                    const matchingStmt = findMatchingStatement(txn)
                    const isMatched = matchedIds.some(
                      (id) => statementEntries.find((e) => e.id === id)?.amount === txn.amount
                    )

                    return (
                      <tr
                        key={txn.id}
                        className={isMatched ? "bg-green-50" : unmatchedSystem.includes(txn) ? "bg-red-50" : ""}
                      >
                        <td className="px-4 py-2 text-sm text-gray-600">{formatDate(txn.date)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div>
                            <p>{txn.description}</p>
                            {txn.reference && (
                              <p className="text-xs text-gray-500">Ref: {txn.reference}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                          {formatCurrency(txn.amount)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {matchingStmt && (
                            <button
                              onClick={() => matchTransaction(txn.id, matchingStmt.id)}
                              className={`p-1 rounded transition-colors ${
                                matchedIds.includes(matchingStmt.id)
                                  ? "text-green-600 bg-green-100"
                                  : "text-blue-600 hover:bg-blue-50"
                              }`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Complete Reconciliation Button */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-3">
          {difference !== 0 ? (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                Unreconciled difference: {formatCurrency(Math.abs(difference))}
              </span>
            </div>
          ) : matchedIds.length > 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">All items reconciled</span>
            </div>
          ) : null}
        </div>
        <Button
          onClick={handleCompleteReconciliation}
          disabled={matchedIds.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
        >
          Complete Reconciliation
        </Button>
      </div>
    </div>
  )
}
