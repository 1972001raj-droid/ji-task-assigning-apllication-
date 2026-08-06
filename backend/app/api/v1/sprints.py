import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.core.permissions import SystemRole, Permission
from app.schemas.sprint import SprintCreate, SprintUpdate, SprintResponse, SprintAddIssueRequest
from app.services.sprint_service import SprintService
from app.api.dependencies import get_current_user, ProjectPermissionGuard

router = APIRouter(prefix="/sprints", tags=["Sprints"])


@router.post("", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
async def create_sprint(
    data: SprintCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    guard = ProjectPermissionGuard(Permission.SPRINT_MANAGE)
    await guard(project_id=data.project_id, user=user, session=session)

    service = SprintService(session)
    return await service.create_sprint(data, creator_id=user.id)


@router.get("", response_model=List[SprintResponse])
async def list_sprints(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    guard = ProjectPermissionGuard()
    await guard(project_id=project_id, user=user, session=session)

    service = SprintService(session)
    return await service.sprint_repo.list_by_project(project_id)


@router.post("/{sprint_id}/issues", response_model=List[uuid.UUID])
async def add_issue_to_sprint(
    sprint_id: uuid.UUID,
    data: SprintAddIssueRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    service = SprintService(session)
    sprint = await service.sprint_repo.get(sprint_id)
    if not sprint:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Sprint", sprint_id)

    guard = ProjectPermissionGuard(Permission.SPRINT_MANAGE)
    await guard(project_id=sprint.project_id, user=user, session=session)

    return await service.add_issue_to_sprint(sprint_id=sprint_id, issue_id=data.issue_id, user_id=user.id)
