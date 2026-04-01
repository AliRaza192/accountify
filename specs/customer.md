# Customer Module Specification

## Overview
Manage customer relationships, profiles, and transactions.

---

## User Stories

### US-1: Create Customer
**As** an accountant  
**I want** to create a customer profile  
**So that** I can track sales and receivables

**Acceptance Criteria:**
- Customer has name, email, phone, address
- Customer has unique ID (auto-generated)
- Customer is linked to company
- Credit limit can be set
- Payment terms can be configured (Net 30, Net 60, etc.)

### US-2: View Customer List
**As** a salesperson  
**I want** to view all customers  
**So that** I can see who I'm working with

**Acceptance Criteria:**
- List shows name, contact, balance
- Search by name, email, phone
- Filter by active/inactive
- Pagination supported
- Sort by name, balance, created date

### US-3: View Customer Detail
**As** a manager  
**I want** to see customer details  
**So that** I can understand their history

**Acceptance Criteria:**
- Shows profile information
- Shows transaction history (invoices, payments)
- Shows outstanding balance
- Shows credit limit status
- Shows contact person details

### US-4: Update Customer
**As** an admin  
**I want** to update customer information  
**So that** records stay current

**Acceptance Criteria:**
- All fields editable except ID
- Change history logged
- Balance not affected by profile updates
- Audit trail maintained

### US-5: Deactivate Customer
**As** an admin  
**I want** to deactivate a customer  
**So that** they can't be used for new transactions

**Acceptance Criteria:**
- Soft delete (is_deleted flag)
- Historical transactions preserved
- Customer not shown in default lists
- Can be reactivated if needed

---

## Data Model

### Customer Table
```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    cnic VARCHAR(20),
    ntn VARCHAR(50),
    strn VARCHAR(50),
    credit_limit DECIMAL(15, 2) DEFAULT 0,
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    price_list_id UUID,
    salesperson_id UUID,
    balance DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id)
);
```

---

## API Endpoints

### GET /api/customers
List all customers (with pagination, filtering, sorting)

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20)
- `search` (string, optional)
- `active` (boolean, optional)
- `sort_by` (string, default: 'name')
- `order` (string, default: 'asc')

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "ABC Corporation",
      "email": "info@abc.com",
      "phone": "+92-300-1234567",
      "balance": 50000,
      "credit_limit": 100000,
      "is_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### POST /api/customers
Create a new customer

**Request Body:**
```json
{
  "name": "ABC Corporation",
  "email": "info@abc.com",
  "phone": "+92-300-1234567",
  "address": "123 Business Street, Karachi",
  "cnic": "42101-1234567-1",
  "ntn": "1234567-89012",
  "credit_limit": 100000,
  "payment_terms": "Net 30"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "ABC Corporation",
  "created_at": "2025-01-15T10:30:00Z"
}
```

### GET /api/customers/:id
Get customer details

**Response:**
```json
{
  "id": "uuid",
  "name": "ABC Corporation",
  "email": "info@abc.com",
  "phone": "+92-300-1234567",
  "address": "123 Business Street, Karachi",
  "cnic": "42101-1234567-1",
  "ntn": "1234567-89012",
  "strn": "ST123456789",
  "credit_limit": 100000,
  "payment_terms": "Net 30",
  "balance": 50000,
  "is_active": true,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-20T14:20:00Z",
  "invoices": [...],
  "payments": [...]
}
```

### PUT /api/customers/:id
Update customer

**Request Body:** (same as POST, all fields optional)

### DELETE /api/customers/:id
Deactivate customer (soft delete)

---

## Business Rules

### BR-1: Customer Code Generation
- Auto-generate unique customer code
- Format: `CUST-YYYY-XXXXX`
- Example: `CUST-2025-00001`

### BR-2: Credit Limit Enforcement
- Warn if invoice exceeds credit limit
- Block invoice if configured in settings
- Credit limit check: `balance + new_invoice > credit_limit`

### BR-3: Payment Terms
- Default: Net 30 (payment due in 30 days)
- Options: Net 7, Net 15, Net 30, Net 60, Net 90
- Due date calculated from invoice date

