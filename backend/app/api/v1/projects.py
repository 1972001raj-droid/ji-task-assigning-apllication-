import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.db.models.project import Project, ProjectMembership, ProjectEstimationSettings
from app.core.permissions import SystemRole, Permission
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectEstimationSettingsUpdate, ProjectEstimationSettingsResponse
from app.repositories.project_repository import ProjectRepository
from app.api.dependencies import get_current_user, ProjectPermissionGuard

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    repo = ProjectRepository(session)
    project = Project(
        org_id=data.org_id,
        name=data.name,
        key=data.key.upper(),
        description=data.description
    )
    await repo.create(project)

    # Automatically add creator as ADMIN project member
    membership = ProjectMembership(
        project_id=project.id,
        user_id=user.id,
        role=SystemRole.ADMIN
    )
    session.add(membership)

    # Add default estimation settings
    est = ProjectEstimationSettings(project_id=project.id)
    session.add(est)

    await session.commit()
    return project


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    repo = ProjectRepository(session)
    return await repo.list_user_projects(user.id)


@router.get("/{project_id}/estimation-settings", response_model=ProjectEstimationSettingsResponse)
async def get_estimation_settings(
    project_id: uuid.UUID,
    guard: tuple[User, SystemRole] = Depends(ProjectPermissionGuard()),
    session: AsyncSession = Depends(get_async_session)
):
    repo = ProjectRepository(session)
    settings = await repo.get_estimation_settings(project_id)
    if not settings:
        settings = ProjectEstimationSettings(project_id=project_id)
        session.add(settings)
        await session.commit()
    return settings


@router.put("/{project_id}/estimation-settings", response_model=ProjectEstimationSettingsResponse)
async def update_estimation_settings(
    project_id: uuid.UUID,
    data: ProjectEstimationSettingsUpdate,
    guard: tuple[User, SystemRole] = Depends(ProjectPermissionGuard(Permission.PROJECT_MANAGE)),
    session: AsyncSession = Depends(get_async_session)
):
    repo = ProjectRepository(session)
    settings = await repo.get_estimation_settings(project_id)
    if not settings:
        settings = ProjectEstimationSettings(project_id=project_id)
        session.add(settings)

    settings.scheme = data.scheme
    settings.allowed_values = data.allowed_values
    await session.commit()
    return settings
