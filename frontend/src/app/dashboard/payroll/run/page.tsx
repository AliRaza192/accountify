"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Printer, DollarSign } from "lucide-react"
import Link from "next/link"
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
  basic_salary: number
  house_rent_allowance: number
  medical_allowance: number
  other_allowance: number
  eobi_rate: number
  tax_rate: number
}

interface PayrollCalculation {
  employee: Employee
  basic: number
  allowances: number
  gross: number
  eobi: number
  tax: number
  deductions: number
  netPay: number
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export default function RunPayrollPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [calculations, setCalculations] = useState<PayrollCalculation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setIsLoading(true)
      const response = await api.get("/api/payroll/employees?is_active=true")
      const employeesData = response.data || []
      setEmployees(employeesData)
      calculatePayroll(employeesData)
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

  const calculatePayroll = (emps: Employee[]) => {
    const calcs: PayrollCalculation[] = emps.map((emp) => {
      const basic = emp.basic_salary
      const allowances = emp.house_rent_allowance + emp.medical_allowance + emp.other_allowance
      const gross = basic + allowances
      const eobi = basic * (emp.eobi_rate / 100)
      const tax = gross * (emp.tax_rate / 100)
      const deductions = eobi + tax
      const netPay = gross - deductions

      return {
        employee: emp,
        basic,
        allowances,
        gross,
        eobi,
        tax,
        deductions,
        netPay,
      }
    })
    setCalculations(calcs)
  }

  const handleProcessPayroll = async () => {
    setIsProcessing(true)
    try {
      await api.post("/api/payroll/run", { month, year })
      toast({
        title: "Success",
        description: "Payroll processed successfully",
        variant: "success",
      })
      router.push("/dashboard/payroll")
    } catch (error: any) {
      console.error("Failed to process payroll:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to process payroll",
        variant: "error",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const totalGross = calculations.reduce((sum, c) => sum + c.gross, 0)
  const totalDeductions = calculations.reduce((sum, c) => sum + c.deductions, 0)
  const totalNet = calculations.reduce((sum, c) => sum + c.netPay, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Run Payroll"
        subtitle="Process payroll for selected month"
      />

      {/* Month Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
            />
          </div>
          <div className="flex gap-2 ml-auto print:hidden">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Preview
            </Button>
            <Button
              onClick={handleProcessPayroll}
              disabled={isProcessing || calculations.length === 0}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              <DollarSign className="h-4 w-4" />
              {isProcessing ? "Processing..." : "Process Payroll"}
            </Button>
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0">
        {isLoading ? (
          <div className="p-6">
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : calculations.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No active employees found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead className="text-right">Basic</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">EOBI</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculations.map((calc) => (
                    <TableRow key={calc.employee.id}>
                      <TableCell className="font-medium">{calc.employee.full_name}</TableCell>
                      <TableCell>{calc.employee.designation}</TableCell>
                      <TableCell className="text-right">{formatCurrency(calc.basic)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(calc.allowances)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(calc.gross)}</TableCell>
                      <TableCell className="text-right text-gray-600">{formatCurrency(calc.eobi)}</TableCell>
                      <TableCell className="text-right text-gray-600">{formatCurrency(calc.tax)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(calc.deductions)}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">{formatCurrency(calc.netPay)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot className="bg-gray-50">
                  <TableRow>
                    <TableCell colSpan={2} className="font-bold">Totals:</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(totalGross - totalDeductions + totalDeductions - totalNet)}</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(totalGross)}</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right font-bold text-red-600">{formatCurrency(totalDeductions)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(totalNet)}</TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>

            {/* Summary */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 print:bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-600">Total Gross</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalGross)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-600">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDeductions)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-600">Total Net Pay</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalNet)}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
