# /sp.clarify - Resolve Ambiguities

## Command
`/sp.clarify [module/feature name]`

## Purpose
Ask clarifying questions about underspecified areas before planning

## Instructions

1. **Review the Specification**
   - Read the relevant spec from `specs/` folder
   - Read SPECIFICATION.md section

2. **Identify Ambiguities**
   - Missing requirements
   - Conflicting requirements
   - Technical unknowns
   - Edge cases not covered
   - Integration points unclear

3. **Ask Clarifying Questions**
   Group questions by category:
   
   **Business Logic:**
   - What happens when [edge case]?
   - Should [feature] work with [other feature]?
   
   **Technical:**
   - Which database field stores [value]?
   - What API endpoint handles [action]?
   
   **UX:**
   - Should user see [information] immediately?
   - What happens on error [scenario]?
   
   **Integration:**
   - Does this affect [other module]?
   - Should [data] sync with [other system]?

4. **Wait for Answers**
   - Don't proceed to plan until clarified
   - Document answers in spec

5. **Update Specification**
   - Add clarifications to spec file
   - Mark as "Clarified" with date

## Example

User: `/sp.clarify Customer Credit Limit`

AI:
After reviewing specs/customer.md, I need clarification on:

**Business Logic:**
1. Should credit limit check happen on invoice creation or payment posting?
2. What if customer exceeds limit by less than 10% - warn or block?
3. Should approved credit limit increases be temporary or permanent?

**Technical:**
4. Which user roles can approve credit limit overrides?
5. Should credit limit history be tracked?

**UX:**
6. Should salesperson see credit limit status before creating invoice?
7. What error message shows when credit limit exceeded?

**Integration:**
8. Does credit limit apply to POS transactions?
9. Should outstanding sales orders count toward credit limit?

Please answer these questions before I create the implementation plan.

## Output
- List of clarifying questions
- Updated spec with answers (after user responds)
- Ready for planning once clarified

## Notes
- Better to over-clarify than assume
- Document all decisions in spec
- Involve stakeholders for business logic questions
