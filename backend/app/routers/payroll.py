from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
import logging

from app.database import supabase
from app.types import User
from app.routers.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


class EmployeeCreate(BaseModel):
    full_name: str
    email: str
    phone: str
    cnic: str
    designation: str
    department: Optional[str] = None
    join_date: datetime
    employee_type: str = "permanent"  # permanent, contract
    basic_salary: Decimal
    house_rent_allowance: Decimal = Decimal("0")
    medical_allowance: Decimal = Decimal("0")
    other_allowance: Decimal = Decimal("0")
    eobi_rate: Decimal = Decimal("1")  # 1% default
    tax_rate: Decimal = Decimal("0")
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    cnic: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    employee_type: Optional[str] = None
    basic_salary: Optional[Decimal] = None
    house_rent_allowance: Optional[Decimal] = None
    medical_allowance: Optional[Decimal] = None
    other_allowance: Optional[Decimal] = None
    eobi_rate: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    is_active: Optional[bool] = None


class EmployeeResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: str
    cnic: str
    designation: str
    department: Optional[str]
    join_date: datetime
    employee_type: str
    basic_salary: Decimal
    house_rent_allowance: Decimal
    medical_allowance: Decimal
    other_allowance: Decimal
    eobi_rate: Decimal
    tax_rate: Decimal
    bank_name: Optional[str]
    bank_account_number: Optional[str]
    company_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SalarySlipResponse(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: str
    month: int
    year: int
    basic_salary: Decimal
    house_rent_allowance: Decimal
    medical_allowance: Decimal
    other_allowance: Decimal
    gross_salary: Decimal
    eobi_deduction: Decimal
    tax_deduction: Decimal
    other_deductions: Decimal
    total_deductions: Decimal
    net_salary: Decimal
    payment_date: Optional[datetime]
    payment_method: Optional[str]
    is_paid: bool
    company_id: UUID
    created_at: datetime


class RunPayrollRequest(BaseModel):
    month: int
    year: int


class RunPayrollResponse(BaseModel):
    success: bool
    message: str
    payroll_run_id: UUID
    employees_processed: int
    total_amount: Decimal


class PayrollRunResponse(BaseModel):
    id: UUID
    month: int
    year: int
    total_employees: int
    total_amount: Decimal
    status: str  # draft, processed, paid
    company_id: UUID
    created_at: datetime
    created_by: UUID


@router.get("/employees", response_model=List[EmployeeResponse])
async def list_employees(
    is_active: Optional[bool] = True,
    current_user: User = Depends(get_current_user)
):
    """List all employees"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    query = supabase.table("employees").select("*").eq("company_id", str(current_user.company_id))
    if is_active is not None:
        query = query.eq("is_active", is_active)

    response = query.order("full_name").execute()

    return [EmployeeResponse(**emp) for emp in response.data]


@router.post("/employees", response_model=EmployeeResponse)
async def create_employee(
    employee_data: EmployeeCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new employee"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Check for duplicate CNIC
    existing = supabase.table("employees").select("id").eq("cnic", employee_data.cnic).eq("company_id", str(current_user.company_id)).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee with this CNIC already exists")

    emp_dict = employee_data.model_dump()
    emp_dict["company_id"] = str(current_user.company_id)
    emp_dict["join_date"] = employee_data.join_date.isoformat()
    emp_dict["is_active"] = True

    response = supabase.table("employees").insert(emp_dict).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create employee")

    return EmployeeResponse(**response.data[0])


@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Get employee details"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    response = supabase.table("employees").select("*").eq("id", str(employee_id)).eq("company_id", str(current_user.company_id)).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    return EmployeeResponse(**response.data[0])


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: UUID,
    employee_data: EmployeeUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update employee details"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Check employee exists
    existing = supabase.table("employees").select("*").eq("id", str(employee_id)).eq("company_id", str(current_user.company_id)).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    update_data = employee_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()

    response = supabase.table("employees").update(update_data).eq("id", str(employee_id)).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update employee")

    return EmployeeResponse(**response.data[0])


@router.post("/run", response_model=RunPayrollResponse)
async def run_payroll(
    payroll_data: RunPayrollRequest,
    current_user: User = Depends(get_current_user)
):
    """Run payroll for a specific month"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Check if payroll already run for this month
    existing = supabase.table("payroll_runs").select("id").eq("month", payroll_data.month).eq("year", payroll_data.year).eq("company_id", str(current_user.company_id)).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payroll already run for this month")

    # Get all active employees
    employees_response = supabase.table("employees").select("*").eq("company_id", str(current_user.company_id)).eq("is_active", True).execute()

    if not employees_response.data or len(employees_response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active employees found")

    total_amount = Decimal("0")
    employees_processed = 0

    # Create payroll run
    payroll_run_dict = {
        "month": payroll_data.month,
        "year": payroll_data.year,
        "company_id": str(current_user.company_id),
        "created_by": str(current_user.id),
        "status": "draft",
    }
    payroll_run_response = supabase.table("payroll_runs").insert(payroll_run_dict).execute()
    payroll_run_id = payroll_run_response.data[0]["id"]

    for emp in employees_response.data:
        try:
            basic = Decimal(str(emp["basic_salary"]))
            hra = Decimal(str(emp.get("house_rent_allowance", 0)))
            medical = Decimal(str(emp.get("medical_allowance", 0)))
            other_allowances = Decimal(str(emp.get("other_allowance", 0)))

            # Calculate gross
            gross = basic + hra + medical + other_allowances

            # Calculate deductions
            eobi_rate = Decimal(str(emp.get("eobi_rate", 1)))
            eobi_deduction = basic * (eobi_rate / Decimal("100"))

            # Simple tax calculation (can be customized)
            tax_rate = Decimal(str(emp.get("tax_rate", 0)))
            tax_deduction = gross * (tax_rate / Decimal("100"))

            total_deductions = eobi_deduction + tax_deduction
            net_salary = gross - total_deductions

            # Create salary slip
            slip_dict = {
                "payroll_run_id": payroll_run_id,
                "employee_id": str(emp["id"]),
                "month": payroll_data.month,
                "year": payroll_data.year,
                "basic_salary": float(basic),
                "house_rent_allowance": float(hra),
                "medical_allowance": float(medical),
                "other_allowance": float(other_allowances),
                "gross_salary": float(gross),
                "eobi_deduction": float(eobi_deduction),
                "tax_deduction": float(tax_deduction),
                "other_deductions": 0,
                "total_deductions": float(total_deductions),
                "net_salary": float(net_salary),
                "is_paid": False,
                "company_id": str(current_user.company_id),
            }
            supabase.table("salary_slips").insert(slip_dict).execute()

            total_amount += net_salary
            employees_processed += 1

        except Exception as e:
            logger.error(f"Error processing payroll for employee {emp['id']}: {e}")
            continue

    # Update payroll run
    supabase.table("payroll_runs").update({
        "total_employees": employees_processed,
        "total_amount": float(total_amount),
        "status": "processed",
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", payroll_run_id).execute()

    # Create journal entry
    try:
        # Find Salary Expense account
        salary_expense = supabase.table("accounts").select("id").eq("code", "5220").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
        if not salary_expense.data or len(salary_expense.data) == 0:
            # Create account
            salary_expense_data = {
                "company_id": str(current_user.company_id),
                "code": "5220",
                "name": "Salaries Expense",
                "account_type": "expense",
            }
            salary_expense_response = supabase.table("accounts").insert(salary_expense_data).execute()
            salary_expense_id = salary_expense_response.data[0]["id"] if salary_expense_response.data else None
        else:
            salary_expense_id = salary_expense.data[0]["id"]

        # Find Cash/Bank account
        cash_account = supabase.table("accounts").select("id").eq("code", "1110").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
        cash_account_id = cash_account.data[0]["id"] if cash_account.data else None

        if salary_expense_id and cash_account_id:
            journal_data = {
                "company_id": str(current_user.company_id),
                "date": datetime.utcnow().isoformat(),
                "reference_type": "payroll",
                "reference_id": payroll_run_id,
                "description": f"Payroll for month {payroll_data.month}/{payroll_data.year}",
                "is_system_generated": True,
            }
            journal_response = supabase.table("journals").insert(journal_data).execute()

            if journal_response.data:
                journal_id = journal_response.data[0]["id"]

                # Debit Salary Expense
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": salary_expense_id,
                    "debit": float(total_amount),
                    "credit": 0,
                    "description": f"Salary expense for month {payroll_data.month}/{payroll_data.year}",
                }).execute()

                # Credit Cash
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": cash_account_id,
                    "debit": 0,
                    "credit": float(total_amount),
                    "description": f"Salary payment for month {payroll_data.month}/{payroll_data.year}",
                }).execute()
    except Exception as e:
        logger.error(f"Failed to create journal entry for payroll: {e}")

    return RunPayrollResponse(
        success=True,
        message=f"Payroll processed for {employees_processed} employees",
        payroll_run_id=payroll_run_id,
        employees_processed=employees_processed,
        total_amount=total_amount
    )


