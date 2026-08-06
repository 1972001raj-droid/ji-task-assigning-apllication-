import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.core.permissions import SystemRole
from app.db.models.project import EstimationScheme


class ProjectCreate(BaseModel):
    org_id: uuid.UUID
    name: str = Field(..., min_length=2, max_length=100)
    key: str = Field(..., min_length=2, max_length=10)
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    name: str
    key: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProjectMembershipCreate(BaseModel):
    user_id: uuid.UUID
    role: SystemRole = SystemRole.DEVELOPER_TESTER


class ProjectMembershipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    role: SystemRole
    created_at: datetime


class ProjectEstimationSettingsUpdate(BaseModel):
    scheme: EstimationScheme
    allowed_values: List[str]


class ProjectEstimationSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    scheme: EstimationScheme
    allowed_values: List[str]
