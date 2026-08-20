import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.core.permissions import SystemRole
from app.db.models.user import UserStatus


class LoginRequest(BaseModel):
    username_or_email: str = Field(..., min_length=1, description="Email or Username")
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: str
    full_name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    dark_mode_enabled: bool = False
    status: Optional[str] = "ACTIVE"
    must_change_password: bool = False
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    roles: List[str] = []
    dashboard_route: str = "/dashboard/developer"


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=12, description="Password must be at least 12 characters")
    full_name: Optional[str] = None
    is_superuser: bool = False


class UserPreferenceUpdate(BaseModel):
    dark_mode_enabled: Optional[bool] = None
    full_name: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=12, description="Password must be at least 12 characters")


class ForgotPasswordRequest(BaseModel):
    identifier: str = Field(..., min_length=1, description="Username or Email")


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=12, description="Password must be at least 12 characters")


class ActivateAccountRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=12, description="Password must be at least 12 characters")
    full_name: Optional[str] = None


class LoginResponse(BaseModel):
    user: UserResponse
    csrf_token: str
    message: str = "Login successful"


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_current: bool = False
