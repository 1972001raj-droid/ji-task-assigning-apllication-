import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.db.models.organization import OrganizationMembership
from app.db.models.project import ProjectMembership
from app.core.permissions import SystemRole
from app.core.security import hash_password
from app.core.exceptions import PermissionDeniedException, NotFoundException, AppException
from app.schemas.auth import UserResponse, UserPreferenceUpdate
from app.schemas.user_management import UserProvisionRequest
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository
from app.api.dependencies import get_current_user

router = APIRouter(prefix="", tags=["Users"])


@router.post("/users/provision", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def provision_user(
    data: UserProvisionRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    pm_res = await session.execute(select(ProjectMembership.role).where(ProjectMembership.user_id == current_user.id))
    om_res = await session.execute(select(OrganizationMembership.role).where(OrganizationMembership.user_id == current_user.id))
    all_role_strs = {str(getattr(r[0], 'value', r[0])).upper() for r in pm_res.fetchall()} | {str(getattr(r[0], 'value', r[0])).upper() for r in om_res.fetchall()}
    is_admin = current_user.is_superuser or "ADMIN" in all_role_strs
    is_manager = "MANAGER" in all_role_strs

    if not is_admin and not is_manager:
        raise PermissionDeniedException("Developers/Testers cannot create user accounts.")

    # Role restriction enforcement
    if is_manager and not is_admin:
        if data.role not in (SystemRole.DEVELOPER, SystemRole.TESTER, SystemRole.DEVELOPER_TESTER):
            raise PermissionDeniedException("Managers can only create Developer or Tester accounts.")
        # project_id is optional — if not provided, user gets org-wide membership only

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
        is_superuser=False
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
    return UserResponse.model_validate(new_user)


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

    # Return active users who have DEVELOPER, TESTER, or DEVELOPER_TESTER role in this project
    stmt = select(User).join(ProjectMembership).where(
        ProjectMembership.project_id == project_id,
        ProjectMembership.role.in_([SystemRole.DEVELOPER, SystemRole.TESTER, SystemRole.DEVELOPER_TESTER]),
        User.is_active == True
    )
    res = await session.execute(stmt)
    assignable_users = list(res.scalars().all())
    return [UserResponse.model_validate(u) for u in assignable_users]


@router.get("/users/provisioned", response_model=List[UserResponse])
async def get_provisioned_users(
    org_id: Optional[uuid.UUID] = None,
    project_id: Optional[uuid.UUID] = None,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    pm_res = await session.execute(select(ProjectMembership.role).where(ProjectMembership.user_id == user.id))
    om_res = await session.execute(select(OrganizationMembership.role).where(OrganizationMembership.user_id == user.id))
    all_role_strs = {str(getattr(r[0], 'value', r[0])).upper() for r in pm_res.fetchall()} | {str(getattr(r[0], 'value', r[0])).upper() for r in om_res.fetchall()}
    is_admin = user.is_superuser or "ADMIN" in all_role_strs

    if is_admin:
        # Admin sees Managers (and Dev/Testers) in the organization
        stmt = select(User).join(OrganizationMembership)
        if org_id:
            stmt = stmt.where(OrganizationMembership.org_id == org_id)
        res = await session.execute(stmt)
        return [UserResponse.model_validate(u) for u in list(res.scalars().all())]
    else:
        # Manager sees Developer/Testers in their active project
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
        return [UserResponse.model_validate(u) for u in list(res.scalars().all())]



@router.get("/users", response_model=List[UserResponse])
async def list_users(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    repo = UserRepository(session)
    users = await repo.list_all(skip=0, limit=200)

    result = []
    for u in users:
        pm_res = await session.execute(select(ProjectMembership.role).where(ProjectMembership.user_id == u.id))
        om_res = await session.execute(select(OrganizationMembership.role).where(OrganizationMembership.user_id == u.id))
        u_roles = list({str(getattr(r[0], 'value', r[0])).upper() for r in pm_res.fetchall()} | {str(getattr(r[0], 'value', r[0])).upper() for r in om_res.fetchall()})
        if u.is_superuser and "ADMIN" not in u_roles:
            u_roles.append("ADMIN")
        
        resp = UserResponse.model_validate(u)
        resp.roles = u_roles
        result.append(resp)
    return result


@router.get("/me")
@router.get("/users/me")
async def get_me(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    project_repo = ProjectRepository(session)

    proj_roles_res = await session.execute(select(ProjectMembership.role).where(ProjectMembership.user_id == user.id))
    proj_roles = [str(getattr(row[0], 'value', row[0])).upper() for row in proj_roles_res.fetchall()]

    org_roles_res = await session.execute(select(OrganizationMembership.role).where(OrganizationMembership.user_id == user.id))
    org_roles = [str(getattr(row[0], 'value', row[0])).upper() for row in org_roles_res.fetchall()]

    roles = list(set(proj_roles + org_roles))

    # Superuser is always treated as ADMIN
    if user.is_superuser and "ADMIN" not in roles:
        roles.append("ADMIN")

    is_privileged = user.is_superuser or "ADMIN" in roles or "MANAGER" in roles

    # Admins and Managers see ALL projects; Developers only see their assigned projects
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


