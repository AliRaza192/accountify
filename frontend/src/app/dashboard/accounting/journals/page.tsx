"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, FileText, Eye } from "lucide-react"
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

interface JournalEntry {
  id: string
  reference: string
  date: string
  description: string
  is_posted: boolean
  total_debit: number
  total_credit: number
  created_at: string
}

export default function JournalEntriesPage() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filters
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchEntries()
  }, [startDate, endDate])

  const fetchEntries = async () => {
    try {
      setIsLoading(true)
      const params: Record<string, string> = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate

      const response = await api.get("/api/journals", { params })
      let entriesData = response.data.data || []

      // Calculate totals from lines
      entriesData = entriesData.map((entry: any) => {
        const totalDebit = entry.lines?.reduce((sum: number, line: any) => sum + parseFloat(line.debit), 0) || 0
        const totalCredit = entry.lines?.reduce((sum: number, line: any) => sum + parseFloat(line.credit), 0) || 0
        return {
          ...entry,
          total_debit: totalDebit,
          total_credit: totalCredit,
        }
      })

      // Filter by search term
      if (searchTerm) {
        entriesData = entriesData.filter(
          (entry: JournalEntry) =>
            entry.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      setEntries(entriesData)
    } catch (error: any) {
      console.error("Failed to fetch journal entries:", error)
      toast({
        title: "Error",
        description: "Failed to load journal entries",
        
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Pagination
  const totalPages = Math.ceil(entries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEntries = entries.slice(startIndex, endIndex)

  const clearFilters = () => {
    setStartDate("")
    setEndDate("")
    setSearchTerm("")
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Entries"
        subtitle="Record and manage general journal entries"
        action={{
          label: "New Entry",
          href: "/dashboard/accounting/journals/new",
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex flex-wrap gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reference or description..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
          </div>
          {(startDate || endDate || searchTerm) && (
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

      {/* Journal Entries Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  {["Entry #", "Date", "Description", "Debit Total", "Credit Total", "Status", "Actions"].map(
                    (header) => (
                      <TableHead key={header}>
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                      </TableHead>
                    )
                  )}
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
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No journal entries found</h3>
            <p className="text-gray-500 mb-4">
              {startDate || endDate || searchTerm
                ? "No entries match your filter criteria"
                : "Get started by creating your first journal entry"}
            </p>
            {!startDate && !endDate && !searchTerm && (
              <Link
                href="/dashboard/accounting/journals/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Entry
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Entry #</TableHead>
                    <TableHead className="font-medium">Date</TableHead>
                    <TableHead className="font-medium">Description</TableHead>
                    <TableHead className="font-medium text-right">Debit Total</TableHead>
                    <TableHead className="font-medium text-right">Credit Total</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium text-blue-600">
                        <Link
                          href={`/dashboard/accounting/journals/${entry.id}`}
                          className="hover:underline"
                        >
                          {entry.reference}
                        </Link>
                      </TableCell>
                      <TableCell className="text-gray-600">{formatDate(entry.date)}</TableCell>
                      <TableCell className="text-gray-900 max-w-xs truncate">{entry.description}</TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        {formatCurrency(entry.total_debit)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        {formatCurrency(entry.total_credit)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.is_posted
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {entry.is_posted ? "Posted" : "Draft"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/accounting/journals/${entry.id}`}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
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
                  Showing {startIndex + 1} to {Math.min(endIndex, entries.length)} of {entries.length} entries
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