### BR-4: Duplicate Detection
- Check for duplicate email/phone
- Warn if duplicate found
- Allow creation with warning

---

## Validation Rules

### Customer Name
- Required: Yes
- Min Length: 3 characters
- Max Length: 255 characters
- Pattern: Alphanumeric + spaces, special chars allowed

### Email
- Required: No (but recommended)
- Format: Valid email pattern
- Unique: Per company

### Phone
- Required: No
- Format: Pakistan phone format preferred
- Example: `+92-300-1234567` or `0300-1234567`

### CNIC
- Required: No
- Format: `XXXXX-XXXXXXX-X`
- Pattern: 5 digits - 7 digits - 1 digit

### NTN
- Required: For business customers
- Format: `XXXXXXX-XXXXX`
- Pattern: 7 digits - 5 digits

### STRN
- Required: For registered businesses
- Format: Alphanumeric
- Example: `ST123456789`

### Credit Limit
- Required: No
- Min: 0
- Max: Configurable per company settings
- Default: 0 (no limit)

---

## UI Requirements

### Customer List Page
- [ ] Search bar (name, email, phone)
- [ ] Filter dropdown (active/inactive/all)
- [ ] Sort options (name, balance, date)
- [ ] Pagination controls
- [ ] Create Customer button
- [ ] Export to Excel button
- [ ] Bulk actions (deactivate, export)

### Customer Detail Page
- [ ] Profile information card
- [ ] Contact information card
- [ ] Credit limit indicator (gauge/bar)
- [ ] Transaction history table
- [ ] Outstanding invoices list
- [ ] Payment history list
- [ ] Edit button
- [ ] Deactivate button

### Customer Form (Create/Edit)
- [ ] Name field (required)
- [ ] Email field (email validation)
- [ ] Phone field (pattern validation)
- [ ] Address textarea
- [ ] CNIC field (pattern validation)
- [ ] NTN field (pattern validation)
- [ ] STRN field
- [ ] Credit limit input (number)
- [ ] Payment terms dropdown
- [ ] Save button
- [ ] Cancel button

---

## Reports

### Customer Ledger
- All transactions for a customer
- Chronological order
- Running balance

### Customer Balance Report
- All customers with outstanding balances
- Aging buckets (current, 30, 60, 90+ days)

### Customer Sales Analysis
- Sales by customer (period-wise)
- Top customers by revenue
- Sales trend analysis

---

## Integration Points

### Sales Module
- Customer linked to invoices
- Customer linked to sales orders
- Customer linked to deliveries

### Accounts Module
- Customer linked to receivable accounts
- Customer payments recorded

### CRM Module
- Customer linked to tickets
- Customer linked to calls
- Customer linked to events

### POS Module
- Customer walk-in sales
- Customer credit sales at POS

---

## Test Cases

### Unit Tests
- [ ] Customer creation with valid data
- [ ] Customer creation with missing required fields
- [ ] Customer email validation
- [ ] Customer CNIC format validation
- [ ] Customer NTN format validation
- [ ] Credit limit boundary conditions
- [ ] Duplicate email detection
- [ ] Soft delete functionality
- [ ] Customer search functionality
- [ ] Customer list pagination

### Integration Tests
- [ ] Create customer via API
- [ ] Update customer via API
- [ ] Get customer list via API
- [ ] Customer balance update on invoice
- [ ] Customer balance update on payment
- [ ] Credit limit check on invoice creation

### E2E Tests
- [ ] Complete customer creation workflow
- [ ] Customer search and view
- [ ] Customer update workflow
- [ ] Customer deactivation workflow

---

## Dependencies

### Internal
- Company module (company_id)
- User profiles (created_by, salesperson_id)
- Price lists (price_list_id)

### External
- None for MVP
- SMS gateway (future: SMS notifications)
- Email service (future: email notifications)

---

## Migration Plan

### From Existing System
1. Export customers to CSV
2. Map fields to new schema
3. Import using bulk import tool
4. Verify data integrity
5. Test with sample customers

---

*Version: 1.0*  
*Status: Active*  
*Last Updated: 2025*
