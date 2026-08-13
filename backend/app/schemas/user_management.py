import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.core.permissions import SystemRole


class UserProvisionRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: Optional[str] = Field(None, max_length=100)
    role: SystemRole
    org_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
