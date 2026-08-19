import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.db.models.issue import IssueType, IssueStatus, IssuePriority
from app.schemas.issue import IssueResponse
from app.services.issue_service import IssueService
from app.api.dependencies import get_current_user, ProjectPermissionGuard

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/issues")
async def search_issues(
    project_id: uuid.UUID,
    q: Optional[str] = Query(None, description="Search in title and description"),
    status: Optional[IssueStatus] = Query(None),
    issue_type: Optional[IssueType] = Query(None),
    priority: Optional[IssuePriority] = Query(None),
    assignee_id: Optional[uuid.UUID] = Query(None),
    sprint_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    guard = ProjectPermissionGuard()
    await guard(project_id=project_id, user=user, session=session)

    service = IssueService(session)
    issues, total = await service.issue_repo.search_and_filter(
        project_id=project_id,
        q=q,
        status=status,
        issue_type=issue_type,
        priority=priority,
        assignee_id=assignee_id,
        sprint_id=sprint_id,
        skip=skip,
        limit=limit
    )

    items = []
    for iss in issues:
        resp = IssueResponse.model_validate(iss)
        resp.effective_epic_id = await service.get_effective_epic_id(iss)
        resp.sprint_id = await service.get_active_sprint_id(iss)
        items.append(resp)

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items
    }
