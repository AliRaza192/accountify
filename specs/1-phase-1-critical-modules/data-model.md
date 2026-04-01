# Data Model: Phase 1 Critical Modules

**Feature**: 1-phase-1-critical-modules  
**Date**: 2026-04-01  
**Database**: Supabase PostgreSQL (existing 19 tables + 15 new tables = 34 total)

---

## Entity Relationship Diagram (High-Level)

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   companies     │       │  user_profiles   │       │   accounts      │
├─────────────────┤       ├──────────────────┤       ├─────────────────┤
│ id              │       │ id               │       │ id              │
│ name            │       │ company_id (FK)  │       │ company_id (FK) │
│ ntn             │       │ user_id (FK)     │       │ code            │
│ strn            │       │ role             │       │ name            │
└────────┬────────┘       └────────┬─────────┘       │ type            │
         │                        │                   └────────┬────────┘
         │                        │                            │
         ├────────────────────────┼────────────────────────────┤
         │                        │                            │
         ▼                        ▼                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NEW TABLES (15)                               │
├─────────────────────────────────────────────────────────────────────┤
│  fixed_assets          asset_depreciation      cost_centers         │
│  asset_categories      asset_maintenance       cost_center_alloc    │
│  tax_rates             tax_returns             wht_transactions     │
│  bank_statements       reconciliation_sessions pdcs                 │
│  leads                 crm_tickets               loyalty_programs   │
└─────────────────────────────────────────────────────────────────────┘
         │                        │                            │
         ▼                        ▼                            ▼
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│ journal_entries │       │   customers      │       │    vendors      │
├─────────────────┤       ├──────────────────┤       ├─────────────────┤
│ id              │       │ id               │       │ id              │
│ company_id      │       │ company_id       │       │ company_id      │
│ date            │       │ name             │       │ name            │
│ description     │       │ ntn              │       │ ntn             │
└─────────────────┘       └──────────────────┘       └─────────────────┘
```

---

## Table Schemas

### 1. Fixed Assets Module (4 tables)

#### `fixed_assets`

**Purpose**: Track individual fixed assets with depreciation details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company ownership |
| `asset_code` | VARCHAR(20) | NOT NULL, UNIQUE per company | Auto-generated: FA-2025-001 |
| `name` | VARCHAR(200) | NOT NULL | Asset name (e.g., "Toyota Corolla 2024") |
| `category_id` | UUID | NOT NULL, FK → asset_categories(id) | Asset category |
| `purchase_date` | DATE | NOT NULL | Date of purchase |
| `purchase_cost` | DECIMAL(15,2) | NOT NULL, CHECK > 0 | Original purchase cost |
| `useful_life_months` | INTEGER | NOT NULL, CHECK > 0 | Useful life in months |
| `residual_value_percent` | DECIMAL(5,2) | NOT NULL, DEFAULT 10, CHECK 0-100 | Residual value as % of cost |
| `depreciation_method` | VARCHAR(10) | NOT NULL, CHECK IN ('SLM', 'WDV') | Depreciation method |
| `location` | VARCHAR(100) | NULL | Branch/department location |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'active' | active, disposed, sold, fully_depreciated |
| `photo_url` | VARCHAR(500) | NULL | Supabase Storage URL |
| `document_urls` | JSONB | NULL, DEFAULT '[]' | Array of document URLs |
| `created_by` | UUID | NOT NULL, FK → user_profiles(id) | Creator |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update |

**Indexes**:
- `idx_fixed_assets_company` ON `fixed_assets(company_id)`
- `idx_fixed_assets_category` ON `fixed_assets(category_id)`
- `idx_fixed_assets_status` ON `fixed_assets(status)`
- `idx_fixed_assets_code` ON `fixed_assets(company_id, asset_code)` UNIQUE

**RLS Policies**:
- `SELECT`: Users can view assets from their company
- `INSERT`: Users with 'admin', 'accountant' role can create
- `UPDATE`: Users with 'admin', 'accountant' role can update
- `DELETE`: Users with 'admin' role can delete (soft delete via status)

---

#### `asset_categories`

**Purpose**: Define asset categories with depreciation rates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company ownership |
| `name` | VARCHAR(100) | NOT NULL | Category name |
| `depreciation_rate_percent` | DECIMAL(5,2) | NOT NULL, CHECK 0-100 | Annual depreciation rate |
| `depreciation_method` | VARCHAR(10) | NOT NULL, DEFAULT 'SLM' | SLM or WDV |
| `account_code` | VARCHAR(20) | NOT NULL | Chart of accounts code |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Seed Data** (per FBR Third Schedule):
```sql
INSERT INTO asset_categories (company_id, name, depreciation_rate_percent, depreciation_method, account_code) VALUES
  (company_uuid, 'Buildings', 5.0, 'SLM', '01-01'),
  (company_uuid, 'Plant & Machinery', 15.0, 'WDV', '01-02'),
  (company_uuid, 'Vehicles', 20.0, 'WDV', '01-03'),
  (company_uuid, 'Computers & IT Equipment', 30.0, 'WDV', '01-04'),
  (company_uuid, 'Furniture & Fixtures', 10.0, 'SLM', '01-05'),
  (company_uuid, 'Intangible Assets', 10.0, 'SLM', '01-06');
