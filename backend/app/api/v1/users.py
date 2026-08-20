import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User, UserStatus
from app.db.models.organization import OrganizationMembership
from app.db.models.project import ProjectMembership
from app.db.models.session import AuthSession
from app.db.models.issue import Issue
from app.core.permissions import SystemRole
from app.core.security import hash_password
from app.core.exceptions import PermissionDeniedException, NotFoundException, AppException, ValidationException
from app.schemas.auth import UserResponse, UserPreferenceUpdate, SessionResponse
from app.schemas.user_management import (
    UserProvisionRequest, UserInviteRequest, UserStatusUpdateRequest, UserUpdatePayload
)
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.api.dependencies import get_current_user

router = APIRouter(prefix="", tags=["Users"])


async def _resolve_user_roles(user: User, session: AsyncSession) -> List[str]:
    pm_res = await session.execute(select(ProjectMembership.role).where(ProjectMembership.user_id == user.id))
    om_res = await session.execute(select(OrganizationMembership.role).where(OrganizationMembership.user_id == user.id))
    roles = list({str(getattr(r[0], 'value', r[0])).upper() for r in pm_res.fetchall()} | {str(getattr(r[0], 'value', r[0])).upper() for r in om_res.fetchall()})
    if user.is_superuser and "ADMIN" not in roles:
        roles.append("ADMIN")
    return roles


def _user_to_response(u: User, roles: List[str]) -> UserResponse:
    resp = UserResponse.model_validate(u)
    resp.roles = roles
    if hasattr(u, 'status') and u.status:
        resp.status = u.status.value if hasattr(u.status, 'value') else str(u.status)
    else:
        resp.status = "ACTIVE"
    if u.is_superuser or "ADMIN" in roles:
        resp.dashboard_route = "/dashboard/admin"
    elif "MANAGER" in roles:
        resp.dashboard_route = "/dashboard/manager"
    else:
        resp.dashboard_route = "/dashboard/developer"
    return resp


# ── Static routes (Must precede parameterized /users/{user_id}) ──

