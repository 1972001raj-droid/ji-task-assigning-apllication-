import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.audit_repository import AuditRepository
from app.db.models.audit import AuditLog


class AuditService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = AuditRepository(session)

    async def log_event(
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
        log_entry = await self.repo.log_audit(
            action=action,
            resource_type=resource_type,
            user_id=user_id,
            org_id=org_id,
            project_id=project_id,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            request_id=request_id
        )
        await self.session.commit()
        return log_entry

    async def get_audit_logs(
        self,
        org_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLog]:
        return await self.repo.list_logs(org_id=org_id, project_id=project_id, skip=skip, limit=limit)
