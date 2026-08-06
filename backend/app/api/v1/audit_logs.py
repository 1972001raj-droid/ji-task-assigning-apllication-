import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.core.permissions import Permission
from app.core.exceptions import PermissionDeniedException
from app.schemas.audit import AuditLogResponse
from app.services.audit_service import AuditService
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    org_id: Optional[uuid.UUID] = Query(None),
    project_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    if not user.is_superuser:
        raise PermissionDeniedException("Only Admin users can access system audit logs.")

    service = AuditService(session)
    return await service.get_audit_logs(org_id=org_id, project_id=project_id, skip=skip, limit=limit)
