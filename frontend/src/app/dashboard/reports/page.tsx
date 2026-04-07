"use client"

import Link from "next/link"
import {
  TrendingUp,
  Scale,
  ArrowLeftRight,
  BookOpen,
  ShoppingCart,
  Users,
  Package,
  Clock,
  Truck,
  Building,
  AlertCircle,
  Warehouse,
  AlertTriangle,
  ArrowUpDown,
  FileBarChart,
  GitBranch,
} from "lucide-react"

interface ReportCard {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  color: string
}

const financialReports: ReportCard[] = [
  {
    title: "Profit & Loss",
    description: "View revenue, expenses, and net income",
    href: "/dashboard/reports/profit-loss",
    icon: <TrendingUp className="h-6 w-6" />,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Balance Sheet",
    description: "Assets, liabilities, and equity overview",
    href: "/dashboard/reports/balance-sheet",
    icon: <Scale className="h-6 w-6" />,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Cash Flow Statement",
    description: "Track cash inflows and outflows",
    href: "/dashboard/reports/cash-flow",
    icon: <ArrowLeftRight className="h-6 w-6" />,
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Trial Balance",
    description: "All accounts with debit and credit balances",
    href: "/dashboard/reports/trial-balance",
    icon: <BookOpen className="h-6 w-6" />,
    color: "bg-orange-100 text-orange-600",
  },
]

const salesReports: ReportCard[] = [
  {
    title: "Sales Summary",
    description: "Total sales and collections overview",
    href: "/dashboard/reports/sales-summary",
    icon: <ShoppingCart className="h-6 w-6" />,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Customer Ledger",
    description: "Transaction history by customer",
    href: "/dashboard/reports/customer-ledger",
    icon: <Users className="h-6 w-6" />,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Outstanding Receivables",
    description: "Unpaid invoices and amounts due",
    href: "/dashboard/reports/outstanding-receivables",
    icon: <Clock className="h-6 w-6" />,
    color: "bg-yellow-100 text-yellow-600",
  },
]

const purchaseReports: ReportCard[] = [
  {
    title: "Purchase Summary",
    description: "Total purchases and payments",
    href: "/dashboard/reports/purchase-summary",
    icon: <Truck className="h-6 w-6" />,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Outstanding Payables",
    description: "Unpaid bills and amounts due",
    href: "/dashboard/reports/payables",
    icon: <AlertCircle className="h-6 w-6" />,
    color: "bg-red-100 text-red-600",
  },
]

const inventoryReports: ReportCard[] = [
  {
    title: "Stock Summary",
    description: "Current inventory levels and value",
    href: "/dashboard/reports/stock-summary",
    icon: <Warehouse className="h-6 w-6" />,
    color: "bg-green-100 text-green-600",
  },
]

const taxReports: ReportCard[] = [
  {
    title: "Tax Summary",
    description: "Sales tax and WHT reports (FBR/SRB)",
    href: "/dashboard/reports/tax-summary",
    icon: <FileBarChart className="h-6 w-6" />,
    color: "bg-purple-100 text-purple-600",
  },
]

const branchReports: ReportCard[] = [
  {
    title: "Branch-wise P&L",
    description: "Branch-wise revenue and expenses",
    href: "/dashboard/reports/branch-wise",
    icon: <GitBranch className="h-6 w-6" />,
    color: "bg-cyan-100 text-cyan-600",
  },
]

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">Financial and business reports</p>
      </div>

      {/* Financial Reports */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {financialReports.map((report) => (
            <ReportCard key={report.title} report={report} />
          ))}
        </div>
      </section>

      {/* Sales Reports */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {salesReports.map((report) => (
            <ReportCard key={report.title} report={report} />
          ))}
        </div>
      </section>

      {/* Purchase Reports */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {purchaseReports.map((report) => (
            <ReportCard key={report.title} report={report} />
          ))}
        </div>
      </section>

      {/* Inventory Reports */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventoryReports.map((report) => (
            <ReportCard key={report.title} report={report} />
          ))}
        </div>
      </section>

      {/* Tax Reports */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {taxReports.map((report) => (
            <ReportCard key={report.title} report={report} />
          ))}
        </div>
      </section>

      {/* Branch Reports */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Branch Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branchReports.map((report) => (
            <ReportCard key={report.title} report={report} />
          ))}
        </div>
      </section>
    </div>
  )
}

function ReportCard({ report }: { report: ReportCard }) {
  return (
    <Link
      href={report.href}
      className="group p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${report.color} group-hover:scale-110 transition-transform`}>
          {report.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
            {report.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{report.description}</p>
        </div>
      </div>
    </Link>
  )
}
