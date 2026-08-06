import uuid
from typing import Optional, List, Tuple
from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.models.issue import Issue, IssueType, IssueStatus, IssuePriority
from app.db.models.acceptance_criteria import AcceptanceCriteria
from app.db.models.comment import IssueComment
from app.db.models.sprint import SprintIssueAssignment
from app.repositories.base import BaseRepository


class IssueRepository(BaseRepository[Issue]):
    def __init__(self, session: AsyncSession):
        super().__init__(Issue, session)

    async def get(self, id: uuid.UUID) -> Optional[Issue]:
        stmt = (
            select(Issue)
            .where(Issue.id == id)
            .options(
                selectinload(Issue.assignee),
                selectinload(Issue.reporter),
                selectinload(Issue.acceptance_criteria),
                selectinload(Issue.comments).selectinload(IssueComment.author)
            )
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def get_for_update(self, issue_id: uuid.UUID) -> Optional[Issue]:
        stmt = (
            select(Issue)
            .where(Issue.id == issue_id)
            .options(
                selectinload(Issue.assignee),
                selectinload(Issue.reporter),
                selectinload(Issue.acceptance_criteria),
                selectinload(Issue.comments).selectinload(IssueComment.author)
            )
            .with_for_update()
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def get_scoped(self, issue_id: uuid.UUID, project_id: uuid.UUID) -> Optional[Issue]:
        stmt = (
            select(Issue)
            .where(Issue.id == issue_id, Issue.project_id == project_id)
            .options(
                selectinload(Issue.assignee),
                selectinload(Issue.reporter),
                selectinload(Issue.acceptance_criteria),
                selectinload(Issue.comments).selectinload(IssueComment.author)
            )
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def get_child_issues(self, parent_issue_id: uuid.UUID) -> List[Issue]:
        stmt = select(Issue).where(Issue.parent_issue_id == parent_issue_id)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def get_linked_tasks(self, story_id: uuid.UUID) -> List[Issue]:
        stmt = select(Issue).where(
            Issue.parent_issue_id == story_id,
            Issue.issue_type == IssueType.TASK
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def get_acceptance_criteria(self, story_id: uuid.UUID) -> List[AcceptanceCriteria]:
        stmt = select(AcceptanceCriteria).where(AcceptanceCriteria.story_id == story_id).order_by(AcceptanceCriteria.position)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def search_and_filter(
        self,
        project_id: uuid.UUID,
        q: Optional[str] = None,
        status: Optional[IssueStatus] = None,
        issue_type: Optional[IssueType] = None,
        priority: Optional[IssuePriority] = None,
        assignee_id: Optional[uuid.UUID] = None,
        sprint_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Issue], int]:
        query = select(Issue).where(Issue.project_id == project_id)

        if sprint_id:
            query = query.join(SprintIssueAssignment, Issue.id == SprintIssueAssignment.issue_id).where(
                SprintIssueAssignment.sprint_id == sprint_id,
                SprintIssueAssignment.is_active == True
            )

        if status:
            query = query.where(Issue.status == status)
        if issue_type:
            query = query.where(Issue.issue_type == issue_type)
        if priority:
            query = query.where(Issue.priority == priority)
        if assignee_id:
            query = query.where(Issue.assignee_id == assignee_id)
        if q:
            search_pattern = f"%{q}%"
            query = query.where(
                or_(
                    Issue.title.ilike(search_pattern),
                    Issue.description.ilike(search_pattern)
                )
            )

        # Count total
        count_stmt = select(func.count()).select_from(query.subquery())
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one()

        # Fetch paginated with selectinload
        query = (
            query
            .options(
                selectinload(Issue.assignee),
                selectinload(Issue.reporter),
                selectinload(Issue.acceptance_criteria),
                selectinload(Issue.comments).selectinload(IssueComment.author)
            )
            .order_by(Issue.position, Issue.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        res = await self.session.execute(query)
        issues = list(res.scalars().all())

        return issues, total
