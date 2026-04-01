# /sp.implement - Execute Tasks

## Command
`/sp.implement [task number or feature name]`

## Purpose
Execute implementation tasks according to the plan and task list

## Instructions

1. **Prerequisites Check**
   - Ensure tasks exist from `/sp.tasks`
   - Read task specifications
   - Check dependencies are complete

2. **Implementation Process**

   For each task:
   
   a. **Read Task Specification**
      - Understand acceptance criteria
      - Note files to create/modify
   
   b. **Check Existing Code**
      - Review related existing code
      - Understand patterns and conventions
   
   c. **Implement**
      - Write code following CONSTITUTION.md
      - Use TypeScript/Python type safety
      - Follow project conventions
   
   d. **Test**
      - Write tests for the feature
      - Run tests and ensure they pass
      - Fix any failures
   
   e. **Document**
      - Add docstrings/comments
      - Update API documentation
      - Note any breaking changes

3. **Task Execution Order**
   - Respect dependencies
   - Run parallel tasks when possible
   - Mark tasks complete with ✅

4. **Quality Checks**

   Before marking task complete:
   - [ ] Code follows CONSTITUTION.md
   - [ ] Type-safe (no `any` in TS, type hints in Python)
   - [ ] Error handling implemented
   - [ ] Tests written and passing
   - [ ] No hardcoded values
   - [ ] Security considered
   - [ ] Documentation updated

5. **Progress Tracking**

   Update task status:
   ```
   Task 1: ✅ Complete
   Task 2: ✅ Complete
   Task 3: 🔄 In Progress
   Task 4: ⏳ Pending
   ```

## Example

User: `/sp.implement Customer Credit Limit`

AI:
# Implementation: Customer Credit Limit

## Starting Implementation

**Reading tasks from `/sp.tasks` output...**
**Checking dependencies...**
**Starting with Task 1 (Database Migration)...**

---

### Task 1: Database Migration ✅

**Status:** In Progress

Creating migration file...

```sql
-- backend/database/migrations/add_credit_limit_to_customers.sql
ALTER TABLE customers 
ADD COLUMN credit_limit DECIMAL(15,2) DEFAULT 0,
ADD COLUMN credit_limit_action VARCHAR(20) DEFAULT 'warn';

-- Add comment
COMMENT ON COLUMN customers.credit_limit IS 'Maximum credit limit for customer';
COMMENT ON COLUMN customers.credit_limit_action IS 'Action when limit exceeded: warn or block';
```

**Testing migration...**
- ✅ Migration runs successfully
- ✅ Rollback works
- ✅ Columns added with correct types

**Task 1: ✅ Complete**

---

### Task 2: Update Backend Schemas ✅

**Status:** In Progress

Updating Pydantic schemas...

```python
# backend/app/schemas/customer.py
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    credit_limit: Decimal = Field(default=0, ge=0)
    credit_limit_action: str = Field(default='warn', pattern='^(warn|block)$')
```

**Running type checker...**
- ✅ No type errors
- ✅ Validation rules correct

**Task 2: ✅ Complete**

---

### Task 3: Update Frontend Types ✅

**Status:** In Progress

Updating TypeScript types...

```typescript
// frontend/src/types/customer.ts
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  credit_limit: number;
  credit_limit_action: 'warn' | 'block';
  // ... other fields
}
```

**Running type checker...**
- ✅ No TypeScript errors

**Task 3: ✅ Complete**

---

## Progress Summary

```
Task 1: ✅ Database Migration
Task 2: ✅ Update Backend Schemas
Task 3: ✅ Update Frontend Types
Task 4: 🔄 Credit Limit API Endpoint (In Progress)
Task 5: ⏳ Customer Form UI
Task 6: ⏳ Invoice Credit Check
Task 7: ⏳ Write Tests
Task 8: ⏳ Documentation
```

**Overall Progress:** 3/8 tasks complete (37.5%)

Continuing with Task 4...

## Output
- Code implementation for each task
- Test results
- Progress summary
- Any issues encountered

## Notes
- Complete tasks in dependency order
- Run tests after each task
- Document any deviations from plan
- Mark tasks complete only when ALL criteria met
