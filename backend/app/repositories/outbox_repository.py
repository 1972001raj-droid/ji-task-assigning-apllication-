from typing import List, Dict, Any
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.outbox import OutboxEvent
from app.repositories.base import BaseRepository


class OutboxRepository(BaseRepository[OutboxEvent]):
    def __init__(self, session: AsyncSession):
        super().__init__(OutboxEvent, session)

    async def create_event(self, event_type: str, payload: Dict[str, Any]) -> OutboxEvent:
        event = OutboxEvent(
            event_type=event_type,
            payload=payload,
            processed=False
        )
        self.session.add(event)
        await self.session.flush()
        return event

    async def get_unprocessed(self, limit: int = 50) -> List[OutboxEvent]:
        stmt = select(OutboxEvent).where(OutboxEvent.processed == False).order_by(OutboxEvent.created_at).limit(limit)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def mark_processed(self, event_id: str) -> None:
        stmt = update(OutboxEvent).where(OutboxEvent.id == event_id).values(processed=True)
        await self.session.execute(stmt)
