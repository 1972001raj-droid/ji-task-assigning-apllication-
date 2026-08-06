import uuid
from typing import Optional, List
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get(self, id: uuid.UUID) -> Optional[User]:
        stmt = select(User).where(User.id == id).options(selectinload(User.project_memberships))
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email.lower().strip()).options(selectinload(User.project_memberships))
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def get_by_username(self, username: str) -> Optional[User]:
        stmt = select(User).where(User.username == username.strip()).options(selectinload(User.project_memberships))
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def get_by_email_or_username(self, identifier: str) -> Optional[User]:
        stmt = select(User).where(
            or_(
                User.email == identifier.lower().strip(),
                User.username == identifier.strip()
            )
        ).options(selectinload(User.project_memberships))
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        stmt = select(User).options(selectinload(User.project_memberships)).offset(skip).limit(limit)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
