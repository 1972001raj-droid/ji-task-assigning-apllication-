import uuid
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.db.models.project import Project, ProjectMembership, ProjectEstimationSettings
from app.db.models.organization import Organization, OrganizationMembership
from app.core.permissions import SystemRole, Permission
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectEstimationSettingsUpdate, ProjectEstimationSettingsResponse
from app.repositories.project_repository import ProjectRepository
from app.repositories.organization_repository import OrganizationRepository
from sqlalchemy import select
from app.core.exceptions import NotFoundException, PermissionDeniedException
from app.api.dependencies import get_current_user, ProjectPermissionGuard

router = APIRouter(prefix="/projects", tags=["Projects"])



async def _resolve_org_id(
    requested_org_id: Optional[uuid.UUID],
    user: User,
    session: AsyncSession,
) -> uuid.UUID:
    """Return the requested org_id, or auto-create a personal org for the user."""
    if requested_org_id:
        return requested_org_id

    org_repo = OrganizationRepository(session)
    existing_orgs = await org_repo.list_user_organizations(user.id)
    if existing_orgs:
        return existing_orgs[0].id

    # Auto-create a personal workspace org for this user
    display_name = user.full_name or user.username or "My"
    base_slug = re.sub(r"[^a-z0-9]+", "-", display_name.lower()).strip("-") or "workspace"
    slug = f"{base_slug}-workspace"

    # Ensure slug uniqueness by appending short uuid suffix if needed
    existing_slug = await org_repo.get_by_slug(slug)
    if existing_slug:
        slug = f"{base_slug}-{str(user.id)[:8]}"

    org = Organization(name=f"{display_name}'s Workspace", slug=slug)
    session.add(org)
    await session.flush()  # Get org.id without committing

    membership = OrganizationMembership(
        org_id=org.id,
        user_id=user.id,
        role=SystemRole.ADMIN,
    )
    session.add(membership)
    await session.flush()
    return org.id


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    pm_res = await session.execute(select(ProjectMembership.role).where(ProjectMembership.user_id == user.id))
    om_res = await session.execute(select(OrganizationMembership.role).where(OrganizationMembership.user_id == user.id))
    all_roles = {str(getattr(r[0], 'value', r[0])).upper() for r in pm_res.fetchall()} | {str(getattr(r[0], 'value', r[0])).upper() for r in om_res.fetchall()}
    is_authorized = user.is_superuser or "ADMIN" in all_roles or "MANAGER" in all_roles

    if not is_authorized:
        raise PermissionDeniedException("Only Managers and Admins can create new projects.")

    org_id = await _resolve_org_id(data.org_id, user, session)


    repo = ProjectRepository(session)
    project = Project(
        org_id=org_id,
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

    pm_res = await session.execute(select(ProjectMembership.role).where(ProjectMembership.user_id == user.id))
    om_res = await session.execute(select(OrganizationMembership.role).where(OrganizationMembership.user_id == user.id))
    all_roles = {str(getattr(r[0], 'value', r[0])).upper() for r in pm_res.fetchall()} | {str(getattr(r[0], 'value', r[0])).upper() for r in om_res.fetchall()}
    is_privileged = user.is_superuser or "ADMIN" in all_roles or "MANAGER" in all_roles

    if is_privileged:
        return await repo.list_all_projects()
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


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    guard: tuple[User, SystemRole] = Depends(ProjectPermissionGuard(Permission.PROJECT_DELETE)),
    session: AsyncSession = Depends(get_async_session)
):
    repo = ProjectRepository(session)
    project = await repo.get(project_id)
    if not project:
        raise NotFoundException("Project", project_id)
    await session.delete(project)
    await session.commit()
    return None

