from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from datetime import datetime
from typing import Optional
import re


def validate_strict_phone(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    val = v.strip()
    if not val:
        return None
    # If starting with '+', limit to 13 characters (e.g. +251983072052).
    # If starting without '+' (e.g. 0983072052), limit to 10 characters.
    if val.startswith("+"):
        if not re.match(r"^\+[0-9]{7,12}$", val) or len(val) > 13:
            raise ValueError("Phone number must contain only numbers and be at most 13 characters for international format (e.g. +251983072052).")
    else:
        if not re.match(r"^[0-9]{7,10}$", val) or len(val) > 10:
            raise ValueError("Phone number must contain only numbers and be at most 10 digits for local format (e.g. 0983072052).")
    return val


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    phone_number: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_strict_phone(v)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    department: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_strict_phone(v)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: str
    is_active: bool = True
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    department: Optional[str] = None
    created_at: datetime


class UserProfilePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: str
    is_active: bool = True
    full_name: Optional[str] = None
    department: Optional[str] = None
    phone_number: Optional[str] = None  # Gated: only revealed to authorized claim participants or admins
    reports_count: int = 0
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
