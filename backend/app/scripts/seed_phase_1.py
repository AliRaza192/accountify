"""
Seed Phase 1 Data Script
Populates database with FBR tax rates, asset categories, and loyalty program tiers
Run: python -m app.scripts.seed_phase_1
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.database import supabase
from datetime import date

# FBR Tax Rates (Finance Act 2025)
TAX_RATES = [
    # Sales Tax / GST
    {"tax_name": "GST 17% (Standard)", "rate_percent": 17.0, "tax_type": "sales_tax", "effective_date": "2025-07-01"},
    {"tax_name": "GST 5% (Reduced)", "rate_percent": 5.0, "tax_type": "sales_tax", "effective_date": "2025-07-01"},
    {"tax_name": "GST 0% (Zero-rated)", "rate_percent": 0.0, "tax_type": "sales_tax", "effective_date": "2025-07-01"},
    
    # Withholding Tax (Section 153, 153A, 155)
    {"tax_name": "WHT 153 - Payment for Goods (Filer)", "rate_percent": 1.5, "tax_type": "wht", "effective_date": "2025-07-01"},
    {"tax_name": "WHT 153 - Payment for Goods (Non-Filer)", "rate_percent": 3.0, "tax_type": "wht", "effective_date": "2025-07-01"},
    {"tax_name": "WHT 153A - Payment for Services (Filer)", "rate_percent": 6.0, "tax_type": "wht", "effective_date": "2025-07-01"},
    {"tax_name": "WHT 153A - Payment for Services (Non-Filer)", "rate_percent": 12.0, "tax_type": "wht", "effective_date": "2025-07-01"},
    {"tax_name": "WHT 155 - Rent Commercial (Filer)", "rate_percent": 10.0, "tax_type": "wht", "effective_date": "2025-07-01"},
    {"tax_name": "WHT 155 - Rent Commercial (Non-Filer)", "rate_percent": 20.0, "tax_type": "wht", "effective_date": "2025-07-01"},
    {"tax_name": "WHT 155 - Rent Residential (Filer)", "rate_percent": 5.0, "tax_type": "wht", "effective_date": "2025-07-01"},
    {"tax_name": "WHT 156 - Professional Fees (Filer)", "rate_percent": 10.0, "tax_type": "wht", "effective_date": "2025-07-01"},
]

# Asset Categories (FBR Third Schedule - Income Tax Ordinance 2001)
ASSET_CATEGORIES = [
    {"name": "Buildings", "depreciation_rate_percent": 5.0, "depreciation_method": "SLM", "account_code": "01-01"},
    {"name": "Plant & Machinery", "depreciation_rate_percent": 15.0, "depreciation_method": "WDV", "account_code": "01-02"},
    {"name": "Vehicles", "depreciation_rate_percent": 20.0, "depreciation_method": "WDV", "account_code": "01-03"},
    {"name": "Computers & IT Equipment", "depreciation_rate_percent": 30.0, "depreciation_method": "WDV", "account_code": "01-04"},
    {"name": "Furniture & Fixtures", "depreciation_rate_percent": 10.0, "depreciation_method": "SLM", "account_code": "01-05"},
    {"name": "Intangible Assets", "depreciation_rate_percent": 10.0, "depreciation_method": "SLM", "account_code": "01-06"},
]

# Loyalty Program Tiers
LOYALTY_TIERS = {
    "tiers": [
        {"name": "Silver", "min_points": 0, "bonus_multiplier": 1.0, "benefits": ["Standard support", "Monthly newsletter"]},
        {"name": "Gold", "min_points": 10000, "bonus_multiplier": 1.2, "benefits": ["Priority support", "5% bonus points", "Birthday discount"]},
        {"name": "Platinum", "min_points": 50000, "bonus_multiplier": 1.5, "benefits": ["Dedicated account manager", "10% bonus points", "Free delivery", "Exclusive offers"]},
    ]
}


async def seed_tax_rates(company_id: str):
    """Insert FBR tax rates for a company"""
    print(f"📊 Seeding tax rates for company: {company_id}")
    
    with engine.connect() as conn:
        for tax in TAX_RATES:
            query = text("""
                INSERT INTO tax_rates (company_id, tax_name, rate_percent, tax_type, effective_date, is_active)
                VALUES (:company_id, :tax_name, :rate_percent, :tax_type, :effective_date, true)
                ON CONFLICT (company_id, tax_name) DO NOTHING
            """)
            await conn.execute(query, {
                "company_id": company_id,
                "tax_name": tax["tax_name"],
                "rate_percent": tax["rate_percent"],
                "tax_type": tax["tax_type"],
                "effective_date": tax["effective_date"]
            })
        await conn.commit()
        print(f"  ✅ Inserted {len(TAX_RATES)} tax rates")


async def seed_asset_categories(company_id: str):
    """Insert asset categories with FBR depreciation rates"""
    print(f"🏭 Seeding asset categories for company: {company_id}")
    
    with engine.connect() as conn:
        for category in ASSET_CATEGORIES:
            query = text("""
                INSERT INTO asset_categories (company_id, name, depreciation_rate_percent, depreciation_method, account_code, is_active)
                VALUES (:company_id, :name, :rate, :method, :code, true)
                ON CONFLICT (company_id, name) DO NOTHING
            """)
            await conn.execute(query, {
                "company_id": company_id,
                "name": category["name"],
                "rate": category["depreciation_rate_percent"],
                "method": category["depreciation_method"],
                "code": category["account_code"]
            })
        await conn.commit()
        print(f"  ✅ Inserted {len(ASSET_CATEGORIES)} asset categories")


async def seed_loyalty_program(company_id: str):
    """Insert default loyalty program"""
    print(f"🎁 Seeding loyalty program for company: {company_id}")
    
    with engine.connect() as conn:
        query = text("""
            INSERT INTO loyalty_programs (company_id, program_name, points_per_rupee, redemption_rate, tier_benefits_json, is_active)
            VALUES (:company_id, 'Standard Loyalty Program', 1.0, 1.0, :tiers, true)
            ON CONFLICT (company_id) DO NOTHING
        """)
        await conn.execute(query, {
            "company_id": company_id,
            "tiers": LOYALTY_TIERS
        })
        await conn.commit()
        print(f"  ✅ Created loyalty program with {len(LOYALTY_TIERS['tiers'])} tiers")


async def main():
    """Main seed function"""
    print("=" * 60)
    print("Phase 1 Data Seeding")
    print("=" * 60)
    
    # Get first company from database (for initial seeding)
    # In production, this would be run per company during onboarding
    with engine.connect() as conn:
        result = await conn.execute(text("SELECT id FROM companies LIMIT 1"))
        company = result.first()
        
        if not company:
            print("❌ No companies found in database. Please create a company first.")
            return
        
        company_id = str(company.id)
        print(f"✓ Using company: {company_id}\n")
        
        # Seed all data
        await seed_tax_rates(company_id)
        await seed_asset_categories(company_id)
        await seed_loyalty_program(company_id)
    
    print("\n" + "=" * 60)
    print("✅ Phase 1 seeding complete!")
    print("=" * 60)
    print("\nSeeded data:")
    print(f"  - {len(TAX_RATES)} tax rates (FBR 2025)")
    print(f"  - {len(ASSET_CATEGORIES)} asset categories (FBR Third Schedule)")
    print(f"  - 1 loyalty program with {len(LOYALTY_TIERS['tiers'])} tiers")
    print("\nNext steps:")
    print("  1. Run: python -m app.scripts.verify_seed (to verify data)")
    print("  2. Start implementing User Story 1: Fixed Assets")


if __name__ == "__main__":
    asyncio.run(main())
