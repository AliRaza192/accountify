"use client"

import { useState, useEffect } from "react"
import { Shield, Search, Calendar, Filter, User, FileText, Activity, Clock } from "lucide-react"
import { fetchAuditLogs, type AuditLog, type AuditLogFilters } from "@/lib/api/roles"
import { useToast } from "@/components/ui/toaster"

export default function AuditTrailPage() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await fetchAuditLogs(filters)
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch (error: any) {
      console.error("Failed to load audit logs:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load audit trail",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const applyFilters = () => {
    loadLogs()
  }

  const clearFilters = () => {
    setFilters({})
    setTimeout(() => loadLogs(), 0)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getActionColor = (action: string) => {
    if (action.includes("create") || action.includes("added")) return "bg-green-100 text-green-800"
    if (action.includes("update") || action.includes("modified")) return "bg-blue-100 text-blue-800"
    if (action.includes("delete") || action.includes("removed")) return "bg-red-100 text-red-800"
    if (action.includes("login")) return "bg-purple-100 text-purple-800"
    return "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <p className="text-gray-500 mt-1">Track all system changes and user activities</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showFilters ? "Hide" : "Show"}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">User</label>
              <div className="relative">
                <User className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.user_id || ""}
                  onChange={(e) => handleFilterChange("user_id", e.target.value)}
                  placeholder="Filter by user"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Entity Type</label>
              <input
                type="text"
                value={filters.entity_type || ""}
                onChange={(e) => handleFilterChange("entity_type", e.target.value)}
                placeholder="e.g., Invoice, User"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Action</label>
              <input
                type="text"
                value={filters.action || ""}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                placeholder="e.g., create, update"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={applyFilters}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1"
              >
                <Search className="h-3 w-3" />
                Apply
              </button>
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium text-gray-900">{logs.length}</span> of{" "}
          <span className="font-medium text-gray-900">{total}</span> entries
        </p>
      </div>

      {/* Audit Log Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No audit entries found</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white font-semibold">
                    {log.user_name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{log.user_name}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(
                        log.action
                      )}`}
                    >
                      <Activity className="h-3 w-3 mr-1" />
                      {log.action}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <span className="font-medium">{log.entity_type}</span>
                    <span className="text-gray-400">→</span>
                    <span>{log.entity_name}</span>
                  </div>
                  {(log.old_values || log.new_values) && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
                        View changes
                      </summary>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        {log.old_values && (
                          <div className="bg-red-50 p-2 rounded">
                            <p className="font-medium text-red-700 mb-1">Before</p>
                            <pre className="text-red-600 whitespace-pre-wrap">
                              {JSON.stringify(log.old_values, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.new_values && (
                          <div className="bg-green-50 p-2 rounded">
                            <p className="font-medium text-green-700 mb-1">After</p>
                            <pre className="text-green-600 whitespace-pre-wrap">
                              {JSON.stringify(log.new_values, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
