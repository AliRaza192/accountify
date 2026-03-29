"use client"

import { useEffect, useState } from "react"
import { Plus, Building, Search, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface BankAccount {
  id: string
  name: string
  account_number: string
  bank_name: string
  balance: number
  currency: string
}

interface Transaction {
  id: string
  transaction_type: string
  amount: number
  date: string
  description: string
  reference: string | null
  is_reconciled: boolean
  running_balance: number
}

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TransactionData) => Promise<void>
  accountId: string | null
}

interface TransactionData {
  transaction_type: string
  amount: number
  date: string
  description: string
  reference: string
}

function TransactionModal({ isOpen, onClose, onSubmit, accountId }: TransactionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<TransactionData>({
    transaction_type: "deposit",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId) return
    
    setIsLoading(true)
    try {
      await onSubmit({ ...formData, amount: parseFloat(formData.amount.toString()) })
      onClose()
      setFormData({
        transaction_type: "deposit",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        description: "",
        reference: "",
      })
    } catch (error) {
      console.error("Failed to submit transaction:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">New Transaction</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
            <select
              value={formData.transaction_type}
              onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Enter transaction description"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference (Optional)</label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Check #, Transaction ID, etc."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function BankingPage() {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showAddAccountModal, setShowAddAccountModal] = useState(false)

  // Filters
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions()
    }
  }, [selectedAccount, startDate, endDate])

  const fetchAccounts = async () => {
    try {
      const response = await api.get("/api/banking")
      setAccounts(response.data.data || [])
      if (response.data.data && response.data.data.length > 0 && !selectedAccount) {
        setSelectedAccount(response.data.data[0].id)
      }
    } catch (error: any) {
      console.error("Failed to fetch bank accounts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTransactions = async () => {
    if (!selectedAccount) return

    try {
      const params: Record<string, string> = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate

      const response = await api.get(`/api/banking/${selectedAccount}/transactions`, { params })
      setTransactions(response.data.data || [])
    } catch (error: any) {
      console.error("Failed to fetch transactions:", error)
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "error",
      })
    }
  }

  const handleAddTransaction = async (data: TransactionData) => {
    if (!selectedAccount) return

    try {
      await api.post(`/api/banking/${selectedAccount}/transaction`, {
        ...data,
        date: new Date(data.date).toISOString(),
      })
      toast({
        title: "Success",
        description: "Transaction recorded successfully",
        variant: "success",
      })
      fetchAccounts()
      fetchTransactions()
    } catch (error: any) {
      console.error("Failed to create transaction:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create transaction",
        variant: "error",
      })
      throw error
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownRight className="h-4 w-4 text-green-600" />
      case "withdrawal":
        return <ArrowUpRight className="h-4 w-4 text-red-600" />
      case "transfer":
        return <ArrowLeftRight className="h-4 w-4 text-blue-600" />
      default:
        return null
    }
  }

  const selectedAccountData = accounts.find((a) => a.id === selectedAccount)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banking"
        subtitle="Manage your bank accounts and transactions"
        action={{
          label: "Add Bank Account",
          onClick: () => setShowAddAccountModal(true),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Bank Accounts Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => setSelectedAccount(account.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedAccount === account.id
                ? "border-blue-500 bg-blue-50 shadow-md"
                : "border-gray-200 bg-white hover:border-blue-300 hover:shadow"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500">{account.currency}</span>
            </div>
            <h3 className="font-semibold text-gray-900">{account.bank_name}</h3>
            <p className="text-sm text-gray-600 mt-1">{account.name}</p>
            <p className="text-xs text-gray-500 mt-1">****{account.account_number.slice(-4)}</p>
            <p className="text-lg font-bold text-gray-900 mt-3">{formatCurrency(account.balance)}</p>
          </button>
        ))}

        {accounts.length === 0 && (
          <div className="col-span-full p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Building className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No bank accounts</h3>
            <p className="text-gray-500 mb-4">Add your first bank account to get started</p>
            <Button onClick={() => setShowAddAccountModal(true)} className="bg-blue-600 hover:bg-blue-700">
              Add Bank Account
            </Button>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      {selectedAccount && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Transactions</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedAccountData?.bank_name} - {selectedAccountData?.name}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                onClick={() => setShowTransactionModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Transaction
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium">Description</TableHead>
                  <TableHead className="font-medium">Type</TableHead>
                  <TableHead className="font-medium text-right">Debit</TableHead>
                  <TableHead className="font-medium text-right">Credit</TableHead>
                  <TableHead className="font-medium text-right">Balance</TableHead>
                  <TableHead className="font-medium text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="text-gray-600">{formatDate(txn.date)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{txn.description}</p>
                        {txn.reference && (
                          <p className="text-xs text-gray-500">Ref: {txn.reference}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(txn.transaction_type)}
                        <span className="text-sm text-gray-600 capitalize">{txn.transaction_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {txn.transaction_type === "deposit" ? (
                        <span className="text-green-600 font-medium">{formatCurrency(txn.amount)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {txn.transaction_type !== "deposit" ? (
                        <span className="text-red-600 font-medium">{formatCurrency(txn.amount)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-gray-900">
                      {formatCurrency(txn.running_balance)}
                    </TableCell>
                    <TableCell className="text-center">
                      {txn.is_reconciled ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Reconciled
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          Pending
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {transactions.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-gray-500">No transactions found for this account</p>
            </div>
          )}
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSubmit={handleAddTransaction}
        accountId={selectedAccount}
      />

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <AddAccountModal
          isOpen={showAddAccountModal}
          onClose={() => setShowAddAccountModal(false)}
          onSuccess={() => {
            setShowAddAccountModal(false)
            fetchAccounts()
          }}
        />
      )}
    </div>
  )
}

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function AddAccountModal({ isOpen, onClose, onSuccess }: AddAccountModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    account_number: "",
    bank_name: "",
    opening_balance: "0",
    currency: "PKR",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await api.post("/api/banking", {
        ...formData,
        opening_balance: parseFloat(formData.opening_balance),
      })
      toast({
        title: "Success",
        description: "Bank account created successfully",
        variant: "success",
      })
      onSuccess()
    } catch (error: any) {
      console.error("Failed to create bank account:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create bank account",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Bank Account</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Operating Account"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
            <input
              type="text"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              placeholder="e.g., MCB Bank"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="text"
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              placeholder="e.g., 0123456789012"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
            <input
              type="number"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              step="0.01"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="PKR">PKR - Pakistani Rupee</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
