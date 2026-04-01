# /sp.plan - Create Implementation Plan

## Command
`/sp.plan [module/feature name]`

## Purpose
Create technical implementation plan with tech stack choices and architecture

## Instructions

1. **Prerequisites Check**
   - Ensure spec exists in `specs/` folder
   - Ensure clarifications are done (marked "Clarified")
   - Read CONSTITUTION.md for architecture principles

2. **Create Implementation Plan** with this structure:

```markdown
# Implementation Plan: [Feature Name]

## Overview
[What we're building]

## Technical Approach

### Architecture
[High-level architecture diagram/description]

### Tech Stack
- Backend: [Framework, libraries]
- Frontend: [Framework, libraries]
- Database: [Tables, migrations]

### Database Changes
[List table creations/modifications]

### API Changes
[List new/modified endpoints]

### UI Changes
[List new/modified components]

## Dependencies
[What this feature depends on]

## Implementation Phases

### Phase 1: Foundation
- [ ] Task 1
- [ ] Task 2

### Phase 2: Core Features
- [ ] Task 3
- [ ] Task 4

### Phase 3: Polish
- [ ] Task 5
- [ ] Task 6

## Risk Assessment
[Potential risks and mitigations]

## Testing Strategy
[What tests to write]

## Success Criteria
[How we know it's done]
```

3. **Validate Plan**
   - Check for missing pieces
   - Check for over-engineering
   - Ensure aligns with CONSTITUTION.md
   - Estimate complexity (S/M/L/XL)

4. **Get Approval**
   - Present plan to user
   - Ask: "Should I proceed with this plan?"
   - Wait for approval before tasks

## Example

User: `/sp.plan Customer Credit Limit`

AI:
# Implementation Plan: Customer Credit Limit

## Overview
Add credit limit enforcement to customer module with warn/block options.

## Technical Approach

### Architecture
```
Frontend (React) → Backend (FastAPI) → Database (PostgreSQL)
```

### Tech Stack
- Backend: FastAPI, Pydantic validation
- Frontend: React, TypeScript, shadcn/ui components
- Database: Add `credit_limit` to customers table

### Database Changes
```sql
ALTER TABLE customers 
ADD COLUMN credit_limit DECIMAL(15,2) DEFAULT 0,
ADD COLUMN credit_limit_action VARCHAR(20) DEFAULT 'warn';
```

### API Changes
- PUT /api/customers/:id/credit-limit (update limit)
- POST /api/customers/:id/credit-check (check limit)

### UI Changes
- Customer form: Add credit limit fields
- Invoice form: Add credit limit warning banner
- Customer list: Add credit limit column

## Dependencies
- Customer module (existing)
- Invoice module (existing)

## Implementation Phases

### Phase 1: Foundation (2 days)
- [ ] Database migration
- [ ] Update Pydantic schemas
- [ ] Update TypeScript types

### Phase 2: Core Features (3 days)
- [ ] Credit limit API endpoints
- [ ] Credit limit UI form
- [ ] Credit limit check on invoice

### Phase 3: Polish (1 day)
- [ ] Warning banners
- [ ] Email notifications
- [ ] Documentation

## Risk Assessment
- Risk: Existing invoices affected
- Mitigation: Only check new invoices

## Testing Strategy
- Unit: Credit limit validation
- Integration: API endpoints
- E2E: Create invoice exceeding limit

## Success Criteria
- Customer can have credit limit set
- Invoice creation checks limit
- Warning shows when exceeded
- Optional block enforcement

---

**Complexity:** M (Medium)  
**Estimated Time:** 6 days  
**Ready for tasks:** Yes

Should I proceed with generating tasks?

## Output
- Implementation plan document
- Complexity estimate
- Request for approval to generate tasks

## Notes
- Keep plan focused on MVP
- Identify quick wins vs complex parts
- Consider backward compatibility
