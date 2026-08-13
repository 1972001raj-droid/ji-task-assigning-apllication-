import uuid
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.issue import Issue, IssueType, IssueStatus, IssuePriority
from app.db.models.acceptance_criteria import AcceptanceCriteria
from app.db.models.comment import IssueComment
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    PermissionDeniedException,
)
from app.repositories.issue_repository import IssueRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.activity_repository import ActivityRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.outbox_repository import OutboxRepository
from app.schemas.issue import IssueCreate, IssueUpdate, AcceptanceCriteriaCreate, AcceptanceCriteriaUpdate


class IssueService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.issue_repo = IssueRepository(session)
        self.project_repo = ProjectRepository(session)
        self.activity_repo = ActivityRepository(session)
        self.audit_repo = AuditRepository(session)
        self.outbox_repo = OutboxRepository(session)

    async def validate_hierarchy(self, issue_type: IssueType, parent_issue_id: Optional[uuid.UUID], project_id: uuid.UUID) -> Optional[Issue]:
        if parent_issue_id is None:
            if issue_type == IssueType.STORY:
                raise ValidationException("A User Story must be linked to an Epic as its parent.")
            if issue_type == IssueType.TASK:
                raise ValidationException("A Task must be linked to a User Story as its parent.")
            if issue_type == IssueType.BUG:
                raise ValidationException("A Bug must be linked to a User Story as its parent.")
            if issue_type == IssueType.SUBTASK:
                raise ValidationException("A Subtask must be linked to a Task as its parent.")
            return None

        parent = await self.issue_repo.get(parent_issue_id)
        if not parent or parent.project_id != project_id:
            raise ValidationException("Parent issue not found in the same project.")

        if issue_type == IssueType.EPIC:
            raise ValidationException("An Epic cannot have a parent issue.")

        if issue_type == IssueType.STORY and parent.issue_type != IssueType.EPIC:
            raise ValidationException("A User Story must be linked to an Epic as its parent.")

        if issue_type == IssueType.TASK and parent.issue_type != IssueType.STORY:
            raise ValidationException("A Task must be linked to a User Story as its parent.")

        if issue_type == IssueType.BUG and parent.issue_type != IssueType.STORY:
            raise ValidationException("A Bug must be linked to a User Story as its parent.")

        if issue_type == IssueType.SUBTASK and parent.issue_type != IssueType.TASK:
            raise ValidationException("A Subtask must be linked to a Task as its parent.")

        return parent

    async def validate_estimate(self, project_id: uuid.UUID, estimate: Optional[str]) -> None:
        if not estimate:
            return
        settings = await self.project_repo.get_estimation_settings(project_id)
        if settings and settings.allowed_values:
            if estimate not in settings.allowed_values:
                raise ValidationException(
                    f"Invalid estimate '{estimate}'. Allowed values for scheme {settings.scheme.value}: {settings.allowed_values}"
                )

    async def create_issue(self, data: IssueCreate, reporter_id: uuid.UUID) -> Issue:
        parent = await self.validate_hierarchy(data.issue_type, data.parent_issue_id, data.project_id)
        
        # Epics and Subtasks do not have estimates / story points
        if data.issue_type in (IssueType.EPIC, IssueType.SUBTASK):
            data.estimate = None
        else:
            await self.validate_estimate(data.project_id, data.estimate)

        issue = Issue(
            project_id=data.project_id,
            issue_type=data.issue_type,
            status=IssueStatus.BACKLOG,
            parent_issue_id=data.parent_issue_id,
            title=data.title,
            description=data.description,
            priority=data.priority,
            estimate=data.estimate,
            assignee_id=data.assignee_id,
            reporter_id=reporter_id,
            start_date=data.start_date,
            due_date=data.due_date,
            position=0.0,
            version=1
        )
        await self.issue_repo.create(issue)

        await self.activity_repo.log_activity(
            issue_id=issue.id,
            user_id=reporter_id,
            action="ISSUE_CREATED",
            details={"title": issue.title, "type": issue.issue_type.value}
        )

        await self.audit_repo.log_audit(
            action="ISSUE_CREATE",
            resource_type="issue",
            user_id=reporter_id,
            project_id=data.project_id,
            resource_id=str(issue.id),
            details={"title": issue.title, "type": issue.issue_type.value}
        )

        await self.session.commit()
        return issue

    async def get_effective_epic_id(self, issue: Issue) -> Optional[uuid.UUID]:
        if issue.issue_type == IssueType.EPIC:
            return issue.id
        if issue.issue_type == IssueType.STORY:
            return issue.parent_issue_id
        if issue.issue_type in (IssueType.TASK, IssueType.BUG) and issue.parent_issue_id:
            parent_story = await self.issue_repo.get(issue.parent_issue_id)
            if parent_story:
                return parent_story.parent_issue_id
        return None

    async def add_acceptance_criteria(self, story_id: uuid.UUID, data: AcceptanceCriteriaCreate, user_id: uuid.UUID) -> AcceptanceCriteria:
        story = await self.issue_repo.get(story_id)
        if not story or story.issue_type != IssueType.STORY:
            raise ValidationException("Acceptance criteria can only be added to a Story.")

        ac = AcceptanceCriteria(
            story_id=story_id,
            description=data.description,
            position=data.position
        )
        self.session.add(ac)
        await self.session.flush()
        await self.session.commit()
        return ac

    async def update_acceptance_criteria(self, ac_id: uuid.UUID, data: AcceptanceCriteriaUpdate, user_id: uuid.UUID) -> AcceptanceCriteria:
        stmt = await self.session.get(AcceptanceCriteria, ac_id)
        if not stmt:
            raise NotFoundException("AcceptanceCriteria", ac_id)

        if data.description is not None:
            stmt.description = data.description
        if data.is_completed is not None:
            stmt.is_completed = data.is_completed
            if data.is_completed:
                stmt.completed_by_id = user_id
                stmt.completed_at = datetime.now(timezone.utc)
            else:
                stmt.completed_by_id = None
                stmt.completed_at = None
        if data.position is not None:
            stmt.position = data.position

        await self.session.flush()
        await self.session.commit()
        return stmt

    async def add_comment(self, issue_id: uuid.UUID, content: str, author_id: uuid.UUID) -> IssueComment:
        issue = await self.issue_repo.get(issue_id)
        if not issue:
            raise NotFoundException("Issue", issue_id)

        comment = IssueComment(
            issue_id=issue_id,
            author_id=author_id,
            content=content
        )
        self.session.add(comment)
        await self.session.flush()

        await self.activity_repo.log_activity(
            issue_id=issue_id,
            user_id=author_id,
            action="COMMENT_ADDED",
            details={"comment_id": str(comment.id)}
        )

        await self.session.commit()
        return comment
