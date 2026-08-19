import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Optional as _Optional
from app.db.models.issue import IssueType, IssueStatus, IssuePriority
from app.schemas.auth import UserResponse


class AcceptanceCriteriaCreate(BaseModel):
    description: _Optional[str] = Field(None, min_length=1, max_length=500)
    text: _Optional[str] = Field(None, min_length=1, max_length=500)
    position: int = 0

    @model_validator(mode="after")
    def resolve_description(self) -> "AcceptanceCriteriaCreate":
        if not self.description and self.text:
            self.description = self.text
        if not self.description:
            raise ValueError("Either 'description' or 'text' must be provided")
        return self


class AcceptanceCriteriaUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    is_completed: Optional[bool] = None
    position: Optional[int] = None


class AcceptanceCriteriaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    story_id: uuid.UUID
    description: str
    is_completed: bool
    completed_by_id: Optional[uuid.UUID] = None
    completed_at: Optional[datetime] = None
    position: int
    created_at: datetime


class IssueCommentCreate(BaseModel):
    content: str = Field(..., min_length=1)


class IssueCommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    issue_id: uuid.UUID
    author_id: uuid.UUID
    author: Optional[UserResponse] = None
    content: str
    created_at: datetime
    updated_at: datetime


class IssueCreate(BaseModel):
    project_id: uuid.UUID
    issue_type: IssueType
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    priority: IssuePriority = IssuePriority.MEDIUM
    estimate: Optional[str] = None
    parent_issue_id: Optional[uuid.UUID] = None
    assignee_id: Optional[uuid.UUID] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None


class IssueUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    priority: Optional[IssuePriority] = None
    estimate: Optional[str] = None
    parent_issue_id: Optional[uuid.UUID] = None
    assignee_id: Optional[uuid.UUID] = None
    position: Optional[float] = None
    version: int = Field(..., description="Current optimistic lock version required for updates")
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None


class IssueTransitionRequest(BaseModel):
    target_status: IssueStatus
    current_version: int = Field(..., description="Current version of the issue for optimistic locking")


class IssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    issue_type: IssueType
    status: IssueStatus
    parent_issue_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    priority: IssuePriority
    estimate: Optional[str] = None
    assignee_id: Optional[uuid.UUID] = None
    reporter_id: uuid.UUID
    position: float
    version: int
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    effective_epic_id: Optional[uuid.UUID] = None
    sprint_id: Optional[uuid.UUID] = None


class IssueDetailResponse(IssueResponse):
    assignee: Optional[UserResponse] = None
    reporter: Optional[UserResponse] = None
    acceptance_criteria: List[AcceptanceCriteriaResponse] = []
    comments: List[IssueCommentResponse] = []
    is_eligible_for_review: bool = False
    is_eligible_for_done: bool = False
