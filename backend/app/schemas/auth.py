import uuid
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.core.permissions import SystemRole


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
    dark_mode_enabled: bool
    roles: List[SystemRole] = []
    dashboard_route: str = "/dashboard/developer"


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    is_superuser: bool = False


class UserPreferenceUpdate(BaseModel):
    dark_mode_enabled: Optional[bool] = None
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
