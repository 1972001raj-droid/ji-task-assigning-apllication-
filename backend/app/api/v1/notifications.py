import uuid
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.schemas.notification import NotificationResponse
from app.services.notification_service import NotificationService
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = Query(False),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    service = NotificationService(session)
    return await service.get_user_notifications(user_id=user.id, unread_only=unread_only)


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    service = NotificationService(session)
    success = await service.mark_read(notification_id, user.id)
    return {"success": success}
