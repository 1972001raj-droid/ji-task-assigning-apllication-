import uuid
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.organization import Organization, OrganizationMembership
from app.repositories.base import BaseRepository


class OrganizationRepository(BaseRepository[Organization]):
    def __init__(self, session: AsyncSession):
        super().__init__(Organization, session)

    async def get_by_slug(self, slug: str) -> Optional[Organization]:
        stmt = select(Organization).where(Organization.slug == slug)
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def get_membership(self, org_id: uuid.UUID, user_id: uuid.UUID) -> Optional[OrganizationMembership]:
        stmt = select(OrganizationMembership).where(
            OrganizationMembership.org_id == org_id,
            OrganizationMembership.user_id == user_id
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def list_user_organizations(self, user_id: uuid.UUID) -> List[Organization]:
        stmt = select(Organization).join(OrganizationMembership).where(OrganizationMembership.user_id == user_id)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