@router.get("/runs", response_model=List[PayrollRunResponse])
async def list_payroll_runs(
    current_user: User = Depends(get_current_user)
):
    """List all payroll runs"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    response = supabase.table("payroll_runs").select("*").eq("company_id", str(current_user.company_id)).order("year", desc=True).order("month", desc=True).execute()

    return [PayrollRunResponse(**run) for run in response.data]


@router.get("/slips", response_model=List[SalarySlipResponse])
async def list_salary_slips(
    month: Optional[int] = None,
    year: Optional[int] = None,
    employee_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user)
):
    """List salary slips with filters"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    query = supabase.table("salary_slips").select("*, employees(full_name)").eq("company_id", str(current_user.company_id))

    if month:
        query = query.eq("month", month)
    if year:
        query = query.eq("year", year)
    if employee_id:
        query = query.eq("employee_id", str(employee_id))

    response = query.order("year", desc=True).order("month", desc=True).execute()

    slips = []
    for slip in response.data:
        slips.append(SalarySlipResponse(
            id=slip["id"],
            employee_id=slip["employee_id"],
            employee_name=slip["employees"]["full_name"] if slip["employees"] else "Unknown",
            month=slip["month"],
            year=slip["year"],
            basic_salary=Decimal(str(slip["basic_salary"])),
            house_rent_allowance=Decimal(str(slip.get("house_rent_allowance", 0))),
            medical_allowance=Decimal(str(slip.get("medical_allowance", 0))),
            other_allowance=Decimal(str(slip.get("other_allowance", 0))),
            gross_salary=Decimal(str(slip["gross_salary"])),
            eobi_deduction=Decimal(str(slip.get("eobi_deduction", 0))),
            tax_deduction=Decimal(str(slip.get("tax_deduction", 0))),
            other_deductions=Decimal(str(slip.get("other_deductions", 0))),
            total_deductions=Decimal(str(slip["total_deductions"])),
            net_salary=Decimal(str(slip["net_salary"])),
            payment_date=slip.get("payment_date"),
            payment_method=slip.get("payment_method"),
            is_paid=slip["is_paid"],
            company_id=slip["company_id"],
            created_at=slip["created_at"]
        ))

    return slips


