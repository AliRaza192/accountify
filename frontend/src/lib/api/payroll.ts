/**
 * Payroll API Client
 * Handles all API calls to the Payroll backend
 */

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

export interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  cnic: string;
  designation: string;
  department?: string;
  join_date: string;
  employee_type: 'permanent' | 'contract';
  basic_salary: number;
  house_rent_allowance: number;
  medical_allowance: number;
  other_allowance: number;
  eobi_rate: number;
  tax_rate: number;
  bank_name?: string;
  bank_account_number?: string;
  company_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalarySlip {
  id: string;
  employee_id: string;
  employee_name: string;
  month: number;
  year: number;
  basic_salary: number;
  house_rent_allowance: number;
  medical_allowance: number;
  other_allowance: number;
  gross_salary: number;
  eobi_deduction: number;
  tax_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  payment_date?: string;
  payment_method?: string;
  is_paid: boolean;
  company_id: string;
  created_at: string;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  total_employees: number;
  total_amount: number;
  status: 'draft' | 'processed' | 'paid';
  company_id: string;
  created_at: string;
}

// ============ Employees ============

export async function fetchEmployees(isActive: boolean = true): Promise<Employee[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.get(`${API_BASE}/payroll/employees?is_active=${isActive}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createEmployee(data: Partial<Employee>): Promise<Employee> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.post(`${API_BASE}/payroll/employees`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.put(`${API_BASE}/payroll/employees/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function getEmployee(id: string): Promise<Employee> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.get(`${API_BASE}/payroll/employees/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ Payroll Runs ============

export async function runPayroll(month: number, year: number): Promise<{
  success: boolean;
  message: string;
  payroll_run_id: string;
  employees_processed: number;
  total_amount: number;
}> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.post(
    `${API_BASE}/payroll/run`,
    { month, year },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.get(`${API_BASE}/payroll/runs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ============ Salary Slips ============

export async function fetchSalarySlips(
  month?: number,
  year?: number,
  employeeId?: string
): Promise<SalarySlip[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  if (employeeId) params.append('employee_id', employeeId);
  
  const response = await axios.get(`${API_BASE}/payroll/slips?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function getSalarySlip(id: string): Promise<SalarySlip> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  const response = await axios.get(`${API_BASE}/payroll/slips/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}
