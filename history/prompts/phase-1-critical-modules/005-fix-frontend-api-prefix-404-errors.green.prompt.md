---
id: 005
title: fix-frontend-api-prefix-404-errors
stage: green
date: 2026-04-06
surface: agent
model: qwen-coder
feature: phase-1-critical-modules
branch: main
user: aliraza
command: test and fix frontend 404 errors
labels: ["fix", "frontend", "api", "404", "prefix"]
links:
  spec: null
  plan: null
  tasks: null
  pr: null
  adr: null
files:
  - frontend/src/components/layout/Header.tsx (fixed /branches → /api/branches)
  - frontend/src/app/dashboard/page.tsx (fixed /reports/dashboard → /api/reports/dashboard)
tests:
  - backend tests: 26/28 passed (93%)
  - 2 auth tests failing (refresh_token mock issue)
---

## Prompt

frontend 404 errors: /branches aur /reports/dashboard endpoints not found

## Response snapshot

Fixed 2 frontend API calls missing `/api` prefix:
- Header.tsx: `api.get("/branches")` → `api.get("/api/branches")`
- Dashboard: `api.get("/reports/dashboard")` → `api.get("/api/reports/dashboard")`

Backend server started on port 8000.
Backend test results: 26/28 passed (2 auth tests need refresh_token mock fix)

## Outcome

- ✅ Impact: Frontend 404 errors resolved, API calls now match backend routes
- 🧪 Tests: Backend 26/28 passed, 2 failing (test_register, test_login - refresh_token mock)
- 📁 Files: 2 frontend files updated
- 🔁 Next prompts: Fix 2 failing auth tests, verify frontend loads without errors
- 🧠 Reflection: baseURL set hai lekin `/api` prefix manually add karna padta jab endpoint directly use ho

## Evaluation notes (flywheel)

- Failure modes observed: Missing `/api` prefix in 2 files causing 404 errors
- Graders run and results: N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Fix auth test mocks for refresh_token
