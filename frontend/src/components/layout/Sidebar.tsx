"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calculator,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Package,
  BarChart2,
  Users,
  Bot,
  Settings,
  LogOut,
  FileText,
  ShoppingCart,
  BookOpen,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import useAuth from "@/hooks/useAuth"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  children?: { label: string; href: string }[]
  badge?: string
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Sales",
    href: "/sales",
    icon: <ShoppingCart className="h-5 w-5" />,
    children: [
      { label: "Invoices", href: "/sales/invoices" },
      { label: "Customers", href: "/sales/customers" },
      { label: "Quotations", href: "/sales/quotations" },
    ],
  },
  {
    label: "Purchase",
    href: "/purchase",
    icon: <FileText className="h-5 w-5" />,
    children: [
      { label: "Bills", href: "/purchase/bills" },
      { label: "Vendors", href: "/purchase/vendors" },
      { label: "Purchase Orders", href: "/purchase/orders" },
    ],
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: <Package className="h-5 w-5" />,
  },
  {
    label: "Fixed Assets",
    href: "/dashboard/fixed-assets",
    icon: <Building2 className="h-5 w-5" />,
    children: [
      { label: "All Assets", href: "/dashboard/fixed-assets" },
      { label: "Add New", href: "/dashboard/fixed-assets/new" },
      { label: "Depreciation", href: "/dashboard/fixed-assets/depreciation" },
    ],
  },
  {
    label: "Cost Centers",
    href: "/dashboard/accounting/cost-centers",
    icon: <Calculator className="h-5 w-5" />,
    children: [
      { label: "All Cost Centers", href: "/dashboard/accounting/cost-centers" },
      { label: "Add New", href: "/dashboard/accounting/cost-centers/new" },
    ],
  },
  {
    label: "Tax",
    href: "/dashboard/tax",
    icon: <FileText className="h-5 w-5" />,
    children: [
      { label: "Dashboard", href: "/dashboard/tax" },
      { label: "Tax Rates", href: "/dashboard/tax/rates" },
      { label: "Monthly Returns", href: "/dashboard/tax/returns" },
      { label: "WHT Transactions", href: "/dashboard/tax/wht" },
    ],
  },
  {
    label: "Banking",
    href: "/dashboard/banking",
    icon: <BookOpen className="h-5 w-5" />,
    children: [
      { label: "Overview", href: "/dashboard/banking" },
      { label: "Reconciliation", href: "/dashboard/banking/reconciliation" },
      { label: "PDC Management", href: "/dashboard/banking/pdcs" },
    ],
  },
  {
    label: "Accounting",
    href: "/accounting",
    icon: <BookOpen className="h-5 w-5" />,
    children: [
      { label: "Journal Entries", href: "/accounting/journal" },
      { label: "Chart of Accounts", href: "/accounting/chart-of-accounts" },
      { label: "Trial Balance", href: "/accounting/trial-balance" },
    ],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: <BarChart2 className="h-5 w-5" />,
  },
  {
    label: "Payroll",
    href: "/payroll",
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: "AI Assistant",
    href: "/dashboard/ai-chat",
    icon: <Bot className="h-5 w-5" />,
    badge: "NEW",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-5 w-5" />,
  },
]

export default function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const { getUser, logout } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)

  const user = getUser()

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    )
  }

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-lg text-gray-900">AI Accounts</span>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 lg:flex hidden"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500 rotate-90" />
          )}
        </button>
      </div>

      {/* Company Name */}
      {!isCollapsed && user?.company_name && (
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Company</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{user.company_name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => item.children && toggleExpand(item.label)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <span
                  className={cn(
                    "flex-shrink-0",
                    isActive(item.href) ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"
                  )}
                >
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {item.children && (
                      <span className="text-gray-400">
                        {expandedItems.includes(item.label) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </>
                )}
              </button>

              {/* Submenu */}
              {!isCollapsed && item.children && expandedItems.includes(item.label) && (
                <ul className="mt-1 ml-4 pl-4 border-l border-gray-200 space-y-1">
                  {item.children.map((child) => (
                    <li key={child.label}>
                      <Link
                        href={child.href}
                        className={cn(
                          "block px-3 py-2 text-sm rounded-lg transition-colors",
                          pathname === child.href
                            ? "text-blue-600 bg-blue-50"
                            : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "")}>
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {user?.full_name?.charAt(0).toUpperCase() || "U"}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || "User"}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
