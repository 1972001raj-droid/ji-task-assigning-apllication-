"""Admin user-management API (FR-02: admin provisions users, no public self-registration)."""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field

from app.db.session import get_async_session
from app.db.models.user import User
from app.core.security import hash_password
from app.core.permissions import Permission
from app.core.exceptions import NotFoundException, ValidationException
from app.schemas.auth import UserResponse, UserCreate
from app.repositories.user_repository import UserRepository
from app.api.dependencies import get_current_user, ProjectPermissionGuard

router = APIRouter(prefix="/admin", tags=["Admin"])


class UserUpdateAdmin(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8, description="New password — will be hashed")


def _require_admin(user: User = Depends(get_current_user)) -> User:
    """Endpoint-level guard: only superusers may call admin endpoints."""
    if not user.is_superuser:
        from app.core.exceptions import PermissionDeniedException
        raise PermissionDeniedException("Admin access required")
    return user


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(_require_admin),
    session: AsyncSession = Depends(get_async_session),
):
    """List all users in the system (admin only)."""
    repo = UserRepository(session)
    users = await repo.list_all(skip=skip, limit=limit)
    return [UserResponse.model_validate(u) for u in users]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    admin: User = Depends(_require_admin),
    session: AsyncSession = Depends(get_async_session),
):
    """Provision a new user (admin only — no public self-registration)."""
    repo = UserRepository(session)

    if await repo.get_by_email(data.email):
        raise ValidationException(f"A user with email '{data.email}' already exists.")
    if await repo.get_by_username(data.username):
        raise ValidationException(f"A user with username '{data.username}' already exists.")

    user = User(
        username=data.username,
        email=data.email.lower().strip(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        is_superuser=data.is_superuser,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    admin: User = Depends(_require_admin),
    session: AsyncSession = Depends(get_async_session),
):
    """Get a specific user by ID (admin only)."""
    repo = UserRepository(session)
    user = await repo.get(user_id)
    if not user:
        raise NotFoundException("User", user_id)
    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdateAdmin,
    admin: User = Depends(_require_admin),
    session: AsyncSession = Depends(get_async_session),
):
    """Update user attributes (admin only). Can activate/deactivate or reset password."""
    repo = UserRepository(session)
    user = await repo.get(user_id)
    if not user:
        raise NotFoundException("User", user_id)

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.is_superuser is not None:
        user.is_superuser = data.is_superuser
    if data.password is not None:
        user.hashed_password = hash_password(data.password)

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: uuid.UUID,
    admin: User = Depends(_require_admin),
    session: AsyncSession = Depends(get_async_session),
):
    """Deactivate (soft-delete) a user by setting is_active=False (admin only).
    
    We prefer deactivation over hard deletion to preserve referential integrity
    (audit logs, activity, issue reporter/assignee fields all reference user IDs).
    """
    repo = UserRepository(session)
    user = await repo.get(user_id)
    if not user:
        raise NotFoundException("User", user_id)

    user.is_active = False
    session.add(user)
    await session.commit()