```

**Indexes**:
- `idx_asset_categories_company` ON `asset_categories(company_id)`

---

#### `asset_depreciation`

**Purpose**: Track monthly depreciation postings with journal entry links

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `asset_id` | UUID | NOT NULL, FK → fixed_assets(id) | Asset reference |
| `period_month` | INTEGER | NOT NULL, CHECK 1-12 | Depreciation period month |
| `period_year` | INTEGER | NOT NULL, CHECK 2020-2100 | Depreciation period year |
| `depreciation_amount` | DECIMAL(15,2) | NOT NULL, CHECK >= 0 | Monthly depreciation |
| `accumulated_depreciation` | DECIMAL(15,2) | NOT NULL, CHECK >= 0 | Total depreciation to date |
| `book_value` | DECIMAL(15,2) | NOT NULL, CHECK >= 0 | Net book value after depreciation |
| `journal_entry_id` | UUID | NOT NULL, FK → journal_entries(id) | Link to JE |
| `posted_by` | UUID | NOT NULL, FK → user_profiles(id) | User who posted |
| `posted_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Posting timestamp |

**Indexes**:
- `idx_asset_depreciation_asset` ON `asset_depreciation(asset_id)`
- `idx_asset_depreciation_period` ON `asset_depreciation(period_month, period_year)`
- `idx_asset_depreciation_journal` ON `asset_depreciation(journal_entry_id)`
- `idx_asset_depreciation_unique` ON `asset_depreciation(asset_id, period_month, period_year)` UNIQUE

**Business Rules**:
- One depreciation entry per asset per period
- Cannot depreciate if book_value <= residual_value
- Journal entry must have: Dr Depreciation Expense, Cr Accumulated Depreciation

---

#### `asset_maintenance`

**Purpose**: Log asset maintenance history and costs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `asset_id` | UUID | NOT NULL, FK → fixed_assets(id) | Asset reference |
| `service_date` | DATE | NOT NULL | Date of service |
| `service_type` | VARCHAR(100) | NOT NULL | Type of service (e.g., "Oil Change", "Annual Service") |
| `service_provider` | VARCHAR(200) | NULL | Service provider name |
| `cost` | DECIMAL(15,2) | NOT NULL, CHECK >= 0 | Service cost |
| `next_service_due` | DATE | NULL | Next scheduled service date |
| `notes` | TEXT | NULL | Additional notes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes**:
- `idx_asset_maintenance_asset` ON `asset_maintenance(asset_id)`
- `idx_asset_maintenance_date` ON `asset_maintenance(service_date)`

---

### 2. Cost Center Module (2 tables)

#### `cost_centers`

**Purpose**: Define departments/segments for P&L allocation

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company ownership |
| `code` | VARCHAR(20) | NOT NULL, UNIQUE per company | Cost center code (e.g., CC-001) |
| `name` | VARCHAR(100) | NOT NULL | Department name |
| `description` | TEXT | NULL | Detailed description |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'active' | active, inactive |
| `overhead_allocation_rule` | JSONB | NULL | Rule for overhead allocation |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Overhead Allocation Rule Schema**:
```json
{
  "type": "percentage",  // percentage, equal_split, by_headcount, by_area
  "value": 25.0,         // for percentage: 25%
  "source_account": "5010"  // Rent Expense account code
}
```

**Indexes**:
- `idx_cost_centers_company` ON `cost_centers(company_id)`
- `idx_cost_centers_code` ON `cost_centers(company_id, code)` UNIQUE
- `idx_cost_centers_status` ON `cost_centers(status)`

---

#### `cost_center_allocations`

