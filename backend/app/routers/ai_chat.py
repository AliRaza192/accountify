from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
import logging
import os

from app.database import supabase
from app.types import User
from app.routers.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    GEMINI_AVAILABLE = True
except Exception as e:
    logger.warning(f"Gemini AI not configured: {e}")
    GEMINI_AVAILABLE = False


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    response: str
    suggestions: List[str]


class AnalysisRequest(BaseModel):
    report_type: str
    data: dict


class AnalysisResponse(BaseModel):
    insights: List[str]
    recommendations: List[str]
    summary: str


def get_company_context(company_id: str) -> str:
    """Fetch company financial data for context"""
    context_parts = []
    
    try:
        # Get company info
        company_response = supabase.table("companies").select("name, currency").eq("id", company_id).execute()
        if company_response.data:
            company = company_response.data[0]
            context_parts.append(f"Company: {company['name']}")
            context_parts.append(f"Currency: {company['currency']}")
        
        # Get current month dates
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            month_end = now.replace(year=now.year + 1, month=1, day=1)
        else:
            month_end = now.replace(month=now.month + 1, day=1)
        
        # Total Revenue (confirmed invoices this month)
        invoices_response = supabase.table("invoices").select("total_amount").eq("company_id", company_id).eq("is_deleted", False).gte("invoice_date", month_start.isoformat()).lt("invoice_date", month_end.isoformat()).execute()
        total_revenue = sum(inv.get("total_amount", 0) for inv in invoices_response.data or [])
        context_parts.append(f"Current Month Revenue: PKR {total_revenue:,.2f}")
        
        # Total Expenses (confirmed bills this month)
        bills_response = supabase.table("bills").select("total_amount").eq("company_id", company_id).eq("is_deleted", False).gte("bill_date", month_start.isoformat()).lt("bill_date", month_end.isoformat()).execute()
        total_expenses = sum(bill.get("total_amount", 0) for bill in bills_response.data or [])
        context_parts.append(f"Current Month Expenses: PKR {total_expenses:,.2f}")
        
        # Net Profit
        net_profit = total_revenue - total_expenses
        context_parts.append(f"Current Month Net Profit: PKR {net_profit:,.2f}")
        
        # Outstanding Receivables
        receivables_response = supabase.table("invoices").select("balance_due").eq("company_id", company_id).eq("is_deleted", False).eq("status", "partial").execute()
        total_receivables = sum(inv.get("balance_due", 0) for inv in receivables_response.data or [])
        context_parts.append(f"Outstanding Receivables: PKR {total_receivables:,.2f}")
        
        # Outstanding Payables
        payables_response = supabase.table("bills").select("balance_due").eq("company_id", company_id).eq("is_deleted", False).eq("status", "partial").execute()
        total_payables = sum(bill.get("balance_due", 0) for bill in payables_response.data or [])
        context_parts.append(f"Outstanding Payables: PKR {total_payables:,.2f}")
        
        # Customer Count
        customers_response = supabase.table("customers").select("id", count="exact").eq("company_id", company_id).eq("is_deleted", False).execute()
        customer_count = customers_response.count or 0
        context_parts.append(f"Total Customers: {customer_count}")
        
        # Vendor Count
        vendors_response = supabase.table("vendors").select("id", count="exact").eq("company_id", company_id).eq("is_deleted", False).execute()
        vendor_count = vendors_response.count or 0
        context_parts.append(f"Total Vendors: {vendor_count}")
        
        # Product Count
        products_response = supabase.table("products").select("id", count="exact").eq("company_id", company_id).eq("is_deleted", False).execute()
        product_count = products_response.count or 0
        context_parts.append(f"Total Products: {product_count}")
        
        # Bank Balance
        bank_response = supabase.table("bank_accounts").select("balance").eq("company_id", company_id).eq("is_deleted", False).execute()
        total_bank_balance = sum(acc.get("balance", 0) for acc in bank_response.data or [])
        context_parts.append(f"Total Bank Balance: PKR {total_bank_balance:,.2f}")
        
    except Exception as e:
        logger.error(f"Error fetching company context: {e}")
    
    return "\n".join(context_parts)


