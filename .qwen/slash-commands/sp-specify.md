# /sp.specify - Define Requirements and User Stories

## Command
`/sp.specify [module/feature name]`

## Purpose
Create or update specification for a module/feature based on SPECIFICATION.md

## Instructions

1. **Read SPECIFICATION.md**
   - Find the relevant section for the requested module/feature
   - Understand the requirements from the spec

2. **Check specs/ Folder**
   - See if a module spec already exists
   - If yes, review and update
   - If no, create new spec file

3. **Create/Update Specification** with this structure:

```markdown
# Module Name

## Overview
[Brief description]

## User Stories
- US-1: As a [role], I want [feature], so that [benefit]
- US-2: ...

## Acceptance Criteria
For each user story, define acceptance criteria

## Data Model
[Database schema if applicable]

## API Endpoints
[List of endpoints if applicable]

## Business Rules
[Business logic and rules]

## Validation Rules
[Field-level validation]

## UI Requirements
[UI components and requirements]

## Reports
[List of reports]

## Test Cases
[Unit, integration, E2E tests]
```

4. **Output**
   - Updated/created spec file in `specs/` folder
   - Summary of what was specified
   - Link to SPECIFICATION.md section

## Example

User: `/sp.specify Customer Credit Limit`

AI: 
1. Reading SPECIFICATION.md Section 3.2 (Customer Master)...
2. Checking specs/customer.md...
3. Updating specification with credit limit requirements...
4. Created/updated: specs/customer.md
5. Summary:
   - Added credit limit field to data model
   - Added credit limit enforcement business rules
   - Added API endpoint for credit limit update
   - Added validation rules
   - Added test cases

## Notes
- Focus on WHAT and WHY, not HOW
- Don't implement yet, just specify
- Clarify ambiguities before planning
