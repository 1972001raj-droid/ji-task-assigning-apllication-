import abc
import uuid
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.notification_repository import NotificationRepository


class BaseNotificationAdapter(abc.ABC):
    @abc.abstractmethod
    async def send(self, user_id: uuid.UUID, event_type: str, title: str, message: str, payload: Optional[Dict[str, Any]] = None) -> None:
        pass


class InAppNotificationAdapter(BaseNotificationAdapter):
    def __init__(self, session: AsyncSession):
        self.repo = NotificationRepository(session)

    async def send(self, user_id: uuid.UUID, event_type: str, title: str, message: str, payload: Optional[Dict[str, Any]] = None) -> None:
        await self.repo.create_notification(
            user_id=user_id,
            event_type=event_type,
            title=title,
            message=message,
            payload=payload
        )


class ConsoleNotificationAdapter(BaseNotificationAdapter):
    async def send(self, user_id: uuid.UUID, event_type: str, title: str, message: str, payload: Optional[Dict[str, Any]] = None) -> None:
        print(f"[ConsoleNotification] User={user_id} Event={event_type} | {title}: {message}")


class NotificationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = NotificationRepository(session)
        self.adapters: List[BaseNotificationAdapter] = [
            InAppNotificationAdapter(session),
            ConsoleNotificationAdapter()
        ]

    async def dispatch(self, user_id: uuid.UUID, event_type: str, title: str, message: str, payload: Optional[Dict[str, Any]] = None) -> None:
        for adapter in self.adapters:
            try:
                await adapter.send(user_id, event_type, title, message, payload)
            except Exception as e:
                print(f"Error dispatching notification via adapter {adapter.__class__.__name__}: {e}")

    async def get_user_notifications(self, user_id: uuid.UUID, unread_only: bool = False):
        return await self.repo.list_by_user(user_id, unread_only=unread_only)

    async def mark_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        res = await self.repo.mark_as_read(notification_id, user_id)
        await self.session.commit()
        return res
