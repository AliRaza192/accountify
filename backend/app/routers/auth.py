from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from supabase import AuthError
from jose import JWTError, jwt
from datetime import datetime, timezone, timedelta
import logging

from app.database import supabase
from app.config import settings
from app.types import User

router = APIRouter()
logger = logging.getLogger(__name__)


def get_supabase_client():
    """Get Supabase client instance"""
    return supabase


async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    """Get current user from JWT token"""
    logger.info(f"Authorization header received: {authorization[:30] if authorization else None}...")

    if not authorization or not authorization.startswith("Bearer "):
        logger.error(f"Invalid or missing authorization header: {authorization}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = authorization.replace("Bearer ", "")
    logger.info(f"Token extracted successfully, length: {len(token)}")

    # Use Supabase to verify the token instead of manual JWT decoding
    try:
        user_response = supabase.auth.get_user(token)
        user = user_response.user
        
        if not user:
            logger.error("No user found in token response")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        user_id = user.id
        logger.info(f"User authenticated: {user_id}")
    except Exception as e:
        logger.error(f"Token validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Get user profile from Supabase
    profile_response = supabase.table("user_profiles").select(
        "id, full_name, company_id, companies!fk_user_profiles_company(name)"
    ).eq("id", user_id).execute()
    
    if not profile_response.data or len(profile_response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    profile = profile_response.data[0]
    
    # Get email from auth.users via admin API
    try:
        user_response = supabase.auth.admin.get_user(user_id)
        email = user_response.user.email if user_response.user else ""
    except Exception:
        email = ""
    
    return User(
        id=user_id,
        email=email,
        full_name=profile.get("full_name", ""),
        company_id=profile.get("company_id"),
        company_name=profile["companies"]["name"] if profile.get("companies") else None
    )


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    company_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    company_id: Optional[str] = None
    company_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MeResponse(BaseModel):
    id: str
    email: str
    full_name: str
    company_id: Optional[str] = None
    company_name: Optional[str] = None


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest):
    try:
        # Step 1: Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "full_name": request.full_name
                }
            }
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user in auth"
            )

        user_id = auth_response.user.id

        # Step 2: Insert into user_profiles table
        profile_data = {
            "id": user_id,
            "full_name": request.full_name
        }
        
        profile_response = supabase.table("user_profiles").insert(profile_data).execute()

        if not profile_response.data or len(profile_response.data) == 0:
            # Check if it's a policy violation
            print(f"Profile creation failed: {profile_response}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create user profile: {profile_response}"
            )

        # Step 3: Create company
        company_data = {
            "name": request.company_name,
            "currency": "PKR"
        }
        
        company_response = supabase.table("companies").insert(company_data).execute()

        if not company_response.data or len(company_response.data) == 0:
            print(f"Company creation failed: {company_response}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create company: {company_response}"
            )

        company_id = company_response.data[0]["id"]

        # Step 4: Update company owner_id
        supabase.table("companies").update({"owner_id": user_id}).eq("id", company_id).execute()

        # Step 5: Update user_profiles with company_id
        supabase.table("user_profiles").update({"company_id": company_id}).eq("id", user_id).execute()

        # Step 6: Sign in immediately to get session
        sign_in_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        if not sign_in_response.session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create session"
            )

        # Step 7: Return response
        return TokenResponse(
            access_token=sign_in_response.session.access_token,
            token_type="bearer",
            user=UserResponse(
                id=user_id,
                email=request.email,
                full_name=request.full_name,
                company_id=str(company_id),
                company_name=request.company_name
            )
        )

    except AuthError as e:
        print(f"AuthError: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Auth error: {str(e)}"
        )
    except Exception as e:
        print(f"Exception: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    try:
        # Step 1: Sign in with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        user = auth_response.user
        session = auth_response.session

        # Step 2: Get user profile from user_profiles table
        profile_response = supabase.table("user_profiles").select(
            "full_name, company_id, companies!fk_user_profiles_company(name)"
        ).eq("id", user.id).execute()

        full_name = request.email  # Default to email
        company_id = None
        company_name = None

        if profile_response.data and len(profile_response.data) > 0:
            profile = profile_response.data[0]
            full_name = profile.get("full_name", request.email)
            company_id = profile.get("company_id")
            if profile.get("companies"):
                company_name = profile["companies"].get("name")

        # Step 3: Return response
        return TokenResponse(
            access_token=session.access_token,
            token_type="bearer",
            user=UserResponse(
                id=user.id,
                email=user.email or request.email,
                full_name=full_name,
                company_id=company_id,
                company_name=company_name
            )
        )

    except AuthError as e:
        print(f"AuthError during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Exception during login: {type(e).__name__} - {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/me", response_model=MeResponse)
async def get_me(authorization: Optional[str] = Header(None)):
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header"
            )

        token = authorization.replace("Bearer ", "")

        # Get user from token
        user_response = supabase.auth.get_user(token)

        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        user = user_response.user

        # Get user profile
        profile_response = supabase.table("user_profiles").select(
            "full_name, company_id, companies!fk_user_profiles_company(name)"
        ).eq("id", user.id).execute()

        full_name = user.email
        company_id = None
        company_name = None

        if profile_response.data and len(profile_response.data) > 0:
            profile = profile_response.data[0]
            full_name = profile.get("full_name", user.email)
            company_id = profile.get("company_id")
            if profile.get("companies"):
                company_name = profile["companies"].get("name")

        return MeResponse(
            id=user.id,
            email=user.email or "",
            full_name=full_name,
            company_id=company_id,
            company_name=company_name
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    try:
        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            supabase.auth.admin.sign_out(token)
        
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