**Purpose**: Link transactions to cost centers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `cost_center_id` | UUID | NOT NULL, FK → cost_centers(id) | Cost center |
| `transaction_type` | VARCHAR(20) | NOT NULL | journal_entry, invoice, bill, expense |
| `transaction_id` | UUID | NOT NULL | Reference to transaction |
| `amount` | DECIMAL(15,2) | NOT NULL | Allocated amount |
| `allocation_percent` | DECIMAL(5,2) | NOT NULL, DEFAULT 100 | Percentage of total |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes**:
- `idx_cost_center_alloc_cc` ON `cost_center_allocations(cost_center_id)`
- `idx_cost_center_alloc_transaction` ON `cost_center_allocations(transaction_type, transaction_id)`

**Business Rules**:
- Sum of allocations for a transaction MUST equal 100%
- Each transaction can be split across multiple cost centers

---

### 3. Tax Management Module (3 tables)

#### `tax_rates`

**Purpose**: Define tax rates with effective dates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company ownership |
| `tax_name` | VARCHAR(100) | NOT NULL | e.g., "GST 17%", "WHT 153 Services" |
| `rate_percent` | DECIMAL(5,2) | NOT NULL, CHECK 0-100 | Tax rate |
| `tax_type` | VARCHAR(20) | NOT NULL | sales_tax, input_tax, wht, federal_excise |
| `effective_date` | DATE | NOT NULL | Rate effective from |
| `end_date` | DATE | NULL | Rate expiry (if applicable) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Seed Data** (FBR Rates 2025):
```sql
INSERT INTO tax_rates (company_id, tax_name, rate_percent, tax_type, effective_date) VALUES
  (company_uuid, 'GST 17%', 17.0, 'sales_tax', '2025-07-01'),
  (company_uuid, 'GST 5%', 5.0, 'sales_tax', '2025-07-01'),
  (company_uuid, 'WHT 153 Goods', 1.5, 'wht', '2025-07-01'),
  (company_uuid, 'WHT 153A Services', 6.0, 'wht', '2025-07-01'),
  (company_uuid, 'WHT 155 Rent Commercial', 10.0, 'wht', '2025-07-01');
```

**Indexes**:
- `idx_tax_rates_company` ON `tax_rates(company_id)`
- `idx_tax_rates_type` ON `tax_rates(company_id, tax_type, is_active)`
- `idx_tax_rates_effective` ON `tax_rates(effective_date)`

---

#### `tax_returns`

**Purpose**: Track monthly/quarterly tax return filings

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company ownership |
| `return_period_month` | INTEGER | NOT NULL, CHECK 1-12 | Tax period month |
| `return_period_year` | INTEGER | NOT NULL, CHECK 2020-2100 | Tax period year |
| `output_tax_total` | DECIMAL(15,2) | NOT NULL, DEFAULT 0 | Total output tax |
| `input_tax_total` | DECIMAL(15,2) | NOT NULL, DEFAULT 0 | Total input tax |
| `net_tax_payable` | DECIMAL(15,2) | NOT NULL | output - input |
| `filed_date` | DATE | NULL | Date return was filed |
| `challan_number` | VARCHAR(50) | NULL | FBR challan number |
| `challan_date` | DATE | NULL | Challan payment date |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'draft' | draft, filed, paid |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update |

**Indexes**:
- `idx_tax_returns_company` ON `tax_returns(company_id)`
- `idx_tax_returns_period` ON `tax_returns(return_period_month, return_period_year)`
- `idx_tax_returns_status` ON `tax_returns(status)`
- `idx_tax_returns_unique` ON `tax_returns(company_id, return_period_month, return_period_year)` UNIQUE

---

#### `wht_transactions`

**Purpose**: Track individual WHT deductions for challan generation

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company ownership |
| `transaction_date` | DATE | NOT NULL | Date of WHT deduction |
| `party_id` | UUID | NOT NULL | FK → customers(id) OR vendors(id) |
| `party_type` | VARCHAR(10) | NOT NULL | customer, vendor |
| `amount` | DECIMAL(15,2) | NOT NULL | Transaction amount (before WHT) |
| `wht_category` | VARCHAR(50) | NOT NULL | Section 153, 153A, 155, etc. |
| `wht_rate` | DECIMAL(5,2) | NOT NULL | WHT rate applied |
| `wht_amount` | DECIMAL(15,2) | NOT NULL | WHT deducted |
| `challan_id` | UUID | NULL, FK → tax_returns(id) | Linked challan |
| `is_filer` | BOOLEAN | NOT NULL | Whether party is filer |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes**:
- `idx_wht_transactions_company` ON `wht_transactions(company_id)`
- `idx_wht_transactions_date` ON `wht_transactions(transaction_date)`
- `idx_wht_transactions_challan` ON `wht_transactions(challan_id)`
- `idx_wht_transactions_category` ON `wht_transactions(wht_category)`

