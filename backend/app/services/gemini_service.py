"""
Gemini AI Service for Accountify
Provides AI-powered features: bank transaction categorization, lead scoring, asset categorization
Uses Google Gemini 2.0 Flash API
"""

import asyncio
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from decimal import Decimal
import google.generativeai as genai
from app.config import settings

logger = logging.getLogger(__name__)


class GeminiService:
    """AI service for Accountify using Gemini 2.0 Flash"""
    
    def __init__(self):
        """Initialize Gemini client"""
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not configured. AI features disabled.")
            self.client = None
            return
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.client = genai.GenerativeModel('gemini-2.0-flash-exp')
        logger.info("Gemini AI service initialized")
    
    async def categorize_bank_transaction(
        self,
        description: str,
        amount: Decimal,
        transaction_type: str,
        previous_transactions: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Categorize a bank transaction using AI
        
        Args:
            description: Bank transaction description
            amount: Transaction amount
            transaction_type: 'debit' or 'credit'
            previous_transactions: Similar transactions for context
        
        Returns:
            Dict with category, confidence, and reasoning
        """
        if not self.client:
            return {"category": "Other", "confidence": 0.0, "reasoning": "AI service unavailable"}
        
        categories = [
            "Office Supplies", "Utilities", "Rent", "Salary", "Travel",
            "Entertainment", "Professional Services", "Equipment",
            "Sales Revenue", "Loan Payment", "Tax Payment", "Bank Charges",
            "Insurance", "Marketing", "Maintenance", "Other"
        ]
        
        prompt = f"""You are an accounting assistant. Categorize this bank transaction into one of these categories: {', '.join(categories)}

Transaction Details:
- Date: {datetime.now().strftime('%Y-%m-%d')}
- Description: {description}
- Amount: PKR {amount}
- Type: {transaction_type}

Respond in JSON format ONLY:
{{
    "category": "category name",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation"
}}"""
        
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.generate_content,
                    prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        temperature=0.1,
                        max_output_tokens=500
                    )
                ),
                timeout=5.0
            )
            
            result = json.loads(response.text)
            logger.info(f"Categorized transaction: {result['category']} (confidence: {result['confidence']})")
            return result
            
        except asyncio.TimeoutError:
            logger.warning("AI categorization timeout")
            return {"category": "Other", "confidence": 0.0, "reasoning": "AI timeout"}
        except Exception as e:
            logger.error(f"AI categorization error: {e}")
            return {"category": "Other", "confidence": 0.0, "reasoning": f"AI error: {str(e)}"}
    
    async def score_lead(
        self,
        source: str,
        estimated_value: Optional[Decimal],
        company_size: Optional[str],
        engagement_level: str,
        industry: Optional[str],
        source_stats: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Score a lead from 0-100 based on conversion likelihood
        
        Args:
            source: Lead source (website, whatsapp, referral, etc.)
            estimated_value: Expected deal value
            company_size: Company size (small, medium, large)
            engagement_level: Engagement level (low, medium, high)
            industry: Industry type
            source_stats: Historical conversion rates by source
        
        Returns:
            Dict with score, factors, and recommended_action
        """
        if not self.client:
            return {"score": 50, "factors": ["AI unavailable"], "recommended_action": "Follow up normally"}
        
        prompt = f"""Score this sales lead from 0-100 based on likelihood to convert.

Lead Information:
- Source: {source}
- Estimated Value: PKR {estimated_value or 'Not specified'}
- Company Size: {company_size or 'Not specified'}
- Engagement Level: {engagement_level}
- Industry: {industry or 'Not specified'}
- Historical conversion rates by source: {source_stats or 'Not available'}

Respond in JSON format ONLY:
{{
    "score": 0-100,
    "factors": ["factor1", "factor2", "factor3"],
    "recommended_action": "specific next step"
}}"""
        
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.generate_content,
                    prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                        max_output_tokens=500
                    )
                ),
                timeout=5.0
            )
            
            result = json.loads(response.text)
            logger.info(f"Lead scored: {result['score']}/100")
            return result
            
        except Exception as e:
            logger.error(f"Lead scoring error: {e}")
            return {"score": 50, "factors": ["AI error"], "recommended_action": "Follow up normally"}
    
    async def suggest_asset_category(
        self,
        asset_name: str,
        description: str,
        purchase_cost: Decimal,
        expected_use: str
    ) -> Dict[str, Any]:
        """
        Suggest the correct asset category for depreciation
        
        Args:
            asset_name: Asset name
            description: Asset description
            purchase_cost: Purchase cost
            expected_use: How the asset will be used
        
        Returns:
            Dict with category, depreciation_rate, method, and useful_life_years
        """
        if not self.client:
            return {
                "category": "Furniture & Fixtures",
                "depreciation_rate": 10.0,
                "method": "SLM",
                "useful_life_years": 10
            }
        
        categories = [
            "Buildings (5%, SLM)",
            "Plant & Machinery (15%, WDV)",
            "Vehicles (20%, WDV)",
            "Computers & IT Equipment (30%, WDV)",
            "Furniture & Fixtures (10%, SLM)",
            "Intangible Assets (10%, SLM)"
        ]
        
        prompt = f"""Suggest the correct asset category for depreciation purposes (FBR Pakistan rates).

Asset Details:
- Name: {asset_name}
- Description: {description}
- Purchase Cost: PKR {purchase_cost}
- Expected Use: {expected_use}

Available Categories (with FBR rates):
{', '.join(categories)}

Respond in JSON format ONLY:
{{
    "category": "category name",
    "depreciation_rate": 0.0,
    "method": "SLM or WDV",
    "useful_life_years": number
}}"""
        
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.generate_content,
                    prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        temperature=0.1,
                        max_output_tokens=500
                    )
                ),
                timeout=5.0
            )
            
            result = json.loads(response.text)
            logger.info(f"Asset categorized: {result['category']}")
            return result
            
        except Exception as e:
            logger.error(f"Asset categorization error: {e}")
            return {
                "category": "Furniture & Fixtures",
                "depreciation_rate": 10.0,
                "method": "SLM",
                "useful_life_years": 10
            }
    
    async def categorize_support_ticket(
        self,
        description: str,
        customer_type: str
    ) -> Dict[str, Any]:
        """
        Categorize and prioritize a support ticket
        
        Args:
            description: Ticket description
            customer_type: Customer type (small, medium, enterprise)
        
        Returns:
            Dict with category, priority, and suggested_response
        """
        if not self.client:
            return {
                "category": "general",
                "priority": "medium",
                "suggested_response": "Thank you for contacting support. We will get back to you shortly."
            }
        
        prompt = f"""Categorize and prioritize this support ticket.

Ticket Description:
{description}

Customer Type: {customer_type}

Respond in JSON format ONLY:
{{
    "category": "billing|technical|general|complaint",
    "priority": "low|medium|high|critical",
    "suggested_response": "professional initial response"
}}"""
        
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.generate_content,
                    prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                        max_output_tokens=500
                    )
                ),
                timeout=5.0
            )
            
            result = json.loads(response.text)
            logger.info(f"Ticket categorized: {result['category']} (priority: {result['priority']})")
            return result
            
        except Exception as e:
            logger.error(f"Ticket categorization error: {e}")
            return {
                "category": "general",
                "priority": "medium",
                "suggested_response": "Thank you for contacting support."
            }


# Singleton instance
gemini_service = GeminiService()


# Dependency injection
def get_gemini_service() -> GeminiService:
    """Get Gemini service instance"""
    return gemini_service
