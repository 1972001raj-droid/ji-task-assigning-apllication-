import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.core.permissions import SystemRole


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100)


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    created_at: datetime
    updated_at: datetime


class OrganizationMembershipCreate(BaseModel):
    user_id: uuid.UUID
    role: SystemRole = SystemRole.DEVELOPER_TESTER


class OrganizationMembershipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    user_id: uuid.UUID
    role: SystemRole
    created_at: datetime