---

### 4. Bank Reconciliation Module (3 tables)

#### `bank_statements`

**Purpose**: Store imported bank statement data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company ownership |
| `bank_account_id` | UUID | NOT NULL, FK → bank_accounts(id) | Bank account |
| `statement_date` | DATE | NOT NULL | Statement period end date |
| `opening_balance` | DECIMAL(15,2) | NOT NULL | Opening balance |
| `closing_balance` | DECIMAL(15,2) | NOT NULL | Closing balance |
| `transactions_json` | JSONB | NOT NULL | Array of transaction objects |
| `imported_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Import timestamp |
| `imported_by` | UUID | NOT NULL, FK → user_profiles(id) | User who imported |

**Transactions JSON Schema**:
```json
[
  {
    "date": "2025-01-15",
    "description": "CHEQUE-123456",
    "debit": 50000,
    "credit": 0,
    "balance": 150000,
    "cheque_number": "123456"
  }
]
```

**Indexes**:
- `idx_bank_statements_company` ON `bank_statements(company_id)`
- `idx_bank_statements_account` ON `bank_statements(bank_account_id)`
- `idx_bank_statements_date` ON `bank_statements(statement_date)`

---

#### `reconciliation_sessions`

**Purpose**: Track bank reconciliation process and results

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company ownership |
| `bank_account_id` | UUID | NOT NULL, FK → bank_accounts(id) | Bank account |
| `period_month` | INTEGER | NOT NULL, CHECK 1-12 | Reconciliation period |
| `period_year` | INTEGER | NOT NULL, CHECK 2020-2100 | Reconciliation year |
| `opening_balance` | DECIMAL(15,2) | NOT NULL | Opening balance |
| `closing_balance_per_bank` | DECIMAL(15,2) | NOT NULL | Per bank statement |
| `closing_balance_per_books` | DECIMAL(15,2) | NOT NULL | Per company books |
| `reconciled_transactions` | JSONB | NOT NULL, DEFAULT '[]' | Array of matched transaction IDs |
| `difference` | DECIMAL(15,2) | NOT NULL, DEFAULT 0 | Must be 0 to complete |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'in_progress' | in_progress, completed |
| `completed_at` | DATE | NULL | Completion date |
| `completed_by` | UUID | NULL, FK → user_profiles(id) | User who completed |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes**:
- `idx_reconciliation_company` ON `reconciliation_sessions(company_id)`
- `idx_reconciliation_account` ON `reconciliation_sessions(bank_account_id)`
- `idx_reconciliation_period` ON `reconciliation_sessions(period_month, period_year)`
- `idx_reconciliation_status` ON `reconciliation_sessions(status)`

---

#### `pdcs`

**Purpose**: Track post-dated cheques (received and issued)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company ownership |
| `cheque_number` | VARCHAR(20) | NOT NULL | Cheque number |
| `bank_name` | VARCHAR(100) | NOT NULL | Bank name |
| `cheque_date` | DATE | NOT NULL | Cheque date (future) |
| `amount` | DECIMAL(15,2) | NOT NULL | Cheque amount |
| `party_type` | VARCHAR(10) | NOT NULL | customer, vendor |
| `party_id` | UUID | NOT NULL | FK → customers(id) OR vendors(id) |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | pending, deposited, cleared, bounced, returned |
| `deposited_at` | DATE | NULL | Date deposited in bank |
| `cleared_at` | DATE | NULL | Date cleared |
| `bounced_at` | DATE | NULL | Date bounced |
| `bounce_reason` | VARCHAR(200) | NULL | Reason for bounce |
| `payment_id` | UUID | NULL, FK → payments(id) | Linked payment |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update |

**Indexes**:
- `idx_pdcs_company` ON `pdcs(company_id)`
- `idx_pdcs_date` ON `pdcs(cheque_date)`
- `idx_pdcs_status` ON `pdcs(status)`
- `idx_pdcs_party` ON `pdcs(party_type, party_id)`

**Business Rules**:
- Status transitions: pending → deposited → cleared (or bounced)
- Bounced PDCs reinstate the original receivable/payable
- PDCs older than 6 months flagged as "stale"

---

### 5. CRM Module (3 tables)

#### `leads`

**Purpose**: Track potential customers in sales pipeline

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company ownership |
| `lead_code` | VARCHAR(20) | NOT NULL, UNIQUE per company | Auto-generated: LEAD-2025-001 |
| `name` | VARCHAR(200) | NOT NULL | Contact name |
| `contact_phone` | VARCHAR(20) | NULL | Phone number |
| `contact_email` | VARCHAR(100) | NULL | Email address |
| `source` | VARCHAR(50) | NOT NULL | website, whatsapp, referral, walk_in, cold_call |
| `requirement` | TEXT | NULL | Customer requirement |
| `estimated_value` | DECIMAL(15,2) | NULL | Expected deal value |
| `probability_percent` | INTEGER | NOT NULL, DEFAULT 50, CHECK 0-100 | Conversion probability |
| `stage` | VARCHAR(50) | NOT NULL, DEFAULT 'new' | new, contacted, proposal, negotiation, converted, lost |
| `assigned_to` | UUID | NULL, FK → user_profiles(id) | Assigned salesperson |
| `follow_up_date` | DATE | NULL | Next follow-up date |
| `ai_score` | INTEGER | NULL, CHECK 0-100 | AI-generated lead score |
| `converted_to_customer_id` | UUID | NULL, FK → customers(id) | Converted customer |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update |

**Indexes**:
- `idx_leads_company` ON `leads(company_id)`
- `idx_leads_code` ON `leads(company_id, lead_code)` UNIQUE
- `idx_leads_stage` ON `leads(stage)`
- `idx_leads_source` ON `leads(source)`
- `idx_leads_assigned` ON `leads(assigned_to)`
- `idx_leads_followup` ON `leads(follow_up_date)`

---

#### `crm_tickets`

**Purpose**: Track customer support tickets

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company ownership |
| `ticket_number` | VARCHAR(20) | NOT NULL, UNIQUE per company | Auto-generated: TKT-2025-001 |
| `customer_id` | UUID | NOT NULL, FK → customers(id) | Customer |
| `issue_category` | VARCHAR(50) | NOT NULL | billing, technical, general, complaint |
| `priority` | VARCHAR(20) | NOT NULL, DEFAULT 'medium' | low, medium, high, critical |
| `assigned_to` | UUID | NULL, FK → user_profiles(id) | Assigned agent |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'open' | open, in_progress, waiting_customer, resolved, closed |
| `description` | TEXT | NOT NULL | Issue description |
| `resolution_notes` | TEXT | NULL | Resolution details |
| `satisfaction_rating` | INTEGER | NULL, CHECK 1-5 | Customer rating (1-5 stars) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| `resolved_at` | TIMESTAMPTZ | NULL | Resolution timestamp |

**Indexes**:
- `idx_tickets_company` ON `crm_tickets(company_id)`
- `idx_tickets_number` ON `crm_tickets(company_id, ticket_number)` UNIQUE
- `idx_tickets_customer` ON `crm_tickets(customer_id)`
- `idx_tickets_status` ON `crm_tickets(status)`
- `idx_tickets_priority` ON `crm_tickets(priority)`
- `idx_tickets_assigned` ON `crm_tickets(assigned_to)`

---

#### `loyalty_programs`

**Purpose**: Define loyalty program rules and track points

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company ownership |
| `program_name` | VARCHAR(100) | NOT NULL | Program name |
| `points_per_rupee` | DECIMAL(5,2) | NOT NULL, DEFAULT 1.0 | Points earned per PKR spent |
| `redemption_rate` | DECIMAL(5,2) | NOT NULL, DEFAULT 1.0 | PKR value per point |
| `tier_benefits_json` | JSONB | NULL | Tier definitions |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Tier Benefits JSON Schema**:
```json
{
  "tiers": [
    {"name": "Silver", "min_points": 0, "bonus_multiplier": 1.0},
    {"name": "Gold", "min_points": 10000, "bonus_multiplier": 1.2},
    {"name": "Platinum", "min_points": 50000, "bonus_multiplier": 1.5}
  ]
}
```

**Indexes**:
- `idx_loyalty_programs_company` ON `loyalty_programs(company_id)`

---

## Migration SQL

Complete migration script will be generated in `/backend/app/migrations/002_phase_1_modules.sql`

---

## Next Steps

1. Review schema with database team
2. Generate RLS policies for all tables
3. Create indexes for performance
4. Seed data for tax rates, asset categories
5. Test foreign key relationships
