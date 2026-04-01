# 🚀 AI Accounts - Spec-Driven Development Guide

## Welcome to Spec-Driven Vibe-Coding! 🎯

This project follows **Spec-Kit-Plus** methodology from Panaversity for building enterprise-grade accounting software using AI agents.

---

## 📚 What is Spec-Driven Development?

**Spec-Driven Development** flips traditional software development:

```
Traditional: Requirements → Code → Tests → Documentation
Spec-Driven: Specification → Plan → Tasks → AI Implementation → Tests
```

### Core Principles

1. **Specification is King** - All code derives from `SPECIFICATION.md`
2. **Intent-Driven** - Define WHAT and WHY, AI figures out HOW
3. **Multi-Step Refinement** - Iterate through clarify → plan → implement
4. **AI-First** - AI agents write code, humans review and guide

---

## 🎯 Project Overview

**AI Accounts** is a complete accounting software for Pakistani businesses, competing with QuickBooks, Xero, and SAP.

### Tech Stack
- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI, SQLAlchemy, Pydantic v2
- **Database:** Supabase (PostgreSQL)
- **AI:** Google Gemini 2.0 Flash API
- **AI Agents:** Claude Code, Qwen Code, GitHub Copilot

---

## 📁 Project Structure

```
accountify/
├── 📄 SPECIFICATION.md          # Master specification (28 modules)
├── 📄 CONSTITUTION.md           # Project governance & principles
├── 📁 specs/                    # Detailed module specifications
│   ├── customer.md
│   ├── invoice.md
│   ├── product.md
│   └── ...
├── backend/
│   ├── app/
│   │   ├── models/              # Database models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # API endpoints
│   │   └── services/            # Business logic
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages
│   │   ├── components/          # React components
│   │   ├── types/               # TypeScript types
│   │   └── lib/                 # Utilities
│   └── tests/
└── .github/
    └── workflows/               # CI/CD pipelines
```

---

## 🛠️ Spec-Kit-Plus Setup

### Prerequisites

- ✅ Python 3.11+
- ✅ Node.js 18+
- ✅ Git
- ✅ `uv` package manager
- ✅ AI Coding Agent (Claude Code, Qwen Code, etc.)

### Installation

```bash
# Install Spec-Kit-Plus CLI
uv tool install specifyplus

# Verify installation
specifyplus --version

# Check system requirements
specifyplus check
```

---

## 🚀 Spec-Driven Workflow

### Step 1: Read Specification

Start by reading the relevant section from `SPECIFICATION.md`:

```bash
# Open specification
code SPECIFICATION.md

# Or view specific module
code specs/customer.md
```

### Step 2: Use AI Agent Slash Commands

Once you've initialized the project, use these commands in your AI coding agent:

| Command | Description |
|---------|-------------|
| `/sp.constitution` | Create/update project principles |
| `/sp.specify` | Define requirements and user stories |
| `/sp.clarify` | Resolve ambiguities before planning |
| `/sp.plan` | Create technical implementation plan |
| `/sp.tasks` | Generate actionable task list |
| `/sp.analyze` | Cross-artifact consistency check |
| `/sp.checklist` | Generate quality checklist |
| `/sp.implement` | Execute tasks per the plan |

### Step 3: Development Flow

```mermaid
graph LR
    A[Read SPECIFICATION.md] --> B[Run /sp.specify]
    B --> C[Run /sp.clarify]
    C --> D[Run /sp.plan]
    D --> E[Run /sp.tasks]
    E --> F[Run /sp.implement]
    F --> G[Review Code]
    G --> H[Run Tests]
    H --> I[Merge to Main]
```

---

## 📋 Module Specifications

Each module has a detailed specification in `specs/` folder:

### Specification Template

