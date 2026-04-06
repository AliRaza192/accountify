---
id: 006
title: fix-auth-api-prefix-404-login-register
stage: green
date: 2026-04-06
surface: agent
model: qwen-coder
feature: phase-1-critical-modules
branch: main
user: aliraza
command: fix login 404 error
labels: ["fix", "frontend", "auth", "404", "api-prefix", "login", "register"]
links:
  spec: null
  plan: null
  tasks: null
  pr: null
  adr: null
files:
  - frontend/src/app/login/page.tsx (fixed /auth/login → /api/auth/login)
  - frontend/src/app/register/page.tsx (fixed /auth/register → /api/auth/register)
  - frontend/src/components/layout/Header.tsx (fixed /branches → /api/branches)
  - frontend/src/app/dashboard/page.tsx (fixed /reports/dashboard → /api/reports/dashboard)
tests:
  - backend tests: 26/28 passed (93%)
---

## Prompt

Login failed - Not Found error: POST /auth/login HTTP/1.1" 404

## Response snapshot

Fixed 2 more frontend API calls missing `/api` prefix:
- login/page.tsx: `api.post("/auth/login")` → `api.post("/api/auth/login")`
- register/page.tsx: `api.post("/auth/register")` → `api.post("/api/auth/register")`

Total fixed today: 4 files with missing `/api` prefix

## Outcome

- ✅ Impact: Login and register endpoints now match backend routes
- 🧪 Tests: Backend 26/28 passed
- 📁 Files: 4 frontend files updated total (login, register, header, dashboard)
- 🔁 Next prompts: Test login flow end-to-end, fix 2 failing auth tests
- 🧠 Reflection: baseURL set hai `http://localhost:8000` lekin `api` instance automatically `/api` prefix nahi add karta - har endpoint ko manually `/api` se start karna padta

## Evaluation notes (flywheel)

- Failure modes observed: Missing `/api` prefix causing 404 on auth endpoints
- Graders run and results: N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Consider adding `/api` to baseURL in api.ts to avoid this issue globally
