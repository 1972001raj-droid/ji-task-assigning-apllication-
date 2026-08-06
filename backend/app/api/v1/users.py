from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.schemas.auth import UserResponse, UserPreferenceUpdate
from app.repositories.project_repository import ProjectRepository
from app.api.dependencies import get_current_user

router = APIRouter(prefix="", tags=["Users"])


@router.get("/me")
async def get_me(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    project_repo = ProjectRepository(session)
    user_projects = await project_repo.list_user_projects(user.id)

    roles = [m.role.value for m in user.project_memberships] if user.project_memberships else []

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