```markdown
# Module Name

## Overview
Brief description

## User Stories
- US-1: As a [role], I want [feature], so that [benefit]
- US-2: ...

## Data Model
Database schema

## API Endpoints
- GET /api/resource
- POST /api/resource
- PUT /api/resource/:id
- DELETE /api/resource/:id

## Business Rules
- BR-1: ...
- BR-2: ...

## Validation Rules
Field-level validation

## UI Requirements
- List page components
- Detail page components
- Form components

## Reports
List of reports

## Test Cases
- Unit tests
- Integration tests
- E2E tests
```

---

## 🧪 Testing Strategy

### Test Pyramid

```
        /‾‾‾‾‾‾\
       /  E2E    \      10% - Critical journeys
      /__________\
     /   Integration \  20% - API contracts
    /_________________\
   /    Unit Tests     \ 70% - Components, functions
  /_____________________\
```

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

---

## 📝 Development Workflow Example

### Adding a New Feature (e.g., Customer Credit Limit)

#### 1. Update Specification
Edit `SPECIFICATION.md` Section 3.2 (Customer Master):
```markdown
- Credit limit setup
- Credit limit enforcement (block/warn)
- Credit limit approval workflow
```

#### 2. Update Module Spec
Edit `specs/customer.md`:
```markdown
## Business Rules
BR-2: Credit Limit Enforcement
- Warn if invoice exceeds credit limit
- Block if configured: balance + new_invoice > credit_limit
```

#### 3. Run AI Agent Commands
```
/sp.specify - Add credit limit feature requirements
/sp.clarify - Clarify enforcement rules
/sp.plan - Create implementation plan
/sp.tasks - Generate task list
/sp.implement - Execute tasks
```

#### 4. Review & Test
- Review generated code
- Run tests
- Merge to main

---

## 🔒 Security & Compliance

### Pakistan-Specific Requirements

- ✅ FBR Tax Compliance (Sales Tax, WHT)
- ✅ SRB Integration (Sindh Revenue Board)
- ✅ EOBI/PESSI Calculations
- ✅ Urdu Language Support
- ✅ PKR Currency Formatting

### International Standards

- ✅ IFRS Compliance
- ✅ GDPR Ready
- ✅ SOC 2 Ready
- ✅ ISO 27001 Ready

---

## 🚀 Deployment

### Local Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Docker

