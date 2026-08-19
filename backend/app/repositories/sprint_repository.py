import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.sprint import Sprint, SprintIssueAssignment, SprintStatus
from app.repositories.base import BaseRepository


class SprintRepository(BaseRepository[Sprint]):
    def __init__(self, session: AsyncSession):
        super().__init__(Sprint, session)

    async def list_by_project(self, project_id: uuid.UUID) -> List[Sprint]:
        stmt = select(Sprint).where(Sprint.project_id == project_id).order_by(Sprint.created_at.desc())
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def get_active_sprint(self, project_id: uuid.UUID) -> Optional[Sprint]:
        stmt = select(Sprint).where(Sprint.project_id == project_id, Sprint.status == SprintStatus.ACTIVE)
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def assign_issue_to_sprint(self, sprint_id: uuid.UUID, issue_id: uuid.UUID, user_id: uuid.UUID) -> SprintIssueAssignment:
        # Deactivate any active assignment for this issue
        await self.session.execute(
            update(SprintIssueAssignment)
            .where(SprintIssueAssignment.issue_id == issue_id, SprintIssueAssignment.is_active == True)
            .values(is_active=False, removed_at=datetime.now(timezone.utc))
        )
        assignment = SprintIssueAssignment(
            sprint_id=sprint_id,
            issue_id=issue_id,
            is_active=True,
            added_by_id=user_id
        )
        self.session.add(assignment)
        await self.session.flush()
        return assignment

    async def get_active_assignment(self, issue_id: uuid.UUID) -> Optional[SprintIssueAssignment]:
        stmt = select(SprintIssueAssignment).where(
            SprintIssueAssignment.issue_id == issue_id,
            SprintIssueAssignment.is_active == True
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def get_sprint_issue_ids(self, sprint_id: uuid.UUID) -> List[uuid.UUID]:
        stmt = select(SprintIssueAssignment.issue_id).where(
            SprintIssueAssignment.sprint_id == sprint_id,
            SprintIssueAssignment.is_active == True
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def unassign_issue_from_sprint(self, issue_id: uuid.UUID) -> None:
        await self.session.execute(
            update(SprintIssueAssignment)
            .where(SprintIssueAssignment.issue_id == issue_id, SprintIssueAssignment.is_active == True)
            .values(is_active=False, removed_at=datetime.now(timezone.utc))
        )
