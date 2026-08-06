import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.audit import AuditLog
from app.repositories.base import BaseRepository


class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(AuditLog, session)

    async def log_audit(
        self,
        action: str,
        resource_type: str,
        user_id: Optional[uuid.UUID] = None,
        org_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> AuditLog:
        entry = AuditLog(
            user_id=user_id,
            org_id=org_id,
            project_id=project_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
            request_id=request_id
        )
        self.session.add(entry)
        await self.session.flush()
        return entry

    async def list_logs(
        self,
        org_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLog]:
        stmt = select(AuditLog)
        if org_id:
            stmt = stmt.where(AuditLog.org_id == org_id)
        if project_id:
            stmt = stmt.where(AuditLog.project_id == project_id)
        stmt = stmt.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
