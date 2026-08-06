import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.session import AuthSession
from app.repositories.base import BaseRepository


class SessionRepository(BaseRepository[AuthSession]):
    def __init__(self, session: AsyncSession):
        super().__init__(AuthSession, session)

    async def get_by_token_hash(self, token_hash: str) -> Optional[AuthSession]:
        stmt = select(AuthSession).where(
            AuthSession.token_hash == token_hash,
            AuthSession.is_revoked == False,
            AuthSession.expires_at > datetime.now(timezone.utc)
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def revoke_session(self, session_id: uuid.UUID) -> bool:
        stmt = update(AuthSession).where(AuthSession.id == session_id).values(is_revoked=True)
        res = await self.session.execute(stmt)
        return res.rowcount > 0

    async def get_user_sessions(self, user_id: uuid.UUID) -> List[AuthSession]:
        stmt = select(AuthSession).where(
            AuthSession.user_id == user_id,
            AuthSession.is_revoked == False,
            AuthSession.expires_at > datetime.now(timezone.utc)
        ).order_by(AuthSession.created_at.desc())
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
