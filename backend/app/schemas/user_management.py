import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.core.permissions import SystemRole
from app.db.models.user import UserStatus


class UserProvisionRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=12, max_length=100)
    full_name: Optional[str] = Field(None, max_length=100)
    role: SystemRole
    org_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None


class UserInviteRequest(BaseModel):
    email: EmailStr
    role: SystemRole
    full_name: Optional[str] = Field(None, max_length=100)
    org_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None


class UserStatusUpdateRequest(BaseModel):
    status: UserStatus
    reassign_to_user_id: Optional[uuid.UUID] = None


class UserUpdatePayload(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