```bash
# Build and run
docker-compose up --build

# Access
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

### Production

See `DEPLOYMENT.md` for detailed deployment guide.

---

## 📚 Documentation

### Key Documents

| Document | Purpose |
|----------|---------|
| `SPECIFICATION.md` | Master feature specification |
| `CONSTITUTION.md` | Project governance & principles |
| `specs/*.md` | Detailed module specifications |
| `README.md` | This file - development guide |
| `DEPLOYMENT.md` | Deployment instructions |

### AI Agent Prompting

When working with AI agents, use this prompt structure:

```
1. CONTEXT: [Which module/feature]
2. SPEC: [Reference to SPECIFICATION.md section]
3. TASK: [What to implement]
4. CONSTRAINTS: [Technical requirements]
5. OUTPUT: [Expected deliverables]
```

**Example:**
```
1. CONTEXT: Customer module
2. SPEC: SPECIFICATION.md Section 3.2, specs/customer.md
3. TASK: Add credit limit enforcement
4. CONSTRAINTS: Use Pydantic validation, add tests
5. OUTPUT: Updated schema, API endpoint, tests
```

---

## 🎯 Implementation Priority

### Phase 1: Foundation (Current - 20%)
- ✅ Authentication
- ✅ Company Setup
- ✅ Chart of Accounts
- ✅ Customers, Vendors, Products
- ✅ Invoices, Bills
- ⏳ Complete POS
- ⏳ Basic Reports

### Phase 2: P1 Critical (Next 3 months)
- 🔴 HR & Payroll
- 🔴 Fixed Assets
- 🔴 Bank Reconciliation
- 🔴 Cash Flow Statement
- 🔴 Cost Centers

### Phase 3: P2 Important (3-6 months)
- 🟡 Tax Management (FBR/SRB)
- 🟡 Multi-Branch
- 🟡 Workflow & Approvals
- 🟡 Budget Management
- 🟡 Advanced Security

### Phase 4: P3 Value-Add (6-12 months)
- 🟢 Project Costing
- 🟢 CRM Complete
- 🟢 Manufacturing (MRP, BOM)
- 🟢 Mobile App
- 🟢 Business Intelligence

---

## 🤝 Contributing

### Test-First Contribution Model

1. **Develop in Your Project First**
   - Test new commands/features in your own projects
   - Ensure they work in real scenarios

2. **Document Learnings**
   - Note what worked, what didn't
   - Provide examples

3. **Submit PR**
   - Include test results
   - Update documentation
   - Add example usage

### Code Review Checklist

- [ ] Traces back to specification
- [ ] Follows architecture principles
- [ ] Type-safe (TypeScript/Python)
- [ ] Error handling implemented
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No hardcoded values
- [ ] Security considerations addressed

---

## 📊 Progress Tracking

### Current Status

| Module | Backend | Frontend | Database | Tests | Overall |
|--------|---------|----------|----------|-------|---------|
| Auth | ✅ | ✅ | ✅ | ⚠️ | 80% |
| Company | ✅ | ✅ | ✅ | ⚠️ | 80% |
| Customers | ✅ | ✅ | ✅ | ⚠️ | 80% |
| Vendors | ✅ | ✅ | ✅ | ⚠️ | 80% |
| Products | ✅ | ✅ | ✅ | ⚠️ | 80% |
| Invoices | ✅ | ✅ | ✅ | ⚠️ | 75% |
| Bills | ✅ | ✅ | ✅ | ⚠️ | 75% |
| Inventory | ✅ | ✅ | ✅ | ⚠️ | 70% |
| POS | ⚠️ | ⚠️ | ✅ | ❌ | 40% |
| Banking | ⚠️ | ⚠️ | ⚠️ | ❌ | 30% |
| Payroll | ⚠️ | ⚠️ | ❌ | ❌ | 25% |
| Reports | ⚠️ | ⚠️ | ✅ | ❌ | 40% |

### Next Sprint Goals

1. Complete POS module (100%)
2. Add Bank Reconciliation (50%)
3. Start HR & Payroll (25%)
4. Improve test coverage (>80%)

---

## 🎓 Learning Resources

### Spec-Kit-Plus
- [Spec-Kit-Plus GitHub](https://github.com/panaversity/spec-kit-plus)
- [AgentFactory Curriculum](https://agentfactory.panaversity.org/)

### Spec-Driven Development
- [Spec-Driven Development Methodology](https://github.com/panaversity/spec-kit-plus/blob/main/docs/methodology.md)
- [Detailed Walkthrough](https://github.com/panaversity/spec-kit-plus/blob/main/docs/walkthrough.md)

### AI Agents
- [Claude Code Documentation](https://docs.anthropic.com/claude-code/)
- [Qwen Code Documentation](https://github.com/QwenLM/Qwen)

---

## 📞 Support

- **GitHub Issues:** Bug reports, feature requests
- **Discussions:** Questions, ideas
- **Email:** team@ai-accounts.com

---

## 📄 License

MIT License - See LICENSE file

---

## 🌟 Success Metrics

### Code Quality
- ESLint/Prettier: 100% compliance
- Type errors: 0
- Test coverage: >80% critical paths

### Performance
- Page load: <3 seconds
- API response: <500ms (95th percentile)
- Report generation: <10 seconds

### User Experience
- Dashboard load: <2 seconds
- Time to create invoice: <30 seconds
- User satisfaction: >4.5/5

---

**Ready to build the future of accounting software? Let's spec it, plan it, implement it! 🚀**

*Last Updated: 2025*  
*Version: 1.0*  
*Status: Active*
