"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Wallet,
  Plus,
  FileText,
  Receipt,
  BarChart2,
  Users,
  Shield,
  DollarSign,
  Factory,
  CheckCircle,
  Building2,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import api from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/toaster"
import useAuth from "@/hooks/useAuth"

interface DashboardData {
  total_revenue: number
  total_expenses: number
  outstanding_receivables: number
  cash_balance: number
  recent_invoices: Invoice[]
  recent_activity: Activity[]
}

interface Invoice {
  id: string
  invoice_number: string
  customer_name: string
  amount: number
  status: "paid" | "partial" | "pending" | "confirmed" | "cancelled"
  due_date: string
}

interface Activity {
  id: string
  description: string
  type: string
  amount?: number
  created_at: string
}

interface MonthlyData {
  month: string
  revenue: number
  expenses: number
}

const metricCards = [
  {
    label: "Total Revenue",
    value: (data: DashboardData) => data.total_revenue,
    icon: TrendingUp,
    color: "green",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    label: "Total Expenses",
    value: (data: DashboardData) => data.total_expenses,
    icon: TrendingDown,
    color: "red",
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
  },
  {
    label: "Outstanding Receivables",
    value: (data: DashboardData) => data.outstanding_receivables,
    icon: Clock,
    color: "blue",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    label: "Cash Balance",
    value: (data: DashboardData) => data.cash_balance,
    icon: Wallet,
    color: "purple",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
]

export default function DashboardPage() {
  const { toast } = useToast()
  const { getUser } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setError(null)
      const response = await api.get("/reports/dashboard")
      setData(response.data)
      
      // Generate mock monthly data for chart (last 6 months)
      const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const mockMonthlyData: MonthlyData[] = months.map((month, index) => ({
        month,
        revenue: Math.floor(Math.random() * 500000) + 200000,
        expenses: Math.floor(Math.random() * 300000) + 100000,
      }))
      setMonthlyData(mockMonthlyData)
    } catch (err: any) {
      console.error("Failed to fetch dashboard data:", err)
      setError("Failed to load dashboard data. Please try again.")
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        
      })
      
      // Set mock data for demo purposes
      setData({
        total_revenue: 1250000,
        total_expenses: 450000,
        outstanding_receivables: 325000,
        cash_balance: 875000,
        recent_invoices: [
          {
            id: "1",
            invoice_number: "INV-2025-001",
            customer_name: "Acme Corporation",
            amount: 125000,
            status: "paid",
            due_date: "2025-03-15",
          },
          {
            id: "2",
            invoice_number: "INV-2025-002",
            customer_name: "Tech Solutions Ltd",
            amount: 85000,
            status: "partial",
            due_date: "2025-03-20",
          },
          {
            id: "3",
            invoice_number: "INV-2025-003",
            customer_name: "Global Industries",
            amount: 215000,
            status: "pending",
            due_date: "2025-03-25",
          },
          {
            id: "4",
            invoice_number: "INV-2025-004",
            customer_name: "Smart Systems",
            amount: 67500,
            status: "confirmed",
            due_date: "2025-03-10",
          },
          {
            id: "5",
            invoice_number: "INV-2025-005",
            customer_name: "Digital Dynamics",
            amount: 142000,
            status: "pending",
            due_date: "2025-03-30",
          },
        ],
        recent_activity: [
          {
            id: "1",
            description: "New invoice INV-2025-005 created",
            type: "invoice",
            created_at: "2025-03-27T10:30:00Z",
          },
          {
            id: "2",
            description: "Payment received for INV-2025-001",
            type: "payment",
            created_at: "2025-03-27T09:15:00Z",
          },
          {
            id: "3",
            description: "Bill #BILL-001 recorded",
            type: "bill",
            created_at: "2025-03-26T16:45:00Z",
          },
          {
            id: "4",
            description: "New customer added: Digital Dynamics",
            type: "customer",
            created_at: "2025-03-26T14:20:00Z",
          },
          {
            id: "5",
            description: "Expense recorded for office supplies",
            type: "expense",
            created_at: "2025-03-26T11:00:00Z",
          },
        ],
      })
      
      const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const mockMonthlyData: MonthlyData[] = months.map((month) => ({
        month,
        revenue: Math.floor(Math.random() * 500000) + 200000,
        expenses: Math.floor(Math.random() * 300000) + 100000,
      }))
      setMonthlyData(mockMonthlyData)
    } finally {
      setIsLoading(false)
    }
  }

  const user = getUser()

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700"
      case "partial":
        return "bg-yellow-100 text-yellow-700"
      case "pending":
      case "confirmed":
        return "bg-blue-100 text-blue-700"
      case "cancelled":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-10 w-10 bg-gray-200 rounded-lg" />
              </div>
              <div className="h-8 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
        {/* Skeleton Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.full_name?.split(" ")[0] || "User"}!
        </h2>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your business today.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon
          const value = data ? metric.value(data) : 0
          return (
            <div
              key={metric.label}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-600">{metric.label}</span>
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-5 w-5 ${metric.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(value)}</p>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link
            href="/dashboard/invoices/new"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
              <Plus className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">New Invoice</span>
          </Link>
          <Link
            href="/dashboard/customers/new"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all group"
          >
            <div className="p-2 rounded-lg bg-green-50 group-hover:bg-green-100 transition-colors">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">New Customer</span>
          </Link>
          <Link
            href="/dashboard/bills/new"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-md transition-all group"
          >
            <div className="p-2 rounded-lg bg-red-50 group-hover:bg-red-100 transition-colors">
              <Receipt className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">New Bill</span>
          </Link>
          <Link
            href="/dashboard/expenses/new"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all group"
          >
            <div className="p-2 rounded-lg bg-orange-50 group-hover:bg-orange-100 transition-colors">
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">New Expense</span>
          </Link>
          <Link
            href="/dashboard/reports"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
          >
            <div className="p-2 rounded-lg bg-purple-50 group-hover:bg-purple-100 transition-colors">
              <BarChart2 className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Reports</span>
          </Link>
        </div>
        {/* Additional Quick Actions - New Modules */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
          <Link
            href="/dashboard/manufacturing"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-yellow-300 hover:shadow-md transition-all group"
          >
            <div className="p-2 rounded-lg bg-yellow-50 group-hover:bg-yellow-100 transition-colors">
              <Factory className="h-5 w-5 text-yellow-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Manufacturing</span>
          </Link>
          <Link
            href="/dashboard/budget"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all group"
          >
            <div className="p-2 rounded-lg bg-green-50 group-hover:bg-green-100 transition-colors">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Budget</span>
          </Link>
          <Link
            href="/dashboard/approvals"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Approvals</span>
          </Link>
          <Link
            href="/dashboard/settings/branches"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
          >
            <div className="p-2 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Branches</span>
          </Link>
          <Link
            href="/dashboard/settings/audit"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group"
          >
            <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors">
              <Shield className="h-5 w-5 text-gray-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Audit Trail</span>
          </Link>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses (Last 6 Months)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `PKR ${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: number) => [formatCurrency(value), ""]}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#22c55e" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            <Link href="/dashboard/invoices" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.recent_invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600">{invoice.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{invoice.customer_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(invoice.amount)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeClass(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{formatDate(invoice.due_date)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6 space-y-4">
            {data?.recent_activity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                  activity.type === "invoice" ? "bg-blue-500" :
                  activity.type === "payment" ? "bg-green-500" :
                  activity.type === "bill" ? "bg-red-500" :
                  activity.type === "customer" ? "bg-purple-500" :
                  "bg-gray-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(activity.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
