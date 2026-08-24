from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Optional[str] = "employee"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserRoleUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class PasswordResetRequest(BaseModel):
    new_password: str
