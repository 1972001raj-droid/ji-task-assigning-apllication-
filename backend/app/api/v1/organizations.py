import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.db.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationResponse
from app.repositories.organization_repository import OrganizationRepository
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    data: OrganizationCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    repo = OrganizationRepository(session)
    org = Organization(name=data.name, slug=data.slug)
    await repo.create(org)
    await session.commit()
    return org


@router.get("", response_model=List[OrganizationResponse])
async def list_user_organizations(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    repo = OrganizationRepository(session)
    return await repo.list_user_organizations(user.id)
