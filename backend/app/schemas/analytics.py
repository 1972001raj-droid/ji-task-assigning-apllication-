import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.db.models.issue import IssueType, IssueStatus


class RoadmapItemResponse(BaseModel):
    id: uuid.UUID
    title: str
    issue_type: IssueType
    status: IssueStatus
    estimate: Optional[str] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    child_stories: List["RoadmapItemResponse"] = []


class TimelineItemResponse(BaseModel):
    id: uuid.UUID
    title: str
    issue_type: IssueType
    status: IssueStatus
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    sprint_id: Optional[uuid.UUID] = None
    sprint_name: Optional[str] = None


class BurndownPointResponse(BaseModel):
    date: date
    ideal_remaining: float
    actual_remaining: float
    completed_points: float


class BurndownResponse(BaseModel):
    sprint_id: uuid.UUID
    sprint_name: str
    total_points: float
    points: List[BurndownPointResponse] = []


class WorkloadMemberResponse(BaseModel):
    user_id: uuid.UUID
    username: str
    full_name: Optional[str] = None
    role: str
    assigned_issues_count: int
    assigned_issues: List[Dict[str, Any]] = []


class TeamWorkloadResponse(BaseModel):
    project_id: uuid.UUID
    members: List[WorkloadMemberResponse] = []


class ReportSummaryResponse(BaseModel):
    project_id: uuid.UUID
    total_issues: int
    by_status: Dict[str, int]
    by_type: Dict[str, int]
    by_priority: Dict[str, int]
    sprint_completion_rate: float
