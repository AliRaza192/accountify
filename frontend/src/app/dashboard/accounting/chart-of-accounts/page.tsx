"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, ChevronRight, ChevronDown, Pencil, Trash2, FolderPlus, Search } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"

interface Account {
  id: string
  code: string
  name: string
  account_type: string
  parent_id: string | null
  description: string | null
  balance?: number
}

interface AccountTreeNode extends Account {
  children: AccountTreeNode[]
  isExpanded?: boolean
}

const ACCOUNT_TYPE_ORDER = [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
}

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  asset: "bg-blue-100 text-blue-700",
  liability: "bg-red-100 text-red-700",
  equity: "bg-purple-100 text-purple-700",
  revenue: "bg-green-100 text-green-700",
  expense: "bg-orange-100 text-orange-700",
}

export default function ChartOfAccountsPage() {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedParent, setSelectedParent] = useState<string | null>(null)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await api.get("/api/accounts")
      setAccounts(response.data.data || [])
    } catch (error: any) {
      console.error("Failed to fetch accounts:", error)
      toast({
        title: "Error",
        description: "Failed to load chart of accounts",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleNode = (accountId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
    }
    setExpandedNodes(newExpanded)
  }

  const buildTree = (): AccountTreeNode[] => {
    const accountMap = new Map<string, AccountTreeNode>()
    const roots: AccountTreeNode[] = []

    // First pass: create all nodes
    accounts.forEach((acc) => {
      accountMap.set(acc.id, { ...acc, children: [] })
    })

    // Second pass: build tree
    accounts.forEach((acc) => {
      const node = accountMap.get(acc.id)!
      if (acc.parent_id && accountMap.has(acc.parent_id)) {
        accountMap.get(acc.parent_id)!.children.push(node)
      } else {
        roots.push(node)
      }
    })

    // Sort children by code
    const sortTree = (nodes: AccountTreeNode[]) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code))
      nodes.forEach((node) => sortTree(node.children))
    }
    sortTree(roots)

    return roots
  }

  const filterTree = (nodes: AccountTreeNode[], term: string): AccountTreeNode[] => {
    if (!term) return nodes

    const filtered: AccountTreeNode[] = []
    nodes.forEach((node) => {
      const matchesSearch =
        node.name.toLowerCase().includes(term.toLowerCase()) ||
        node.code.toLowerCase().includes(term.toLowerCase())

      const filteredChildren = filterTree(node.children, term)

      if (matchesSearch || filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren,
          isExpanded: true,
        })
      }
    })
    return filtered
  }

  const loadDefaultAccounts = async () => {
    const defaultAccounts = [
      // Assets
      { code: "1000", name: "Assets", account_type: "asset", parent_id: null },
      { code: "1100", name: "Current Assets", account_type: "asset", parent_id: null },
      { code: "1110", name: "Cash", account_type: "asset", parent_id: null },
      { code: "1120", name: "Bank", account_type: "asset", parent_id: null },
      { code: "1200", name: "Accounts Receivable", account_type: "asset", parent_id: null },
      { code: "1300", name: "Inventory", account_type: "asset", parent_id: null },
      { code: "1500", name: "Fixed Assets", account_type: "asset", parent_id: null },
      { code: "1510", name: "Equipment", account_type: "asset", parent_id: null },
      { code: "1520", name: "Furniture & Fixtures", account_type: "asset", parent_id: null },
      { code: "1530", name: "Vehicles", account_type: "asset", parent_id: null },

      // Liabilities
      { code: "2000", name: "Liabilities", account_type: "liability", parent_id: null },
      { code: "2100", name: "Accounts Payable", account_type: "liability", parent_id: null },
      { code: "2200", name: "Short-term Loans", account_type: "liability", parent_id: null },
      { code: "2300", name: "Long-term Loans", account_type: "liability", parent_id: null },
      { code: "2400", name: "Tax Payable", account_type: "liability", parent_id: null },

      // Equity
      { code: "3000", name: "Equity", account_type: "equity", parent_id: null },
      { code: "3100", name: "Owner's Capital", account_type: "equity", parent_id: null },
      { code: "3200", name: "Retained Earnings", account_type: "equity", parent_id: null },
      { code: "3300", name: "Drawings", account_type: "equity", parent_id: null },

      // Revenue
      { code: "4000", name: "Revenue", account_type: "revenue", parent_id: null },
      { code: "4100", name: "Sales Revenue", account_type: "revenue", parent_id: null },
      { code: "4200", name: "Service Revenue", account_type: "revenue", parent_id: null },
      { code: "4300", name: "Other Income", account_type: "revenue", parent_id: null },

      // Expenses
      { code: "5000", name: "Expenses", account_type: "expense", parent_id: null },
      { code: "5100", name: "Cost of Goods Sold", account_type: "expense", parent_id: null },
      { code: "5200", name: "Operating Expenses", account_type: "expense", parent_id: null },
      { code: "5210", name: "Rent Expense", account_type: "expense", parent_id: null },
      { code: "5220", name: "Salaries Expense", account_type: "expense", parent_id: null },
      { code: "5230", name: "Utilities Expense", account_type: "expense", parent_id: null },
      { code: "5240", name: "Office Supplies", account_type: "expense", parent_id: null },
      { code: "5250", name: "Marketing Expense", account_type: "expense", parent_id: null },
      { code: "5260", name: "Depreciation Expense", account_type: "expense", parent_id: null },
    ]

    setIsLoading(true)
    try {
      for (const acc of defaultAccounts) {
        await api.post("/api/accounts", acc)
      }
      toast({
        title: "Success",
        description: "Default chart of accounts loaded successfully",
        variant: "success",
      })
      fetchAccounts()
    } catch (error: any) {
      console.error("Failed to load default accounts:", error)
      toast({
        title: "Error",
        description: "Failed to load default accounts",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (accountId: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return

    try {
      await api.delete(`/api/accounts/${accountId}`)
      toast({
        title: "Success",
        description: "Account deleted successfully",
        variant: "success",
      })
      fetchAccounts()
    } catch (error: any) {
      console.error("Failed to delete account:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete account",
        variant: "error",
      })
    }
  }

  const tree = filterTree(buildTree(), searchTerm)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage your general ledger accounts"
        action={{
          label: "Add Account",
          onClick: () => {
            setSelectedParent(null)
            setShowAddModal(true)
          },
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button
            onClick={loadDefaultAccounts}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            Load Default Accounts
          </Button>
        </div>
      </div>

      {/* Account Tree */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : tree.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No accounts found</p>
            <Button
              onClick={loadDefaultAccounts}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Load Default Chart of Accounts
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tree.map((node) => (
              <AccountTreeNode
                key={node.id}
                node={node}
                isExpanded={expandedNodes.has(node.id)}
                onToggle={() => toggleNode(node.id)}
                onAddSubAccount={() => {
                  setSelectedParent(node.id)
                  setShowAddModal(true)
                }}
                onDelete={() => handleDelete(node.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <AddAccountModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          parentId={selectedParent}
          onSuccess={() => {
            setShowAddModal(false)
            fetchAccounts()
          }}
          allAccounts={accounts}
        />
      )}
    </div>
  )
}

function AccountTreeNode({
  node,
  isExpanded,
  onToggle,
  onAddSubAccount,
  onDelete,
}: {
  node: AccountTreeNode
  isExpanded: boolean
  onToggle: () => void
  onAddSubAccount: () => void
  onDelete: () => void
}) {
  const hasChildren = node.children.length > 0

  return (
    <>
      <div className="flex items-center gap-2 p-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2 flex-1">
          {hasChildren ? (
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <span className="font-mono text-sm text-gray-600 w-20">{node.code}</span>
          <span className="font-medium text-gray-900 flex-1">{node.name}</span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
              ACCOUNT_TYPE_COLORS[node.account_type] || "bg-gray-100 text-gray-700"
            }`}
          >
            {node.account_type}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onAddSubAccount}
            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Add sub-account"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isExpanded && node.children.length > 0 && (
        <div className="pl-6">
          {node.children.map((child) => (
            <AccountTreeNode
              key={child.id}
              node={child}
              isExpanded={false}
              onToggle={() => {}}
              onAddSubAccount={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}
    </>
  )
}

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  parentId: string | null
  onSuccess: () => void
  allAccounts: Account[]
}

function AddAccountModal({
  isOpen,
  onClose,
  parentId,
  onSuccess,
  allAccounts,
}: AddAccountModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    account_type: "asset",
    parent_id: parentId || "",
    description: "",
  })

  useEffect(() => {
    if (parentId) {
      setFormData((prev) => ({ ...prev, parent_id: parentId }))
    }
  }, [parentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await api.post("/api/accounts", {
        ...formData,
        parent_id: formData.parent_id || null,
      })
      toast({
        title: "Success",
        description: "Account created successfully",
        variant: "success",
      })
      onSuccess()
    } catch (error: any) {
      console.error("Failed to create account:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create account",
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Account</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., 1100"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Cash in Hand"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <select
              value={formData.account_type}
              onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {ACCOUNT_TYPE_ORDER.map((type) => (
                <option key={type} value={type}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Account (Optional)</label>
            <select
              value={formData.parent_id}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">None (Top Level)</option>
              {allAccounts
                .filter((acc) => acc.account_type === formData.account_type)
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
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
              {isLoading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
