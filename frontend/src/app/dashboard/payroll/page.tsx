"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Users, DollarSign, FileText, Calendar } from "lucide-react"
import api from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
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

interface Employee {
  id: string
  full_name: string
  designation: string
  department: string | null
  basic_salary: number
  employee_type: string
  is_active: boolean
}

interface PayrollRun {
  id: string
  month: number
  year: number
  total_employees: number
  total_amount: number
  status: string
  created_at: string
}

interface SalarySlip {
  id: string
  employee_name: string
  month: number
  year: number
  net_salary: number
  is_paid: boolean
}

type TabType = "employees" | "payroll-runs" | "salary-slips"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export default function PayrollPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>("employees")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([])
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showRunPayrollModal, setShowRunPayrollModal] = useState(false)

  useEffect(() => {
    if (activeTab === "employees") {
      fetchEmployees()
    } else if (activeTab === "payroll-runs") {
      fetchPayrollRuns()
    } else if (activeTab === "salary-slips") {
      fetchSalarySlips()
    }
  }, [activeTab])

  const fetchEmployees = async () => {
    try {
      setIsLoading(true)
      const response = await api.get("/api/payroll/employees")
      setEmployees(response.data || [])
    } catch (error: any) {
      console.error("Failed to fetch employees:", error)
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPayrollRuns = async () => {
    try {
      setIsLoading(true)
      const response = await api.get("/api/payroll/runs")
      setPayrollRuns(response.data || [])
    } catch (error: any) {
      console.error("Failed to fetch payroll runs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSalarySlips = async () => {
    try {
      setIsLoading(true)
      const response = await api.get("/api/payroll/slips")
      setSalarySlips(response.data || [])
    } catch (error: any) {
      console.error("Failed to fetch salary slips:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        subtitle="Manage employees and payroll"
        action={{
          label: "Add Employee",
          href: "/dashboard/payroll/employees/new",
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab("employees")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "employees"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </div>
          </button>
          <button
            onClick={() => setActiveTab("payroll-runs")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "payroll-runs"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Payroll Runs
            </div>
          </button>
          <button
            onClick={() => setActiveTab("salary-slips")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "salary-slips"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Salary Slips
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "employees" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">All Employees</h3>
              <p className="text-sm text-gray-500 mt-1">{employees.length} employees</p>
            </div>
          </div>

          {isLoading ? (
            <div className="p-6">
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No employees</h3>
              <p className="text-gray-500 mb-4">Add your first employee to get started</p>
              <Link
                href="/dashboard/payroll/employees/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Employee
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.full_name}</TableCell>
                    <TableCell>{emp.designation}</TableCell>
                    <TableCell>{emp.department || "-"}</TableCell>
                    <TableCell>{formatCurrency(emp.basic_salary)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        emp.employee_type === "permanent"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {emp.employee_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {emp.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/payroll/employees/${emp.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {activeTab === "payroll-runs" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Payroll History</h3>
              <p className="text-sm text-gray-500 mt-1">{payrollRuns.length} payroll runs</p>
            </div>
            <Button
              onClick={() => setShowRunPayrollModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Run Payroll
            </Button>
          </div>

          {isLoading ? (
            <div className="p-6">
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ) : payrollRuns.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payroll runs</h3>
              <p className="text-gray-500 mb-4">Run payroll for the first time</p>
              <Button
                onClick={() => setShowRunPayrollModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Run Payroll
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Total Employees</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{MONTH_NAMES[run.month - 1]}</TableCell>
                    <TableCell>{run.year}</TableCell>
                    <TableCell>{run.total_employees}</TableCell>
                    <TableCell>{formatCurrency(run.total_amount)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        run.status === "processed"
                          ? "bg-green-100 text-green-700"
                          : run.status === "paid"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {run.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(run.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/payroll/runs/${run.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {activeTab === "salary-slips" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Salary Slips</h3>
            <p className="text-sm text-gray-500 mt-1">{salarySlips.length} slips</p>
          </div>

          {salarySlips.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No salary slips</h3>
              <p className="text-gray-500">Run payroll to generate salary slips</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salarySlips.map((slip) => (
                  <TableRow key={slip.id}>
                    <TableCell className="font-medium">{slip.employee_name}</TableCell>
                    <TableCell>{MONTH_NAMES[slip.month - 1]}</TableCell>
                    <TableCell>{slip.year}</TableCell>
                    <TableCell>{formatCurrency(slip.net_salary)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        slip.is_paid
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {slip.is_paid ? "Paid" : "Pending"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/payroll/slips/${slip.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View Slip
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Run Payroll Modal */}
      {showRunPayrollModal && (
        <RunPayrollModal
          isOpen={showRunPayrollModal}
          onClose={() => setShowRunPayrollModal(false)}
          onSuccess={() => {
            setShowRunPayrollModal(false)
            fetchPayrollRuns()
          }}
        />
      )}
    </div>
  )
}

interface RunPayrollModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function RunPayrollModal({ isOpen, onClose, onSuccess }: RunPayrollModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      await api.post("/api/payroll/run", { month, year })
      toast({
        title: "Success",
        description: "Payroll processed successfully",
        variant: "success",
      })
      onSuccess()
    } catch (error: any) {
      console.error("Failed to run payroll:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to run payroll",
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Run Payroll</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              This will calculate salaries for all active employees and generate salary slips.
            </p>
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
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Process Payroll"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
