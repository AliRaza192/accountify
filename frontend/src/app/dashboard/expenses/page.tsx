"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, FileText, TrendingUp } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { PageHeader } from "@/components/ui/page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Expense {
  id: string
  date: string
  description: string
  account_id: string
  account_name: string
  amount: number
  payment_method: string
  reference: string | null
  created_at: string
}

interface Account {
  id: string
  name: string
  code: string
}

export default function ExpensesPage() {
  const { toast } = useToast()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filters
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [accountFilter, setAccountFilter] = useState("")

  // Total expenses
  const [totalExpenses, setTotalExpenses] = useState(0)

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [startDate, endDate, accountFilter])

  const fetchAccounts = async () => {
    try {
      const response = await api.get("/api/accounts")
      // Filter for expense type accounts
      const expenseAccounts = response.data.data?.filter((a: any) => a.account_type === "expense") || []
      setAccounts(expenseAccounts)
    } catch (error: any) {
      console.error("Failed to fetch accounts:", error)
    }
  }

  const fetchExpenses = async () => {
    try {
      setIsLoading(true)
      const params: Record<string, string> = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      if (accountFilter) params.account_id = accountFilter

      const response = await api.get("/api/expenses", { params })
      const expensesData = response.data.data || []
      setExpenses(expensesData)
      
      // Calculate total
      const total = expensesData.reduce((sum: number, exp: Expense) => sum + exp.amount, 0)
      setTotalExpenses(total)
    } catch (error: any) {
      console.error("Failed to fetch expenses:", error)
      toast({
        title: "Error",
        description: "Failed to load expenses",
        
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Pagination
  const totalPages = Math.ceil(expenses.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedExpenses = expenses.slice(startIndex, endIndex)

  const clearFilters = () => {
    setStartDate("")
    setEndDate("")
    setAccountFilter("")
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Track your business expenses"
        action={{
          label: "Add Expense",
          href: "/dashboard/expenses/new",
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-90">Total Expenses</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="p-4 bg-white/20 rounded-full">
            <TrendingUp className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex flex-wrap gap-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <select
                value={accountFilter}
                onChange={(e) => {
                  setAccountFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(startDate || endDate || accountFilter) && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  {["Date", "Description", "Account", "Amount", "Payment Method", "Actions"].map((header) => (
                    <TableHead key={header}>
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
            <p className="text-gray-500 mb-4">
              {startDate || endDate || accountFilter
                ? "No expenses match your filter criteria"
                : "Get started by adding your first expense"}
            </p>
            {!startDate && !endDate && !accountFilter && (
              <Link
                href="/dashboard/expenses/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Expense
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Date</TableHead>
                    <TableHead className="font-medium">Description</TableHead>
                    <TableHead className="font-medium">Account</TableHead>
                    <TableHead className="font-medium">Amount</TableHead>
                    <TableHead className="font-medium">Payment Method</TableHead>
                    <TableHead className="font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-gray-600">{formatDate(expense.date)}</TableCell>
                      <TableCell className="font-medium text-gray-900">{expense.description}</TableCell>
                      <TableCell className="text-gray-600">{expense.account_name}</TableCell>
                      <TableCell className="font-medium text-red-600">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-700">
                          {expense.payment_method}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/expenses/${expense.id}`}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <FileText className="h-4 w-4" />
                        </Link>
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
                  Showing {startIndex + 1} to {Math.min(endIndex, expenses.length)} of {expenses.length} expenses
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
    </div>
  )
}
