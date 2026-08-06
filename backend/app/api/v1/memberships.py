import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.db.models.project import ProjectMembership
from app.core.permissions import SystemRole, Permission
from app.schemas.project import ProjectMembershipCreate, ProjectMembershipResponse
from app.api.dependencies import get_current_user, ProjectPermissionGuard

router = APIRouter(prefix="/memberships", tags=["Memberships"])


@router.post("", response_model=ProjectMembershipResponse, status_code=status.HTTP_201_CREATED)
async def add_project_member(
    project_id: uuid.UUID,
    data: ProjectMembershipCreate,
    guard: tuple[User, SystemRole] = Depends(ProjectPermissionGuard(Permission.PROJECT_MANAGE)),
    session: AsyncSession = Depends(get_async_session)
):
    membership = ProjectMembership(
        project_id=project_id,
        user_id=data.user_id,
        role=data.role
    )
    session.add(membership)
    await session.commit()
    return membership
