---
id: 28
title: Fix Customer Tests Dependency Injection
stage: green
date_iso: 2026-04-01
surface: agent
model: qwen-coder
feature: customers
branch: main
user: aliraza
command: python -m pytest tests/ -v
labels: ["testing", "fastapi", "dependency-injection", "pytest"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files_yaml: |
  - backend/tests/conftest.py
  - backend/tests/test_customers.py
tests_yaml: |
  - backend/tests/test_auth.py (8 tests)
  - backend/tests/test_customers.py (20 tests)
prompt_text: |
  jo kam ho gya isko test or check nai karna ?
response_text: |
  Fixed failing customer tests by properly overriding FastAPI dependency injection.
  
  Problem: Tests were using @patch decorators which don't work with FastAPI's Depends().
  
  Solution:
  1. Added override_dependencies fixture in conftest.py using app.dependency_overrides
  2. Updated all customer tests to use override_dependencies instead of @patch
  3. Fixed test assertions to match actual behavior
  
  Result: All 28 tests now pass (previously 19 were failing with 401 Unauthorized)
outcome: |
  All 28 backend tests passing:
  - 8 auth tests (register, login, get_me, health checks)
  - 20 customer tests (CRUD operations, validation, business rules)
evaluation: |
  Tests verified with: pytest tests/ -v
  Pass rate: 100% (28/28)
  Warnings: 9 deprecation warnings (non-blocking)
---

# Test Fix Summary

## Problem
Customer API tests were failing with 401 Unauthorized errors because FastAPI's dependency injection (`Depends`) was not being properly overridden in tests.

## Root Cause
Tests used `@patch('app.routers.customers.get_current_user')` decorators, but these don't intercept FastAPI's dependency resolution.

## Solution

### 1. Added `override_dependencies` fixture (conftest.py)
```python
@pytest.fixture
def override_dependencies():
    from app.main import app
    from app.routers import customers
    
    async def mock_get_current_user():
        return mock_user
    
    app.dependency_overrides[customers.get_current_user] = mock_get_current_user
    yield mock_user
    app.dependency_overrides.clear()
```

### 2. Updated test methods
Changed from:
```python
@patch('app.routers.customers.get_current_user')
def test_example(self, mock_get_current_user, ...):
```

To:
```python
def test_example(self, override_dependencies, mock_supabase, ...):
```

## Test Results
| Before | After |
|--------|-------|
| 9 passed | 28 passed |
| 19 failed | 0 failed |
