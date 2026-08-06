import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.notification import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, session: AsyncSession):
        super().__init__(Notification, session)

    async def create_notification(
        self,
        user_id: uuid.UUID,
        event_type: str,
        title: str,
        message: str,
        payload: Optional[Dict[str, Any]] = None
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            event_type=event_type,
            title=title,
            message=message,
            payload=payload,
            is_read=False
        )
        self.session.add(notif)
        await self.session.flush()
        return notif

    async def list_by_user(self, user_id: uuid.UUID, unread_only: bool = False, limit: int = 50) -> List[Notification]:
        stmt = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Notification.is_read == False)
        stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def mark_as_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        stmt = update(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).values(is_read=True)
        res = await self.session.execute(stmt)
        return res.rowcount > 0