@router.post("/users/provision", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def provision_user(
    data: UserProvisionRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    current_roles = await _resolve_user_roles(current_user, session)
    is_admin = current_user.is_superuser or "ADMIN" in current_roles
    is_manager = "MANAGER" in current_roles

    if not is_admin and not is_manager:
        raise PermissionDeniedException("Developers/Testers cannot create user accounts.")

    # Role restriction enforcement
    if is_manager and not is_admin:
        if data.role not in (SystemRole.DEVELOPER, SystemRole.TESTER, SystemRole.DEVELOPER_TESTER):
            raise PermissionDeniedException("Managers can only create Developer or Tester accounts.")

    if is_admin:
        if data.role not in (SystemRole.MANAGER, SystemRole.DEVELOPER, SystemRole.TESTER, SystemRole.DEVELOPER_TESTER):
            raise PermissionDeniedException("Admins can provision Manager, Developer, or Tester accounts.")

    # Check for duplicate username or email
    stmt = select(User).where((User.username == data.username) | (User.email == data.email.lower().strip()))
    existing = (await session.execute(stmt)).scalars().first()
    if existing:
        raise AppException("Username or email is already registered.", status_code=status.HTTP_409_CONFLICT)

    # Create User
    new_user = User(
        username=data.username.strip(),
        email=data.email.lower().strip(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name.strip() if data.full_name else None,
        is_active=True,
        is_superuser=False,
        status=UserStatus.ACTIVE,
        created_by_user_id=current_user.id
    )
    session.add(new_user)
    await session.flush()

    # Create Organization Membership
    org_membership = OrganizationMembership(
        org_id=data.org_id,
        user_id=new_user.id,
        role=data.role
    )
    session.add(org_membership)

    # Create Project Membership if project_id is provided
    if data.project_id:
        proj_membership = ProjectMembership(
            project_id=data.project_id,
            user_id=new_user.id,
            role=data.role
        )
        session.add(proj_membership)

    await session.commit()
    return _user_to_response(new_user, [data.role.value])


@router.post("/users/invitations", status_code=status.HTTP_201_CREATED)
async def invite_user(
    data: UserInviteRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    current_roles = await _resolve_user_roles(current_user, session)
    is_admin = current_user.is_superuser or "ADMIN" in current_roles
    is_manager = "MANAGER" in current_roles

    if not is_admin and not is_manager:
        raise PermissionDeniedException("Developers/Testers cannot invite users.")

    if is_manager and not is_admin:
        if data.role not in (SystemRole.DEVELOPER, SystemRole.TESTER, SystemRole.DEVELOPER_TESTER):
            raise PermissionDeniedException("Managers can only invite Developer or Tester accounts.")

    email_clean = data.email.lower().strip()
    stmt = select(User).where(User.email == email_clean)
    existing = (await session.execute(stmt)).scalars().first()
    if existing:
        raise AppException("A user with this email address already exists.", status_code=status.HTTP_409_CONFLICT)

    temp_username = email_clean.split("@")[0][:40] + "_" + uuid.uuid4().hex[:6]

    new_user = User(
        username=temp_username,
        email=email_clean,
        hashed_password=hash_password(uuid.uuid4().hex + uuid.uuid4().hex),
        full_name=data.full_name.strip() if data.full_name else None,
        is_active=True,
        is_superuser=False,
        status=UserStatus.INVITED,
        created_by_user_id=current_user.id
    )
    session.add(new_user)
    await session.flush()

    org_membership = OrganizationMembership(
        org_id=data.org_id,
        user_id=new_user.id,
        role=data.role
    )
    session.add(org_membership)

    if data.project_id:
        proj_membership = ProjectMembership(
            project_id=data.project_id,
            user_id=new_user.id,
            role=data.role
        )
        session.add(proj_membership)

    auth_service = AuthService(session)
    invite_token = await auth_service.create_invitation_token(new_user.id)

    return {
        "message": "Invitation created successfully.",
        "user_id": str(new_user.id),
        "email": new_user.email,
        "invitation_token": invite_token
    }


@router.get("/users/assignable", response_model=List[UserResponse])
async def get_assignable_users(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    project_repo = ProjectRepository(session)
    membership = await project_repo.get_membership(project_id, user.id)
    if not membership and not user.is_superuser:
        raise NotFoundException("Project", project_id)

    stmt = select(User).join(ProjectMembership).where(
        ProjectMembership.project_id == project_id,
        ProjectMembership.role.in_([SystemRole.DEVELOPER, SystemRole.TESTER, SystemRole.DEVELOPER_TESTER]),
        User.is_active == True
    )
    res = await session.execute(stmt)
    assignable_users = list(res.scalars().all())
    return [_user_to_response(u, [SystemRole.DEVELOPER.value]) for u in assignable_users]


@router.get("/users/team", response_model=List[UserResponse])
async def get_team(
    project_id: Optional[uuid.UUID] = None,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    current_roles = await _resolve_user_roles(user, session)
    is_admin = user.is_superuser or "ADMIN" in current_roles
    is_manager = "MANAGER" in current_roles

    if not is_admin and not is_manager:
        stmt = select(User).where(User.id == user.id)
        res = await session.execute(stmt)
        return [_user_to_response(u, current_roles) for u in list(res.scalars().all())]

    if is_admin:
        stmt = select(User).join(OrganizationMembership)
        if project_id:
            stmt = stmt.join(ProjectMembership, ProjectMembership.user_id == User.id).where(
                ProjectMembership.project_id == project_id
            )
        res = await session.execute(stmt)
        users = list(res.scalars().all())
    else:
        if not project_id:
            user_projects = await ProjectRepository(session).list_user_projects(user.id)
            if not user_projects:
                return []
            project_id = user_projects[0].id

        stmt = select(User).join(ProjectMembership).where(
            ProjectMembership.project_id == project_id,
            ProjectMembership.role.in_([SystemRole.DEVELOPER, SystemRole.TESTER, SystemRole.DEVELOPER_TESTER])
        )
        res = await session.execute(stmt)
        users = list(res.scalars().all())

    result = []
    for u in users:
        u_roles = await _resolve_user_roles(u, session)
        result.append(_user_to_response(u, u_roles))
    return result


@router.get("/me")
@router.get("/users/me")
async def get_me(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    project_repo = ProjectRepository(session)
    roles = await _resolve_user_roles(user, session)
    is_privileged = user.is_superuser or "ADMIN" in roles or "MANAGER" in roles

    if is_privileged:
        user_projects = await project_repo.list_all_projects()
    else:
        user_projects = await project_repo.list_user_projects(user.id)

    if user.is_superuser or "ADMIN" in roles:
        dashboard_route = "/dashboard/admin"
    elif "MANAGER" in roles:
        dashboard_route = "/dashboard/manager"
    else:
        dashboard_route = "/dashboard/developer"

    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "status": user.status.value if hasattr(user.status, 'value') else str(user.status),
        "must_change_password": user.must_change_password,
        "dark_mode_enabled": user.dark_mode_enabled,
        "roles": roles,
        "dashboard_route": dashboard_route,
        "projects": [
            {"id": str(p.id), "name": p.name, "key": p.key} for p in user_projects
        ]
    }


@router.patch("/me/preferences")
@router.patch("/users/me/preferences")
async def update_preferences(
    data: UserPreferenceUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    if data.dark_mode_enabled is not None:
        user.dark_mode_enabled = data.dark_mode_enabled
    if data.full_name is not None:
        user.full_name = data.full_name

    session.add(user)
    await session.commit()
    return {"message": "Preferences updated successfully", "dark_mode_enabled": user.dark_mode_enabled}


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    current_roles = await _resolve_user_roles(user, session)
    is_admin = user.is_superuser or "ADMIN" in current_roles
    is_manager = "MANAGER" in current_roles

    repo = UserRepository(session)

    if is_admin:
        users = await repo.list_all(skip=0, limit=200)
    elif is_manager:
        user_projects = await ProjectRepository(session).list_user_projects(user.id)
        proj_ids = [p.id for p in user_projects]
        stmt = select(User).join(ProjectMembership).where(
            ProjectMembership.project_id.in_(proj_ids),
            ProjectMembership.role.in_([SystemRole.DEVELOPER, SystemRole.TESTER, SystemRole.DEVELOPER_TESTER])
        ).distinct()
        res = await session.execute(stmt)
        users = list(res.scalars().all())
        if user not in users:
            users.append(user)
    else:
        users = [user]

    result = []
    for u in users:
        u_roles = await _resolve_user_roles(u, session)
        result.append(_user_to_response(u, u_roles))
    return result


# ── Parameterized routes (/users/{user_id}...) ──

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    current_roles = await _resolve_user_roles(user, session)
    is_admin = user.is_superuser or "ADMIN" in current_roles
    if not is_admin and user.id != user_id:
        raise PermissionDeniedException("You are not authorized to view this user.")

    target = await UserRepository(session).get(user_id)
    if not target:
        raise NotFoundException("User", user_id)

    u_roles = await _resolve_user_roles(target, session)
    return _user_to_response(target, u_roles)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdatePayload,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    current_roles = await _resolve_user_roles(current_user, session)
    is_admin = current_user.is_superuser or "ADMIN" in current_roles
    is_self = current_user.id == user_id

    if not is_admin and not is_self:
        raise PermissionDeniedException("You are not authorized to edit this user.")

    target = await UserRepository(session).get(user_id)
    if not target:
        raise NotFoundException("User", user_id)

    if data.full_name is not None:
        target.full_name = data.full_name.strip()
    if data.email is not None and is_admin:
        target.email = data.email.lower().strip()

    await session.commit()
    u_roles = await _resolve_user_roles(target, session)
    return _user_to_response(target, u_roles)


@router.patch("/users/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: uuid.UUID,
    data: UserStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    current_roles = await _resolve_user_roles(current_user, session)
    is_admin = current_user.is_superuser or "ADMIN" in current_roles

    if not is_admin:
        raise PermissionDeniedException("Only Administrators can update account status.")

    target = await UserRepository(session).get(user_id)
    if not target:
        raise NotFoundException("User", user_id)

    target_roles = await _resolve_user_roles(target, session)
    if (target.is_superuser or "ADMIN" in target_roles) and data.status in (UserStatus.DEACTIVATED, UserStatus.SUSPENDED):
        admin_count_stmt = select(func.count(User.id)).where(
            User.is_superuser == True,
            User.status == UserStatus.ACTIVE,
            User.id != user_id
        )
        other_admins = (await session.execute(admin_count_stmt)).scalar() or 0
        if other_admins == 0:
            raise ValidationException("Cannot deactivate or suspend the final active Administrator account.")

    target.status = data.status
    if data.status == UserStatus.DEACTIVATED:
        target.is_active = False
        target.deactivated_at = datetime.now(timezone.utc)
        target.deactivated_by_user_id = current_user.id

        if data.reassign_to_user_id:
            await session.execute(
                update(Issue).where(
                    Issue.assignee_id == user_id,
                    Issue.status != 'done'
                ).values(assignee_id=data.reassign_to_user_id)
            )
        else:
            await session.execute(
                update(Issue).where(
                    Issue.assignee_id == user_id,
                    Issue.status != 'done'
                ).values(assignee_id=None)
            )

        await AuthService(session).revoke_all_user_sessions(user_id)
    elif data.status == UserStatus.ACTIVE:
        target.is_active = True
        target.deactivated_at = None
        target.deactivated_by_user_id = None
    elif data.status == UserStatus.SUSPENDED:
        target.is_active = False
        await AuthService(session).revoke_all_user_sessions(user_id)

    await session.commit()
    u_roles = await _resolve_user_roles(target, session)
    return _user_to_response(target, u_roles)


@router.post("/users/{user_id}/resend-invitation")
async def resend_invitation(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    current_roles = await _resolve_user_roles(current_user, session)
    if not (current_user.is_superuser or "ADMIN" in current_roles or "MANAGER" in current_roles):
        raise PermissionDeniedException("Not authorized to resend invitations.")

    target = await UserRepository(session).get(user_id)
    if not target:
        raise NotFoundException("User", user_id)

    auth_service = AuthService(session)
    invite_token = await auth_service.create_invitation_token(target.id)
    return {
        "message": "Invitation token regenerated successfully.",
        "email": target.email,
        "invitation_token": invite_token
    }


@router.post("/users/{user_id}/reset-password")
async def admin_reset_password(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    current_roles = await _resolve_user_roles(current_user, session)
    if not (current_user.is_superuser or "ADMIN" in current_roles or "MANAGER" in current_roles):
        raise PermissionDeniedException("Not authorized to generate reset tokens.")

    target = await UserRepository(session).get(user_id)
    if not target:
        raise NotFoundException("User", user_id)

    auth_service = AuthService(session)
    raw_token = await auth_service.create_password_reset_token(target.email)
    return {
        "message": "Password reset token generated.",
        "email": target.email,
        "reset_token": raw_token
    }


@router.get("/users/{user_id}/sessions", response_model=List[SessionResponse])
async def list_user_sessions(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    current_roles = await _resolve_user_roles(current_user, session)
    if not (current_user.is_superuser or "ADMIN" in current_roles) and current_user.id != user_id:
        raise PermissionDeniedException("Not authorized to view sessions.")

    auth_service = AuthService(session)
    sessions = await auth_service.list_user_sessions(user_id, uuid.uuid4())
    return [SessionResponse.model_validate(s[0]) for s in sessions]


@router.delete("/users/{user_id}/sessions/{session_id}")
async def revoke_user_session(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    current_roles = await _resolve_user_roles(current_user, session)
    if not (current_user.is_superuser or "ADMIN" in current_roles) and current_user.id != user_id:
        raise PermissionDeniedException("Not authorized to revoke this session.")

    auth_service = AuthService(session)
    await auth_service.revoke_session(session_id, user_id)
    return {"message": "Session revoked successfully."}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    current_roles = await _resolve_user_roles(current_user, session)
    if not (current_user.is_superuser or "ADMIN" in current_roles):
        raise PermissionDeniedException("Only Administrators can delete accounts.")

    target = await UserRepository(session).get(user_id)
    if not target:
        raise NotFoundException("User", user_id)

    target_roles = await _resolve_user_roles(target, session)
    if target.is_superuser or "ADMIN" in target_roles:
        admin_count_stmt = select(func.count(User.id)).where(
            User.is_superuser == True,
            User.id != user_id
        )
        other_admins = (await session.execute(admin_count_stmt)).scalar() or 0
        if other_admins == 0:
            raise ValidationException("Cannot delete the final active Administrator account.")

    target.status = UserStatus.DEACTIVATED
    target.is_active = False
    target.deactivated_at = datetime.now(timezone.utc)
    target.deactivated_by_user_id = current_user.id

    await AuthService(session).revoke_all_user_sessions(user_id)
    await session.commit()
    return {"message": "User account deactivated and all active sessions revoked."}
