import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.schemas.sprint import BoardResponse
from app.services.sprint_service import SprintService
from app.api.dependencies import get_current_user, ProjectPermissionGuard

router = APIRouter(prefix="/boards", tags=["Boards"])


@router.get("", response_model=BoardResponse)
async def get_board(
    project_id: uuid.UUID,
    sprint_id: Optional[uuid.UUID] = Query(None),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    guard = ProjectPermissionGuard()
    await guard(project_id=project_id, user=user, session=session)

    service = SprintService(session)
    return await service.get_board(project_id=project_id, sprint_id=sprint_id)