def generate_suggestions(query_type: str) -> List[str]:
    """Generate follow-up question suggestions based on query type"""
    suggestions_map = {
        "sales": [
            "Is mahine ki sales pichle mahine se kitni hai?",
            "Kaun sa product sab se zyada bik raha hai?",
            "Top 5 customers by sales dikhao",
        ],
        "expenses": [
            "Sab se zyada expense kis cheez pe aa raha hai?",
            "Is mahine ka net profit kya hai?",
            "Budget vs actual comparison dikhao",
        ],
        "customers": [
            "Kaun se customers ka payment pending hai?",
            "Top customers by revenue dikhao",
            "Customer ledger kaise dekhun?",
        ],
        "inventory": [
            "Low stock products kaun se hain?",
            "Stock ki total value kya hai?",
            "Reorder level se kam items dikhao",
        ],
        "default": [
            "Is mahine ki total sales kya hai?",
            "Mera net profit kya hai?",
            "Outstanding payments kaun se hain?",
        ],
    }
    
    return suggestions_map.get(query_type, suggestions_map["default"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """Chat with AI accounting assistant"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    # Get company context
    company_context = get_company_context(str(current_user.company_id))
    
    # Detect query type from user message
    message_lower = request.message.lower()
    query_type = "default"
    if any(word in message_lower for word in ["sale", "revenue", "income", "invoice"]):
        query_type = "sales"
    elif any(word in message_lower for word in ["expense", "cost", "bill", "purchase"]):
        query_type = "expenses"
    elif any(word in message_lower for word in ["customer", "client", "receivable"]):
        query_type = "customers"
    elif any(word in message_lower for word in ["stock", "inventory", "product"]):
        query_type = "inventory"
    
    # System prompt
    system_prompt = f"""You are an expert accounting assistant for Pakistani businesses using AI Accounts software.
You help with accounting queries, financial analysis, and business insights.
You can speak both Urdu and English. Reply in the same language the user writes in.
Use Urdu script for Urdu responses and English for English responses.

Current company data:
{company_context}

Always give specific numbers when available. Be concise and helpful.
Format your responses clearly with bold text for important numbers.
If you don't have specific data, explain what information you would need."""

    # Build conversation history for context
    messages = []
    if request.conversation_history:
        for msg in request.conversation_history[-5:]:  # Last 5 messages for context
            messages.append({
                "role": msg.role,
                "parts": [msg.content]
            })
    
    # Add current message
    messages.append({
        "role": "user",
        "parts": [request.message]
    })
    
    try:
        if GEMINI_AVAILABLE:
            model = genai.GenerativeModel("gemini-2.0-flash-exp")
            response = model.generate_content(
                contents=[{"role": "user", "parts": [system_prompt + "\n\nUser query: " + request.message]}]
            )
            ai_response = response.text
        else:
            # Fallback response when Gemini is not configured
            ai_response = f"""Assalam o Alaikum! 

Main AI Accounts ka AI assistant hun. Filhal Gemini AI configure nahi hai, lekin main aap ki basic accounting queries mein madad kar sakta hun.

**Company Summary:**
{company_context}

Agar aap koi specific accounting query karna chahte hain to please poochein. Main aap ki puri koshish karunga madad karne ki."""
        
        # Generate suggestions
        suggestions = generate_suggestions(query_type)
        
        return ChatResponse(
            response=ai_response,
            suggestions=suggestions
        )
        
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate AI response")


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_financial_data(
    request: AnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    """Analyze financial data and provide insights"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    # Format data for analysis
    data_str = str(request.data)
    
    analysis_prompt = f"""You are a financial analyst expert. Analyze the following {request.report_type} data and provide:

1. Key insights (3-5 bullet points)
2. Actionable recommendations (2-3 bullet points)
3. A brief summary

Data:
{data_str}

Respond in a structured format with clear sections."""

    try:
        if GEMINI_AVAILABLE:
            model = genai.GenerativeModel("gemini-2.0-flash-exp")
            response = model.generate_content(analysis_prompt)
            analysis_text = response.text
            
            # Parse response into sections
            insights = []
            recommendations = []
            summary = analysis_text
            
            # Simple parsing (can be improved)
            if "insight" in analysis_text.lower():
                insights = [line.strip() for line in analysis_text.split("\n") if "insight" in line.lower() or line.strip().startswith("-") or line.strip().startswith("•")]
            if "recommend" in analysis_text.lower():
                recommendations = [line.strip() for line in analysis_text.split("\n") if "recommend" in line.lower() or line.strip().startswith("-") or line.strip().startswith("•")]
            
            return AnalysisResponse(
                insights=insights[:5],
                recommendations=recommendations[:3],
                summary=summary[:500] + "..." if len(summary) > 500 else summary
            )
        else:
            return AnalysisResponse(
                insights=["Gemini AI not configured for detailed analysis"],
                recommendations=["Configure Gemini API key for AI-powered insights"],
                summary="Financial analysis requires AI configuration."
            )
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to analyze data")


@router.get("/suggestions")
async def get_suggestions(
    current_user: User = Depends(get_current_user)
):
    """Get suggested questions for the user"""
    suggestions = [
        "Is mahine ki total sales kya hai?",
        "Kaun se customers ka payment pending hai?",
        "Mera net profit kya hai?",
        "Low stock products dikhao",
        "Top 5 customers by revenue",
        "Outstanding bills kaun se hain?",
        "Cash flow kaisa hai is mahine?",
        "Sab se zyada expense kis cheez pe aa raha hai?",
    ]
    return {"suggestions": suggestions}
