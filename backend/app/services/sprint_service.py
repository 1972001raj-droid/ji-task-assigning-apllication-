import uuid
from datetime import datetime
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.sprint import Sprint, SprintStatus, SprintIssueAssignment
from app.db.models.issue import Issue, IssueType, IssueStatus
from app.core.exceptions import NotFoundException, ValidationException
from app.repositories.sprint_repository import SprintRepository
from app.repositories.issue_repository import IssueRepository
from app.repositories.activity_repository import ActivityRepository
from app.repositories.audit_repository import AuditRepository
from app.schemas.sprint import SprintCreate, SprintUpdate, BoardResponse, BoardColumnResponse


class SprintService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.sprint_repo = SprintRepository(session)
        self.issue_repo = IssueRepository(session)
        self.activity_repo = ActivityRepository(session)
        self.audit_repo = AuditRepository(session)

    async def create_sprint(self, data: SprintCreate, creator_id: uuid.UUID) -> Sprint:
        if data.start_date > data.due_date:
            raise ValidationException("Sprint start date cannot be after due date.")

        sprint = Sprint(
            project_id=data.project_id,
            name=data.name,
            goal=data.goal,
            start_date=data.start_date,
            due_date=data.due_date,
            status=SprintStatus.PLANNED,
            created_by_id=creator_id
        )
        await self.sprint_repo.create(sprint)

        await self.audit_repo.log_audit(
            action="SPRINT_CREATE",
            resource_type="sprint",
            user_id=creator_id,
            project_id=data.project_id,
            resource_id=str(sprint.id),
            details={"name": sprint.name}
        )

        await self.session.commit()
        return sprint

    async def add_issue_to_sprint(self, sprint_id: uuid.UUID, issue_id: uuid.UUID, user_id: uuid.UUID) -> List[uuid.UUID]:
        """
        Add issue to sprint. FR-18 rule: If a Task is added to a sprint,
        automatically include its parent Story and all linked Tasks in the same transaction.
        """
        sprint = await self.sprint_repo.get(sprint_id)
        if not sprint:
            raise NotFoundException("Sprint", sprint_id)

        issue = await self.issue_repo.get(issue_id)
        if not issue or issue.project_id != sprint.project_id:
            raise NotFoundException("Issue", issue_id)

        added_issue_ids = []

        if issue.issue_type == IssueType.TASK and issue.parent_issue_id:
            # Add task
            await self.sprint_repo.assign_issue_to_sprint(sprint_id, issue.id, user_id)
            added_issue_ids.append(issue.id)

            # Add parent Story
            parent_story = await self.issue_repo.get(issue.parent_issue_id)
            if parent_story:
                await self.sprint_repo.assign_issue_to_sprint(sprint_id, parent_story.id, user_id)
                added_issue_ids.append(parent_story.id)

                # Add all sibling linked tasks
                sibling_tasks = await self.issue_repo.get_linked_tasks(parent_story.id)
                for task in sibling_tasks:
                    if task.id != issue.id:
                        await self.sprint_repo.assign_issue_to_sprint(sprint_id, task.id, user_id)
                        added_issue_ids.append(task.id)
        else:
            await self.sprint_repo.assign_issue_to_sprint(sprint_id, issue.id, user_id)
            added_issue_ids.append(issue.id)

        await self.session.commit()
        return added_issue_ids

    async def get_board(self, project_id: uuid.UUID, sprint_id: Optional[uuid.UUID] = None) -> BoardResponse:
        if sprint_id:
            issue_ids = await self.sprint_repo.get_sprint_issue_ids(sprint_id)
            issues = []
            for iid in issue_ids:
                iss = await self.issue_repo.get(iid)
                if iss:
                    issues.append(iss)
        else:
            # Backlog or overall project board
            issues, _ = await self.issue_repo.search_and_filter(project_id=project_id, limit=200)

        # Categorize by status
        columns_dict: Dict[str, List[Issue]] = {
            IssueStatus.BACKLOG.value: [],
            IssueStatus.TODO.value: [],
            IssueStatus.IN_PROGRESS.value: [],
            IssueStatus.REVIEW.value: [],
            IssueStatus.DONE.value: [],
        }

        for issue in issues:
            if issue.status.value in columns_dict:
                columns_dict[issue.status.value].append(issue)

        board_columns = [
            BoardColumnResponse(status=status_name, issues=issue_list)
            for status_name, issue_list in columns_dict.items()
        ]

        return BoardResponse(
            sprint_id=sprint_id,
            project_id=project_id,
            columns=board_columns
        )
