import uuid
from typing import AsyncGenerator, Optional
from fastapi import Request, Depends, Cookie, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import verify_csrf_token
from app.core.permissions import SystemRole, Permission, has_permission
from app.core.exceptions import (
    AuthenticationException,
    PermissionDeniedException,
    NotFoundException,
)
from app.db.session import get_async_session
from app.db.models.user import User
from app.db.models.session import AuthSession
from sqlalchemy import select
from app.db.models.project import ProjectMembership
from app.db.models.organization import OrganizationMembership
from app.repositories.project_repository import ProjectRepository
from app.repositories.organization_repository import OrganizationRepository
from app.services.auth_service import AuthService


async def get_current_user_and_session(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
) -> tuple[User, AuthSession]:
    # Extract token from cookie or Authorization header
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

    if not token:
        raise AuthenticationException("Session cookie or Bearer token missing")

    auth_service = AuthService(session)
    user, auth_session = await auth_service.get_user_from_raw_token(token)

    # CSRF Check for state-changing requests
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        csrf_header = request.headers.get(settings.CSRF_HEADER_NAME)
        if not csrf_header or not verify_csrf_token(csrf_header, auth_session.csrf_token):
            raise PermissionDeniedException("CSRF token validation failed")

    return user, auth_session


async def get_current_user(
    user_and_session: tuple[User, AuthSession] = Depends(get_current_user_and_session)
) -> User:
    return user_and_session[0]


class ProjectPermissionGuard:
    def __init__(self, required_permission: Optional[Permission] = None):
        self.required_permission = required_permission

    async def __call__(
        self,
        project_id: uuid.UUID,
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_async_session)
    ) -> tuple[User, SystemRole]:
        from sqlalchemy import text as sql_text

        # Superusers always pass
        if user.is_superuser:
            return user, SystemRole.ADMIN

        # Check org-level and project-level role via ORM column select (SQLite + PostgreSQL compatible)
        pm_res = await session.execute(
            select(ProjectMembership.role).where(
                ProjectMembership.user_id == user.id,
                ProjectMembership.project_id == project_id
            )
        )
        om_res = await session.execute(
            select(OrganizationMembership.role).where(
                OrganizationMembership.user_id == user.id
            )
        )
        proj_roles = {str(getattr(r[0], 'value', r[0])).upper() for r in pm_res.fetchall()}
        org_roles = {str(getattr(r[0], 'value', r[0])).upper() for r in om_res.fetchall()}
        all_roles = proj_roles | org_roles

        # Managers and Admins have access to all projects
        if "MANAGER" in all_roles or "ADMIN" in all_roles:
            effective_role = SystemRole.ADMIN if "ADMIN" in all_roles else SystemRole.MANAGER
            if self.required_permission:
                if not has_permission(effective_role, self.required_permission):
                    raise PermissionDeniedException(
                        f"Role '{effective_role.value}' lacks required permission '{self.required_permission.value}'"
                    )
            return user, effective_role

        # Fallback: check project-level membership
        project_repo = ProjectRepository(session)
        membership = await project_repo.get_membership(project_id, user.id)

        if not membership:
            raise NotFoundException("Project", project_id)

        role = membership.role

        if self.required_permission:
            if not has_permission(role, self.required_permission):
                raise PermissionDeniedException(
                    f"Role '{role.value}' lacks required permission '{self.required_permission.value}'"
                )

        return user, role