@router.get("/slips/{slip_id}", response_model=SalarySlipResponse)
async def get_salary_slip(
    slip_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Get salary slip details for printing"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    response = supabase.table("salary_slips").select("*, employees(full_name, email, cnic, designation, department)").eq("id", str(slip_id)).eq("company_id", str(current_user.company_id)).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary slip not found")

    slip = response.data[0]

    return SalarySlipResponse(
        id=slip["id"],
        employee_id=slip["employee_id"],
        employee_name=slip["employees"]["full_name"] if slip["employees"] else "Unknown",
        month=slip["month"],
        year=slip["year"],
        basic_salary=Decimal(str(slip["basic_salary"])),
        house_rent_allowance=Decimal(str(slip.get("house_rent_allowance", 0))),
        medical_allowance=Decimal(str(slip.get("medical_allowance", 0))),
        other_allowance=Decimal(str(slip.get("other_allowance", 0))),
        gross_salary=Decimal(str(slip["gross_salary"])),
        eobi_deduction=Decimal(str(slip.get("eobi_deduction", 0))),
        tax_deduction=Decimal(str(slip.get("tax_deduction", 0))),
        other_deductions=Decimal(str(slip.get("other_deductions", 0))),
        total_deductions=Decimal(str(slip["total_deductions"])),
        net_salary=Decimal(str(slip["net_salary"])),
        payment_date=slip.get("payment_date"),
        payment_method=slip.get("payment_method"),
        is_paid=slip["is_paid"],
        company_id=slip["company_id"],
        created_at=slip["created_at"]
    )
