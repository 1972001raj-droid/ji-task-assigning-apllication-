import uuid
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.activity import ActivityEvent
from app.repositories.base import BaseRepository


class ActivityRepository(BaseRepository[ActivityEvent]):
    def __init__(self, session: AsyncSession):
        super().__init__(ActivityEvent, session)

    async def log_activity(self, issue_id: uuid.UUID, user_id: uuid.UUID, action: str, details: Dict[str, Any]) -> ActivityEvent:
        event = ActivityEvent(
            issue_id=issue_id,
            user_id=user_id,
            action=action,
            details=details
        )
        self.session.add(event)
        await self.session.flush()
        return event

    async def list_by_issue(self, issue_id: uuid.UUID) -> List[ActivityEvent]:
        stmt = select(ActivityEvent).where(ActivityEvent.issue_id == issue_id).order_by(ActivityEvent.created_at.desc())
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
