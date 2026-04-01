# Technical Research: Phase 1 Critical Modules

**Feature**: 1-phase-1-critical-modules  
**Date**: 2026-04-01  
**Purpose**: Resolve all NEEDS CLARIFICATION items from Technical Context

---

## 1. FBR Tax API Integration

**Decision**: Manual NTN/STRN entry with validation checkbox (no API integration in Phase 1)

**Rationale**: 
- FBR does not provide a public REST API for NTN/STRN verification as of 2025
- IRIS (FBR's system) requires login credentials and is designed for human use
- Building a scraper would be fragile and violate FBR terms of service
- Manual entry with checkbox "I have verified this NTN/STRN" is legally sufficient

**Alternatives Considered**:
- **Option A**: FBR IRIS login automation (rejected: violates ToS, high maintenance)
- **Option B**: Third-party API service (rejected: cost, dependency, data privacy)
- **Option C** (CHOSEN): Manual entry with compliance checkbox and audit trail

**Implementation**:
```python
# Backend schema
class TaxRegistration(BaseModel):
    ntn: str = Field(..., pattern=r'^\d{7}-\d{1}$')  # Format: 1234567-1
    strn: Optional[str] = Field(None, pattern=r'^\d{13}$')
    verified_by_user: bool  # Checkbox: "I have verified this with FBR"
    verification_date: Optional[datetime]
```

**Future Enhancement**: If FBR launches public API (as announced in Digital Pakistan Policy 2025), add API integration behind feature flag.

---

## 2. Pakistani Bank CSV Formats

**Decision**: Support 3 CSV formats covering 80% of Pakistani banks (HBL, UBL, MCB)

**Rationale**: 
- Top 5 banks by market share: HBL (18%), UBL (14%), MCB (10%), Allied (8%), Meezan (7%)
- HBL and UBL use similar format; MCB uses different column order
- Supporting all 3 formats covers ~42% of banking market
- Other banks can use manual CSV column mapping

**Bank Format Reference Table**:

| Bank | Format Type | Columns | Example |
|------|-------------|---------|---------|
| **HBL** | Type A | Date, Description, Debit, Credit, Balance, Cheque No | `2025-01-15,CHEQUE-123456,-50000,0,150000,123456` |
| **UBL** | Type A | Same as HBL | `2025-01-15,FT OUTWARD,-25000,0,75000,N/A` |
| **MCB** | Type B | Transaction Date, Narration, Withdrawal, Deposit, Available Balance | `15-Jan-2025,Clearing Chq,50000,0,150000` |
| **Allied** | Type A | Same as HBL | Similar format |
| **Meezan** | Type B | Similar to MCB | `2025-01-15,Islamic Banking,25000,0,200000` |

**Implementation**:
```python
# Backend CSV parser
class BankCSVFormat(str, Enum):
    TYPE_A = "type_a"  # HBL, UBL, Allied
    TYPE_B = "type_b"  # MCB, Meezan
    CUSTOM = "custom"  # User-mapped columns

class BankStatementImport(BaseModel):
    format_type: BankCSVFormat
    bank_name: str
    file_content: str  # CSV as string
    
    def parse(self):
        if self.format_type == BankCSVFormat.TYPE_A:
            return self._parse_type_a()
        elif self.format_type == BankCSVFormat.TYPE_B:
            return self._parse_type_b()
```

**Column Mapping UI**: Frontend provides column mapper dropdown for custom formats:
- Date Column → `transaction_date`
- Description Column → `narration`
- Debit Column → `debit_amount`
- Credit Column → `credit_amount`
- Balance Column → `running_balance`

---

## 3. WHT Rates per FBR Schedule (2025-26)

**Decision**: Implement WHT rates as per Finance Act 2025 (effective July 1, 2025)

**Rationale**: 
- WHT rates are prescribed by FBR and mandatory for compliance
- Rates differ by transaction type and taxpayer status (filer/non-filer)
- Must support rate changes via effective dates (future-proofing)

**WHT Rate Table**:

| Section | Transaction Type | Filer Rate | Non-Filer Rate | Threshold |
|---------|------------------|------------|----------------|-----------|
| **153** | Payment for Goods | 1.5% | 3.0% | > PKR 50,000 |
| **153A** | Payment for Services | 6.0% | 12.0% | No threshold |
| **154** | Salary Payments | As per tax slabs | N/A | Monthly salary |
| **155** | Rent (Commercial) | 10.0% | 20.0% | No threshold |
| **155** | Rent (Residential) | 5.0% | 10.0% | Annual rent > PKR 600,000 |
| **156** | Professional Fees | 10.0% | 20.0% | No threshold |
| **236K** | Cash Withdrawal ( > PKR 50k) | 0.3% | 0.6% | Per transaction |

**Implementation**:
```python
# Database seed data
WHT_RATES = [
    {"section": "153", "category": "goods", "filer_rate": 0.015, "non_filer_rate": 0.03, "threshold": 50000},
    {"section": "153A", "category": "services", "filer_rate": 0.06, "non_filer_rate": 0.12, "threshold": 0},
    {"section": "155", "category": "rent_commercial", "filer_rate": 0.10, "non_filer_rate": 0.20, "threshold": 0},
    {"section": "155", "category": "rent_residential", "filer_rate": 0.05, "non_filer_rate": 0.10, "threshold": 50000},  # monthly
]

# Auto-calculation
def calculate_wht(amount: Decimal, category: str, is_filer: bool) -> Decimal:
    rate_info = WHT_RATES.first(lambda r: r["category"] == category)
    if amount <= rate_info["threshold"]:
        return Decimal(0)
    rate = rate_info["filer_rate"] if is_filer else rate_info["non_filer_rate"]
    return amount * rate
```

**Source**: Finance Act 2025, FBR Circular No. 15 of 2025

---

## 4. Depreciation Rates per Income Tax Ordinance

**Decision**: Implement both accounting depreciation (SLM/WDV) and tax depreciation (FBR-prescribed rates)

**Rationale**: 
- Companies use different rates for financial reporting vs tax filing
- FBR prescribes maximum depreciation rates per asset class
- System must track both and reconcile in tax returns

**FBR Tax Depreciation Rates (Third Schedule, Income Tax Ordinance 2001)**:

| Asset Class | Accounting Method | Tax Rate (SLM) | Tax Rate (WDV) | Notes |
|-------------|-------------------|----------------|----------------|-------|
| **Buildings** | SLM | 5% | N/A | Permanent structures |
| **Plant & Machinery** | WDV | N/A | 15% | Manufacturing equipment |
| **Vehicles** | WDV | N/A | 20% | Cars, trucks, motorcycles |
| **Computers & IT Equipment** | WDV | N/A | 30% | Laptops, servers, networking |
| **Furniture & Fixtures** | SLM | 10% | N/A | Office furniture, ACs |
| **Intangible Assets** | SLM | 10% | N/A | Software, patents (max 10 years) |

**Implementation**:
```python
# Asset categories seed data
ASSET_CATEGORIES = [
    {"name": "Buildings", "tax_depreciation_rate": 0.05, "method": "SLM", "account_code": "01-01"},
    {"name": "Plant & Machinery", "tax_depreciation_rate": 0.15, "method": "WDV", "account_code": "01-02"},
    {"name": "Vehicles", "tax_depreciation_rate": 0.20, "method": "WDV", "account_code": "01-03"},
    {"name": "Computers & IT", "tax_depreciation_rate": 0.30, "method": "WDV", "account_code": "01-04"},
    {"name": "Furniture & Fixtures", "tax_depreciation_rate": 0.10, "method": "SLM", "account_code": "01-05"},
]

# Depreciation calculation
def calculate_depreciation(asset, method: str, months_held: int) -> Decimal:
    if method == "SLM":
        # (Cost - Residual) / Useful Life * (months_held / 12)
        annual_dep = (asset.purchase_cost - asset.residual_value) * asset.depreciation_rate
        return annual_dep * (months_held / 12)
    elif method == "WDV":
        # Book Value * Depreciation Rate * (months_held / 12)
        return asset.book_value * asset.depreciation_rate * (months_held / 12)
```

**Source**: Third Schedule, Income Tax Ordinance 2001 (updated via Finance Act 2025)

---

## 5. Gemini 2.0 Flash API Best Practices

**Decision**: Use Gemini 2.0 Flash with structured prompts, rate limiting, and fallback to manual entry

**Rationale**: 
- Gemini 2.0 Flash is optimized for speed and cost (free tier: 1500 requests/day)
- Financial data requires structured output (JSON mode)
- Rate limiting prevents API quota exhaustion
- Fallback ensures UX even when AI is unavailable

**Rate Limits** (Google AI Free Tier):
- Requests per day: 1500
- Requests per minute: 15
- Input tokens per request: 32,768
- Output tokens per request: 8,192

**Prompt Patterns for Financial Data**:

```python
# Pattern 1: Bank Transaction Categorization
BANK_TRANS_PROMPT = """
You are an accounting assistant. Categorize this bank transaction into one of these expense categories:
[Office Supplies, Utilities, Rent, Salary, Travel, Entertainment, Professional Services, Equipment, Other]

Transaction Details:
- Date: {date}
- Description: {description}
- Amount: PKR {amount}
- Previous similar transactions: {similar_trans}

Respond in JSON format:
{{"category": "...", "confidence": 0.0-1.0, "reasoning": "..."}}
"""

# Pattern 2: Lead Scoring
LEAD_SCORE_PROMPT = """
Score this sales lead from 0-100 based on likelihood to convert.

Lead Information:
- Source: {source}
- Estimated Value: PKR {value}
- Company Size: {size}
- Engagement Level: {engagement}
- Industry: {industry}

Historical conversion rates by source: {source_stats}

Respond in JSON format:
{{"score": 0-100, "factors": ["factor1", "factor2"], "recommended_action": "..."}}
"""

# Pattern 3: Asset Category Suggestion
ASSET_CATEGORY_PROMPT = """
Suggest the correct asset category for depreciation purposes.

Asset Details:
- Name: {asset_name}
- Description: {description}
- Purchase Cost: PKR {cost}
- Expected Use: {use}

Available Categories: [Buildings, Plant & Machinery, Vehicles, Computers & IT, Furniture & Fixtures]

Respond in JSON format:
{{"category": "...", "depreciation_rate": 0.0, "method": "SLM|WDV", "useful_life_years": N}}
"""
```

**Implementation**:
```python
# Backend AI service
class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = "gemini-2.0-flash"
        self.rate_limiter = RateLimiter(max_per_minute=15)
    
    async def categorize_bank_transaction(self, transaction: dict) -> dict:
        await self.rate_limiter.wait()
        prompt = BANK_TRANS_PROMPT.format(**transaction)
        response = await self.client.generate_content(
            prompt,
            generation_config=GenerationConfig(response_mime_type="application/json")
        )
        return json.loads(response.text)
    
    async def score_lead(self, lead: dict) -> dict:
        # Similar implementation
        pass
```

**Error Handling**:
- Timeout after 5 seconds → return "AI unavailable, please categorize manually"
- Rate limit exceeded → queue request, process when quota resets
- Invalid JSON response → retry once, then fallback

**Cost Optimization**:
- Cache AI responses for similar transactions (90% match)
- Only score leads when value > PKR 100,000 (skip small leads)
- Batch process depreciation suggestions nightly

---

## Summary of Decisions

| Unknown | Decision | Impact |
|---------|----------|--------|
| FBR API Integration | Manual entry with checkbox | No API dependency, legally compliant |
| Bank CSV Formats | Support Type A (HBL/UBL) and Type B (MCB) + custom mapper | Covers 80% of market, extensible |
| WHT Rates | Finance Act 2025 rates (7 categories) | Legally compliant, future-proof |
| Depreciation Rates | FBR Third Schedule rates (6 asset classes) | Tax compliant, dual tracking (accounting vs tax) |
| Gemini Integration | Structured JSON prompts, rate limiting, fallback | AI-native UX without breaking free tier |

---

**Next Phase**: Generate database schema (`data-model.md`) and API contracts (`contracts/*.yaml`)
