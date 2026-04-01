# /sp.tasks - Generate Actionable Tasks

## Command
`/sp.tasks [module/feature name]`

## Purpose
Break implementation plan into actionable, executable tasks

## Instructions

1. **Prerequisites Check**
   - Ensure implementation plan exists and is approved
   - Read the plan from previous `/sp.plan` output

2. **Generate Tasks** with this structure:

```markdown
# Tasks: [Feature Name]

## Task List

### Task 1: [Task Name]
**Priority:** High/Medium/Low  
**Complexity:** S/M/L/XL  
**Dependencies:** None/Task X  

**Description:**
[What needs to be done]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Files to Create/Modify:**
- `path/to/file1.py`
- `path/to/file2.ts`

**Estimated Time:** X hours
```

3. **Task Guidelines**
   - Each task should be completable in 1-4 hours
   - Tasks should be independent where possible
   - Order tasks by dependency
   - Mark parallel tasks with `⫽` symbol

4. **Task Categories**

**Backend Tasks:**
- Database migrations
- Schema updates
- API endpoints
- Business logic
- Tests

**Frontend Tasks:**
- Type definitions
- Component creation
- API integration
- State management
- Tests

**DevOps Tasks:**
- CI/CD updates
- Environment variables
- Documentation

5. **Output Format**
   - Numbered task list
   - Clear acceptance criteria
   - File paths specified
   - Time estimates

## Example

User: `/sp.tasks Customer Credit Limit`

AI:
# Tasks: Customer Credit Limit

## Task List

### Task 1: Database Migration
**Priority:** High  
**Complexity:** S  
**Dependencies:** None  
**Parallel:** ⫽ Task 2

**Description:**
Add credit_limit and credit_limit_action columns to customers table.

**Acceptance Criteria:**
- [ ] Migration file created
- [ ] Migration tested on local DB
- [ ] Rollback migration works

**Files to Create/Modify:**
- `backend/database/migrations/add_credit_limit_to_customers.sql`

**Estimated Time:** 1 hour

---

### Task 2: Update Backend Schemas
**Priority:** High  
**Complexity:** S  
**Dependencies:** None  
**Parallel:** ⫽ Task 1

**Description:**
Add credit_limit fields to Pydantic schemas.

**Acceptance Criteria:**
- [ ] CustomerCreate schema has credit_limit
- [ ] CustomerUpdate schema has credit_limit
- [ ] CustomerResponse includes credit_limit
- [ ] Validation for credit_limit (min: 0)

**Files to Create/Modify:**
- `backend/app/schemas/customer.py`

**Estimated Time:** 1 hour

---

### Task 3: Update Frontend Types
**Priority:** High  
**Complexity:** S  
**Dependencies:** None  
**Parallel:** ⫽ Task 1, Task 2

**Description:**
Add credit_limit fields to TypeScript types.

**Acceptance Criteria:**
- [ ] Customer type has credit_limit field
- [ ] CustomerForm type updated
- [ ] Type-safe API client updated

**Files to Create/Modify:**
- `frontend/src/types/customer.ts`

**Estimated Time:** 1 hour

---

### Task 4: Credit Limit API Endpoint
**Priority:** High  
**Complexity:** M  
**Dependencies:** Task 1, Task 2

**Description:**
Create API endpoint to update and check credit limit.

**Acceptance Criteria:**
- [ ] PUT /api/customers/:id/credit-limit works
- [ ] POST /api/customers/:id/credit-check works
- [ ] Endpoint tests pass
- [ ] Error handling implemented

**Files to Create/Modify:**
- `backend/app/routers/customers.py`
- `backend/tests/test_customers.py`

**Estimated Time:** 3 hours

---

### Task 5: Customer Form UI
**Priority:** High  
**Complexity:** M  
**Dependencies:** Task 3

**Description:**
Add credit limit fields to customer form.

**Acceptance Criteria:**
- [ ] Credit limit input field added
- [ ] Credit limit action dropdown (warn/block)
- [ ] Form validation works
- [ ] Save updates credit limit

**Files to Create/Modify:**
- `frontend/src/app/dashboard/customers/[id]/edit/page.tsx`
- `frontend/src/components/customer/customer-form.tsx`

**Estimated Time:** 3 hours

---

### Task 6: Invoice Credit Check
**Priority:** High  
**Complexity:** M  
**Dependencies:** Task 4

**Description:**
Add credit limit check when creating invoice.

**Acceptance Criteria:**
- [ ] Check runs on invoice total calculation
- [ ] Warning banner shows if exceeded
- [ ] Block option prevents invoice creation
- [ ] Error message is clear

**Files to Create/Modify:**
- `frontend/src/app/dashboard/invoices/create/page.tsx`
- `frontend/src/components/invoice/credit-check-banner.tsx`

**Estimated Time:** 4 hours

---

### Task 7: Write Tests
**Priority:** High  
**Complexity:** M  
**Dependencies:** Task 4, Task 5, Task 6

**Description:**
Write unit, integration, and E2E tests.

**Acceptance Criteria:**
- [ ] Unit tests for validation
- [ ] Integration tests for API
- [ ] E2E test for full workflow
- [ ] All tests pass

**Files to Create/Modify:**
- `backend/tests/test_customers.py`
- `frontend/tests/e2e/customer-credit-limit.spec.ts`

**Estimated Time:** 4 hours

---

### Task 8: Documentation
**Priority:** Low  
**Complexity:** S  
**Dependencies:** All tasks

**Description:**
Update user documentation and API docs.

**Acceptance Criteria:**
- [ ] User guide updated
- [ ] API documentation updated
- [ ] Changelog entry added

**Files to Create/Modify:**
- `docs/user-guide/customer-management.md`
- `backend/app/routers/customers.py` (docstrings)

**Estimated Time:** 2 hours

---

## Summary
- **Total Tasks:** 8
- **Estimated Time:** 19 hours (~5 days)
- **Critical Path:** Task 1 → Task 2 → Task 4 → Task 6 → Task 7
- **Parallel Tasks:** Task 1, 2, 3 can run in parallel

## Execution Order
1. Task 1: Database Migration (⫽ Task 2, 3)
2. Task 2: Update Backend Schemas (⫽ Task 1, 3)
3. Task 3: Update Frontend Types (⫽ Task 1, 2)
4. Task 4: Credit Limit API Endpoint
5. Task 5: Customer Form UI
6. Task 6: Invoice Credit Check
7. Task 7: Write Tests
8. Task 8: Documentation

Ready to implement with `/sp.implement`?

## Output
- Numbered task list with dependencies
- Clear acceptance criteria
- File paths for each task
- Time estimates
- Execution order

## Notes
- Keep tasks small (1-4 hours each)
- Mark parallel tasks clearly
- Order by dependency
- Include test tasks
