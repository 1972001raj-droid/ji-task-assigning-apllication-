import csv
import io
import uuid
from datetime import date, timedelta
from typing import List, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.issue import Issue, IssueType, IssueStatus
from app.db.models.project import Project, ProjectMembership
from app.db.models.user import User
from app.db.models.sprint import Sprint
from app.repositories.issue_repository import IssueRepository
from app.repositories.sprint_repository import SprintRepository
from app.schemas.analytics import (
    RoadmapItemResponse,
    TimelineItemResponse,
    BurndownResponse,
    BurndownPointResponse,
    TeamWorkloadResponse,
    WorkloadMemberResponse,
    ReportSummaryResponse,
)


class ReportService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.issue_repo = IssueRepository(session)
        self.sprint_repo = SprintRepository(session)

    async def get_roadmap(self, project_id: uuid.UUID) -> List[RoadmapItemResponse]:
        epics, _ = await self.issue_repo.search_and_filter(project_id=project_id, issue_type=IssueType.EPIC, limit=100)
        items = []

        for epic in epics:
            stories = await self.issue_repo.get_child_issues(epic.id)
            story_items = [
                RoadmapItemResponse(
                    id=s.id,
                    title=s.title,
                    issue_type=s.issue_type,
                    status=s.status,
                    estimate=s.estimate,
                    start_date=s.start_date,
                    due_date=s.due_date,
                    child_stories=[]
                ) for s in stories if s.issue_type == IssueType.STORY
            ]

            items.append(
                RoadmapItemResponse(
                    id=epic.id,
                    title=epic.title,
                    issue_type=epic.issue_type,
                    status=epic.status,
                    estimate=epic.estimate,
                    start_date=epic.start_date,
                    due_date=epic.due_date,
                    child_stories=story_items
                )
            )
        return items

    async def get_timeline(self, project_id: uuid.UUID) -> List[TimelineItemResponse]:
        issues, _ = await self.issue_repo.search_and_filter(project_id=project_id, limit=200)
        timeline_items = []

        for issue in issues:
            active_assignment = await self.sprint_repo.get_active_assignment(issue.id)
            sprint_id = active_assignment.sprint_id if active_assignment else None
            sprint_name = None
            if sprint_id:
                s = await self.sprint_repo.get(sprint_id)
                sprint_name = s.name if s else None

            timeline_items.append(
                TimelineItemResponse(
                    id=issue.id,
                    title=issue.title,
                    issue_type=issue.issue_type,
                    status=issue.status,
                    start_date=issue.start_date,
                    due_date=issue.due_date,
                    sprint_id=sprint_id,
                    sprint_name=sprint_name
                )
            )
        return timeline_items

    async def get_burndown(self, sprint_id: uuid.UUID) -> BurndownResponse:
        sprint = await self.sprint_repo.get(sprint_id)
        if not sprint:
            from app.core.exceptions import NotFoundException
            raise NotFoundException("Sprint", sprint_id)

        issue_ids = await self.sprint_repo.get_sprint_issue_ids(sprint_id)
        total_points = 0.0
        for iid in issue_ids:
            iss = await self.issue_repo.get(iid)
            if iss and iss.estimate:
                try:
                    total_points += float(iss.estimate)
                except ValueError:
                    total_points += 1.0

        days_count = max((sprint.due_date.date() - sprint.start_date.date()).days, 1)
        points = []
        for i in range(days_count + 1):
            current_date = sprint.start_date.date() + timedelta(days=i)
            ideal = max(total_points - (total_points / days_count) * i, 0.0)
            actual = total_points  # Mock calculated burndown curve based on active metrics
            points.append(
                BurndownPointResponse(
                    date=current_date,
                    ideal_remaining=round(ideal, 2),
                    actual_remaining=round(actual, 2),
                    completed_points=round(total_points - actual, 2)
                )
            )

        return BurndownResponse(
            sprint_id=sprint.id,
            sprint_name=sprint.name,
            total_points=total_points,
            points=points
        )

    async def get_team_workload(self, project_id: uuid.UUID) -> TeamWorkloadResponse:
        stmt = select(ProjectMembership).where(ProjectMembership.project_id == project_id)
        memberships = list((await self.session.execute(stmt)).scalars().all())
        members = []

        for m in memberships:
            user = await self.session.get(User, m.user_id)
            if not user:
                continue

            issues, count = await self.issue_repo.search_and_filter(project_id=project_id, assignee_id=user.id)
            members.append(
                WorkloadMemberResponse(
                    user_id=user.id,
                    username=user.username,
                    full_name=user.full_name,
                    role=m.role.value,
                    assigned_issues_count=count,
                    assigned_issues=[
                        {"id": str(i.id), "title": i.title, "status": i.status.value, "estimate": i.estimate}
                        for i in issues
                    ]
                )
            )

        return TeamWorkloadResponse(
            project_id=project_id,
            members=members
        )

    async def generate_issues_csv(self, project_id: uuid.UUID) -> str:
        issues, _ = await self.issue_repo.search_and_filter(project_id=project_id, limit=500)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Title", "Type", "Status", "Priority", "Estimate", "Assignee ID", "Created At"])

        for issue in issues:
            writer.writerow([
                str(issue.id),
                issue.title,
                issue.issue_type.value,
                issue.status.value,
                issue.priority.value,
                issue.estimate or "",
                str(issue.assignee_id) if issue.assignee_id else "",
                issue.created_at.isoformat()
            ])

        return output.getvalue()
