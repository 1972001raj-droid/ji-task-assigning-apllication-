import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.db.models.sprint import SprintStatus
from app.schemas.issue import IssueResponse


class SprintCreate(BaseModel):
    project_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=100)
    goal: Optional[str] = None
    start_date: datetime
    due_date: datetime


class SprintUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    goal: Optional[str] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    status: Optional[SprintStatus] = None


class SprintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    goal: Optional[str] = None
    start_date: datetime
    due_date: datetime
    status: SprintStatus
    effective_status: Optional[SprintStatus] = None
    is_overdue: bool = False
    days_remaining: Optional[int] = None
    day_counter_text: Optional[str] = None
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class SprintAddIssueRequest(BaseModel):
    issue_id: uuid.UUID


class BoardColumnResponse(BaseModel):
    status: str
    issues: List[IssueResponse] = []


class BoardResponse(BaseModel):
    sprint_id: Optional[uuid.UUID] = None
    project_id: uuid.UUID
    columns: List[BoardColumnResponse] = []
