# API Contracts: Phase 2 Modules

**Date**: 2026-04-02
**Purpose**: Define all API endpoints, request/response schemas, and error codes

**Base URL**: `/api/v1`
**Authentication**: Bearer JWT (required for all endpoints unless noted)
**Content Type**: `application/json`

---

## Module 1: Multi-Branch APIs

### GET /branches
**Description**: List all branches for current company (filtered by user's access)

**Query Parameters**:
- `is_active` (boolean, optional): Filter by active status
- `search` (string, optional): Search by name or code

**Response** (200 OK):
```json
{
  "branches": [
    {
      "id": 1,
      "company_id": 1,
      "name": "Karachi Head Office",
      "code": "KHI-01",
      "address": "123 Business Road, Karachi",
      "phone": "+92-21-1234567",
      "email": "karachi@company.com",
      "is_default": true,
      "is_active": true,
      "created_at": "2026-01-01T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

### POST /branches
**Description**: Create new branch

**Request Body**:
```json
{
  "name": "Lahore Branch",
  "code": "LHR-01",
  "address": "456 Commerce Street, Lahore",
  "phone": "+92-42-7654321",
  "email": "lahore@company.com",
  "is_default": false
}
```

**Response** (201 Created):
```json
{
  "id": 2,
  "name": "Lahore Branch",
  "code": "LHR-01",
  "created_at": "2026-04-02T10:00:00Z"
}
```

**Error Codes**:
- `BRANCH_CODE_EXISTS` (409): Branch code already taken
- `DEFAULT_BRANCH_EXISTS` (400): Cannot create multiple default branches

---

### GET /branches/:id
**Description**: Get branch details

**Response** (200 OK):
```json
{
  "id": 1,
  "company_id": 1,
  "name": "Karachi Head Office",
  "code": "KHI-01",
  "address": "123 Business Road, Karachi",
  "phone": "+92-21-1234567",
  "email": "karachi@company.com",
  "is_default": true,
  "is_active": true,
  "settings": {
    "price_list_id": 1,
    "tax_rate": 18.0,
    "currency": "PKR",
    "fiscal_year_start": "01-01"
  },
  "created_at": "2026-01-01T10:00:00Z"
}
```

**Error Codes**:
- `BRANCH_NOT_FOUND` (404): Branch doesn't exist

---

### PUT /branches/:id
**Description**: Update branch

**Request Body**:
```json
{
  "name": "Karachi Main Office",
  "is_active": false
}
```

**Response** (200 OK): Updated branch object

**Error Codes**:
- `BRANCH_NOT_FOUND` (404)
- `CANNOT_DEACTIVATE_DEFAULT` (400): Cannot deactivate default branch
- `BRANCH_HAS_TRANSACTIONS` (400): Cannot deactivate branch with pending transactions

---

### DELETE /branches/:id
**Description**: Soft delete branch (set is_active = false)

**Response** (204 No Content)

**Error Codes**:
- `BRANCH_NOT_FOUND` (404)
- `BRANCH_HAS_TRANSACTIONS` (400)

---

### POST /branches/transfer
**Description**: Initiate inter-branch stock transfer

**Request Body**:
```json
{
  "source_branch_id": 1,
  "destination_branch_id": 2,
  "items": [
    {
      "product_id": 101,
      "quantity": 50,
      "unit": "PCS"
    }
  ],
  "notes": "Monthly stock replenishment"
}
```

**Response** (201 Created):
```json
{
  "transfer_id": "TRF-2026-001",
  "status": "pending",
  "created_at": "2026-04-02T10:00:00Z"
}
```

**Error Codes**:
- `INVALID_BRANCH` (400): Source or destination invalid
- `INSUFFICIENT_STOCK` (400): Not enough stock at source
- `CIRCULAR_TRANSFER` (400): Source equals destination

---

### GET /branches/reports/consolidated
**Description**: Get consolidated report across all branches

**Query Parameters**:
- `report_type` (string, required): pl, balance_sheet, trial_balance
- `from_date` (date, required): Start date
- `to_date` (date, required): End date
- `include_inactive` (boolean, optional): Include inactive branches

**Response** (200 OK):
```json
{
  "report_type": "pl",
  "period": {
    "from": "2026-01-01",
    "to": "2026-03-31"
  },
  "consolidated": {
    "revenue": 5000000,
    "cogs": 3000000,
    "gross_profit": 2000000,
    "expenses": 1200000,
    "net_profit": 800000
  },
  "by_branch": [
    {
      "branch_id": 1,
      "branch_name": "Karachi Head Office",
      "revenue": 3000000,
      "net_profit": 500000
    },
    {
      "branch_id": 2,
      "branch_name": "Lahore Branch",
      "revenue": 2000000,
      "net_profit": 300000
    }
  ],
  "eliminations": {
    "inter_branch_receivable": 100000,
    "inter_branch_payable": -100000,
    "net_elimination": 0
  }
}
```

---

## Module 2: Workflow & Approvals APIs

### GET /approvals/workflows
**Description**: List approval workflows

**Query Parameters**:
- `module` (string, optional): Filter by module
- `is_active` (boolean, optional): Filter by status

**Response** (200 OK):
```json
{
  "workflows": [
    {
      "id": 1,
      "company_id": 1,
      "name": "Purchase Order Approval",
      "module": "purchase_orders",
      "condition_amount": 50000,
      "condition_operator": ">=",
      "levels_json": [...],
      "is_active": true
    }
  ]
}
```

---

### POST /approvals/workflows
**Description**: Create approval workflow

**Request Body**:
```json
{
  "name": "Expense Approval",
  "module": "expenses",
  "condition_amount": 10000,
  "condition_operator": ">=",
  "levels": [
    {
      "level": 1,
      "approver_role_id": 5,
      "condition": "amount < 50000"
    },
    {
      "level": 2,
      "approver_role_id": 3,
      "condition": "amount >= 50000"
    }
  ]
}
```

**Response** (201 Created): Created workflow

**Error Codes**:
- `INVALID_WORKFLOW_CONFIG` (400): Invalid levels or conditions
- `ROLE_NOT_FOUND` (400): Approver role doesn't exist

---

### GET /approvals/requests
**Description**: List approval requests (filtered by user's role)

**Query Parameters**:
- `status` (string, optional): pending, approved, rejected, cancelled
- `document_type` (string, optional): Filter by type
- `from_date` (date, optional): Filter by date
- `to_date` (date, optional)

**Response** (200 OK):
```json
{
  "requests": [
    {
      "id": 101,
      "workflow_id": 1,
      "workflow_name": "Purchase Order Approval",
      "document_type": "purchase_order",
      "document_id": 5001,
      "document_number": "PO-2026-001",
      "status": "pending",
      "current_level": 2,
      "requested_by": {
        "id": 10,
        "name": "John Doe"
      },
      "requested_at": "2026-04-01T14:30:00Z",
      "amount": 75000,
      "pending_with": {
        "role_id": 3,
        "role_name": "Finance Manager"
      }
    }
  ],
  "pending_count": 5
}
```

---

### GET /approvals/requests/:id
**Description**: Get approval request details with history

**Response** (200 OK):
```json
{
  "id": 101,
  "workflow": {
    "id": 1,
    "name": "Purchase Order Approval"
  },
  "document": {
    "type": "purchase_order",
    "id": 5001,
    "number": "PO-2026-001",
    "amount": 75000,
    "details": {...}
  },
  "status": "pending",
  "current_level": 2,
  "history": [
    {
      "level": 1,
      "action": "approved",
      "actioned_by": {
        "id": 5,
        "name": "Store Manager"
      },
      "comments": "Verified stock requirements",
      "actioned_at": "2026-04-01T15:00:00Z"
    }
  ],
  "pending_with": {
    "role_id": 3,
    "role_name": "Finance Manager"
  }
}
```

---

### POST /approvals/requests/:id/approve
**Description**: Approve request

**Request Body**:
```json
{
  "comments": "Approved - budget available",
  "delegate_to": null
}
```

**Response** (200 OK):
```json
{
  "id": 101,
  "status": "approved",
  "completed_at": "2026-04-02T10:00:00Z",
  "next_level": null
}
```

**Error Codes**:
- `NOT_AUTHORIZED` (403): User cannot approve at this level
- `ALREADY_ACTIONED` (400): Request already approved/rejected
- `INVALID_COMMENTS` (400): Comments required for rejection

---

### POST /approvals/requests/:id/reject
**Description**: Reject request

**Request Body**:
```json
{
  "comments": "Budget exceeded, please revise"
}
```

**Response** (200 OK):
```json
{
  "id": 101,
  "status": "rejected",
  "rejected_at": "2026-04-02T10:00:00Z",
  "rejected_by": {
    "id": 3,
    "name": "Finance Manager"
  }
}
```

**Error Codes**:
- `NOT_AUTHORIZED` (403)
- `ALREADY_ACTIONED` (400)
- `COMMENTS_REQUIRED` (400): Rejection requires comments

---

## Module 3: Budget Management APIs

### GET /budgets
**Description**: List budgets

**Query Parameters**:
- `fiscal_year` (integer, optional): Filter by year
- `status` (string, optional): draft, pending_approval, approved, rejected
- `branch_id` (integer, optional): Filter by branch

**Response** (200 OK):
```json
{
  "budgets": [
    {
      "id": 1,
      "company_id": 1,
      "branch_id": null,
      "fiscal_year": 2026,
      "name": "Annual Budget 2026",
      "status": "approved",
      "total_amount": 12000000,
      "approved_at": "2025-12-15T10:00:00Z",
      "created_at": "2025-11-01T10:00:00Z"
    }
  ]
}
```

---

### POST /budgets
**Description**: Create budget

**Request Body**:
```json
{
  "fiscal_year": 2026,
  "name": "Annual Budget 2026",
  "branch_id": null,
  "lines": [
    {
      "account_id": 101,
      "cost_center_id": null,
      "jan": 100000,
      "feb": 120000,
      "mar": 110000,
      "apr": 100000,
      "may": 100000,
      "jun": 100000,
      "jul": 100000,
      "aug": 100000,
      "sep": 100000,
      "oct": 100000,
      "nov": 100000,
      "dec": 100000,
      "total": 1230000,
      "notes": "Marketing expenses"
    }
  ]
}
```

**Response** (201 Created): Created budget with lines

**Error Codes**:
- `DUPLICATE_BUDGET` (409): Budget already exists for fiscal year
- `INVALID_LINES` (400): Line validation failed
- `TOTAL_MISMATCH` (400): Sum of lines doesn't match total

---

### GET /budgets/:id
**Description**: Get budget details with lines

**Response** (200 OK):
```json
{
  "id": 1,
  "fiscal_year": 2026,
  "name": "Annual Budget 2026",
  "status": "approved",
  "total_amount": 12000000,
  "lines": [...],
  "created_at": "2025-11-01T10:00:00Z"
}
```

---

### GET /budgets/:id/vs-actual
**Description**: Get budget vs actual comparison

**Response** (200 OK):
```json
{
  "budget_id": 1,
  "budget_name": "Annual Budget 2026",
  "fiscal_year": 2026,
  "lines": [
    {
      "account_id": 101,
      "account_name": "Marketing Expenses",
      "budget_amount": 1230000,
      "actual_amount": 850000,
      "variance": 380000,
      "variance_percent": 30.89,
      "status": "under_budget"
    },
    {
      "account_id": 102,
      "account_name": "Travel Expenses",
      "budget_amount": 500000,
      "actual_amount": 520000,
      "variance": -20000,
      "variance_percent": -4.0,
      "status": "over_budget"
    }
  ],
  "summary": {
    "total_budget": 12000000,
    "total_actual": 10500000,
    "total_variance": 1500000,
    "utilization_percent": 87.5
  },
  "alerts": [
    {
      "account_id": 102,
      "message": "Travel Expenses exceeded budget by 4%",
      "severity": "warning"
    }
  ]
}
```

---

### GET /budgets/reports/variance
**Description**: Get budget variance report

**Query Parameters**:
- `fiscal_year` (integer, required)
- `branch_id` (integer, optional)
- `variance_threshold` (number, optional): Only show variances > X%

**Response** (200 OK):
```json
{
  "fiscal_year": 2026,
  "generated_at": "2026-04-02T10:00:00Z",
  "over_budget": [
    {
      "account_name": "Travel Expenses",
      "budget": 500000,
      "actual": 520000,
      "variance": -20000,
      "variance_percent": -4.0
    }
  ],
  "under_budget": [
    {
      "account_name": "Marketing Expenses",
      "budget": 1230000,
      "actual": 850000,
      "variance": 380000,
      "variance_percent": 30.89
    }
  ],
  "summary": {
    "total_lines": 50,
    "over_budget_count": 5,
    "under_budget_count": 40,
    "on_target_count": 5
  }
}
```

---

## Module 4: User Roles & Security APIs

### GET /roles
**Description**: List all roles

**Query Parameters**:
- `include_system` (boolean, optional): Include system roles

**Response** (200 OK):
```json
{
  "roles": [
    {
      "id": 1,
      "company_id": null,
      "name": "Super Admin",
      "is_system": true,
      "permissions_json": {
        "modules": ["all"],
        "actions": {
          "*": ["create", "read", "update", "delete", "approve", "export"]
        }
      }
    },
    {
      "id": 5,
      "company_id": 1,
      "name": "Custom Role",
      "is_system": false,
      "permissions_json": {...}
    }
  ]
}
```

---

### POST /roles
**Description**: Create custom role

**Request Body**:
```json
{
  "name": "Sales Supervisor",
  "permissions": {
    "modules": ["sales", "crm", "reports"],
    "actions": {
      "sales": ["create", "read", "update", "approve"],
      "crm": ["create", "read", "update"],
      "reports": ["read"]
    }
  }
}
```

**Response** (201 Created): Created role

**Error Codes**:
- `ROLE_NAME_EXISTS` (409): Role name already exists
- `INVALID_PERMISSIONS` (400): Invalid permission structure
- `CANNOT_CREATE_SYSTEM` (400): Cannot create system roles

---

### PUT /roles/:id
**Description**: Update role permissions

**Request Body**:
```json
{
  "permissions": {
    "modules": ["sales", "crm", "reports", "inventory"],
    "actions": {...}
  }
}
```

**Response** (200 OK): Updated role

**Error Codes**:
- `ROLE_NOT_FOUND` (404)
- `CANNOT_MODIFY_SYSTEM` (403): Cannot modify system roles

---

### DELETE /roles/:id
**Description**: Delete custom role

**Response** (204 No Content)

**Error Codes**:
- `ROLE_NOT_FOUND` (404)
- `CANNOT_DELETE_SYSTEM` (403)
- `ROLE_IN_USE` (400): Role assigned to users

---

### GET /users/:id/roles
**Description**: Get user's assigned roles

**Response** (200 OK):
```json
{
  "user_id": 10,
  "roles": [
    {
      "role_id": 4,
      "role_name": "Sales Manager",
      "branch_id": 1,
      "branch_name": "Karachi Head Office",
      "is_primary": true,
      "assigned_at": "2026-01-01T10:00:00Z"
    }
  ],
  "effective_permissions": {
    "modules": ["sales", "crm", "reports"],
    "actions": {...}
  }
}
```

---

### POST /users/:id/roles
**Description**: Assign role to user

**Request Body**:
```json
{
  "role_id": 4,
  "branch_id": 1,
  "is_primary": true
}
```

**Response** (201 Created): Role assignment

**Error Codes**:
- `USER_NOT_FOUND` (404)
- `ROLE_NOT_FOUND` (404)
- `BRANCH_NOT_FOUND` (404)
- `DUPLICATE_ASSIGNMENT` (409): Role already assigned

---

### POST /auth/2fa/send-otp
**Description**: Send OTP for 2FA (rate limited)

**Request Body**:
```json
{
  "user_id": 10
}
```

**Response** (200 OK):
```json
{
  "message": "OTP sent to your email",
  "expires_in": 300
}
```

**Error Codes**:
- `USER_NOT_FOUND` (404)
- `OTP_RATE_LIMIT` (429): Too many OTP requests (max 3 per 15 min)
- `EMAIL_NOT_CONFIGURED` (500): Email service not configured

---

### POST /auth/2fa/verify-otp
**Description**: Verify OTP for 2FA

**Request Body**:
```json
{
  "user_id": 10,
  "otp": "123456"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
  "expires_in": 3600
}
```

**Error Codes**:
- `INVALID_OTP` (400): OTP doesn't match
- `OTP_EXPIRED` (400): OTP expired (5 min)
- `OTP_ALREADY_USED` (400): OTP already consumed

---

### GET /audit-logs
**Description**: Query audit logs

**Query Parameters**:
- `user_id` (integer, optional): Filter by user
- `table_name` (string, optional): Filter by table
- `record_id` (integer, optional): Filter by record
- `action` (string, optional): INSERT, UPDATE, DELETE
- `from_date` (date, optional): Date range start
- `to_date` (date, optional): Date range end

**Response** (200 OK):
```json
{
  "logs": [
    {
      "id": 1001,
      "company_id": 1,
      "user_id": 10,
      "user_name": "John Doe",
      "action": "UPDATE",
      "table_name": "sales_invoices",
      "record_id": 5001,
      "old_values": {
        "status": "draft",
        "total": 10000
      },
      "new_values": {
        "status": "posted",
        "total": 10000
      },
      "ip_address": "192.168.1.100",
      "created_at": "2026-04-02T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

### GET /users/:id/login-history
**Description**: Get user's login history

**Response** (200 OK):
```json
{
  "user_id": 10,
  "history": [
    {
      "id": 5001,
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "status": "success",
      "login_at": "2026-04-02T09:00:00Z",
      "logout_at": "2026-04-02T17:00:00Z"
    },
    {
      "id": 5000,
      "ip_address": "192.168.1.100",
      "status": "failed",
      "failure_reason": "Invalid password",
      "login_at": "2026-04-01T18:00:00Z"
    }
  ]
}
```

---

## Module 5: Manufacturing / BOM APIs

### GET /manufacturing/bom
**Description**: List BOM headers

**Query Parameters**:
- `product_id` (integer, optional): Filter by product
- `status` (string, optional): draft, active, archived

**Response** (200 OK):
```json
{
  "boms": [
    {
      "id": 1,
      "company_id": 1,
      "product_id": 101,
      "product_name": "Finished Product A",
      "version": 1,
      "status": "active",
      "effective_date": "2026-01-01",
      "component_count": 5,
      "created_at": "2025-12-01T10:00:00Z"
    }
  ]
}
```

---

### POST /manufacturing/bom
**Description**: Create BOM

**Request Body**:
```json
{
  "product_id": 101,
  "version": 1,
  "effective_date": "2026-04-01",
  "lines": [
    {
      "component_id": 201,
      "quantity": 2.5,
      "unit": "KG",
      "waste_percent": 5.0
    },
    {
      "component_id": 202,
      "quantity": 1,
      "unit": "PCS",
      "waste_percent": 0
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "product_id": 101,
  "version": 1,
  "status": "draft",
  "created_at": "2026-04-02T10:00:00Z"
}
```

**Error Codes**:
- `PRODUCT_NOT_FOUND` (404)
- `COMPONENT_NOT_FOUND` (404)
- `DUPLICATE_VERSION` (409): Version already exists for product
- `CIRCULAR_BOM` (400): Component references same product

---

### POST /manufacturing/bom/:id/activate
**Description**: Activate BOM

**Response** (200 OK):
```json
{
  "id": 1,
  "status": "active",
  "effective_date": "2026-04-01",
  "activated_at": "2026-04-02T10:00:00Z"
}
```

**Error Codes**:
- `BOM_NOT_FOUND` (404)
- `BOM_HAS_NO_LINES` (400): Cannot activate empty BOM

---

### GET /manufacturing/orders
**Description**: List production orders

**Query Parameters**:
- `status` (string, optional): planned, started, completed, cancelled
- `bom_id` (integer, optional): Filter by BOM
- `from_date` (date, optional)
- `to_date` (date, optional)

**Response** (200 OK):
```json
{
  "orders": [
    {
      "id": 1,
      "company_id": 1,
      "bom_id": 1,
      "product_name": "Finished Product A",
      "quantity": 100,
      "status": "started",
      "start_date": "2026-04-01",
      "end_date": "2026-04-05",
      "actual_start_date": "2026-04-01T09:00:00Z",
      "actual_hours": 24.5,
      "cost_center_id": 5
    }
  ]
}
```

---

### POST /manufacturing/orders
**Description**: Create production order

**Request Body**:
```json
{
  "bom_id": 1,
  "quantity": 100,
  "cost_center_id": 5,
  "start_date": "2026-04-01",
  "end_date": "2026-04-05",
  "labor_rate": 500
}
```

**Response** (201 Created): Created order

**Error Codes**:
- `BOM_NOT_FOUND` (404)
- `BOM_NOT_ACTIVE` (400): Can only use active BOMs
- `INVALID_QUANTITY` (400): Quantity must be positive

---

### POST /manufacturing/orders/:id/materials/issue
**Description**: Issue materials to production

**Request Body**:
```json
{
  "materials": [
    {
      "product_id": 201,
      "quantity": 250
    },
    {
      "product_id": 202,
      "quantity": 100
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "order_id": 1,
  "issued_at": "2026-04-01T10:00:00Z",
  "inventory_updated": true
}
```

**Error Codes**:
- `INSUFFICIENT_MATERIAL` (400): Not enough stock
- `INVALID_MATERIAL` (400): Material not in BOM

---

### POST /manufacturing/orders/:id/output
**Description**: Record finished goods output

**Request Body**:
```json
{
  "product_id": 101,
  "quantity": 95,
  "actual_hours": 24.5
}
```

**Response** (200 OK):
```json
{
  "order_id": 1,
  "output_quantity": 95,
  "total_cost": 52500,
  "unit_cost": 552.63,
  "variance": {
    "quantity_variance": -5,
    "cost_variance": 2500
  }
}
```

---

### POST /manufacturing/orders/:id/scrap
**Description**: Record scrap/waste

**Request Body**:
```json
{
  "product_id": 201,
  "quantity": 10,
  "reason": "Quality defect"
}
```

**Response** (200 OK): Scrap recorded

---

### GET /manufacturing/mrp
**Description**: Run Material Requirement Planning

**Query Parameters**:
- `from_date` (date, required): Planning horizon start
- `to_date` (date, required): Planning horizon end

**Response** (200 OK):
```json
{
  "planning_period": {
    "from": "2026-04-01",
    "to": "2026-04-30"
  },
  "production_orders": [
    {
      "order_id": 1,
      "product": "Finished Product A",
      "quantity": 100,
      "start_date": "2026-04-01"
    }
  ],
  "material_requirements": [
    {
      "component_id": 201,
      "component_name": "Raw Material X",
      "required_qty": 250,
      "available_qty": 200,
      "shortage_qty": 50,
      "suggested_action": "purchase",
      "suggested_qty": 50,
      "urgency": "high"
    }
  ],
  "summary": {
    "total_materials": 10,
    "shortages": 2,
    "surplus": 8
  }
}
```

---

## Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {...}
  }
}
```

**Common Error Codes**:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | User lacks permission |
| `NOT_FOUND` | 404 | Resource not found |
| `BAD_REQUEST` | 400 | Invalid request format |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

**Status**: ✅ API contracts complete - Ready for quickstart guide
