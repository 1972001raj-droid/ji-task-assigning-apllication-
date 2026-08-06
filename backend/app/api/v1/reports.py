import uuid
from typing import List
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.core.permissions import SystemRole, Permission
from app.schemas.analytics import (
    RoadmapItemResponse,
    TimelineItemResponse,
    BurndownResponse,
    TeamWorkloadResponse,
)
from app.services.report_service import ReportService
from app.api.dependencies import get_current_user, ProjectPermissionGuard

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/roadmap", response_model=List[RoadmapItemResponse])
async def get_roadmap(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    guard = ProjectPermissionGuard(Permission.REPORT_READ)
    await guard(project_id=project_id, user=user, session=session)

    service = ReportService(session)
    return await service.get_roadmap(project_id)


@router.get("/timeline", response_model=List[TimelineItemResponse])
async def get_timeline(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    guard = ProjectPermissionGuard(Permission.REPORT_READ)
    await guard(project_id=project_id, user=user, session=session)

    service = ReportService(session)
    return await service.get_timeline(project_id)


@router.get("/burndown", response_model=BurndownResponse)
async def get_burndown(
    sprint_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    service = ReportService(session)
    sprint = await service.sprint_repo.get(sprint_id)
    if not sprint:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Sprint", sprint_id)

    guard = ProjectPermissionGuard(Permission.REPORT_READ)
    await guard(project_id=sprint.project_id, user=user, session=session)

    return await service.get_burndown(sprint_id)


@router.get("/workload", response_model=TeamWorkloadResponse)
async def get_workload(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    guard = ProjectPermissionGuard(Permission.REPORT_READ)
    await guard(project_id=project_id, user=user, session=session)

    service = ReportService(session)
    return await service.get_team_workload(project_id)


@router.get("/export/issues")
async def export_issues_csv(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    guard = ProjectPermissionGuard(Permission.REPORT_READ)
    await guard(project_id=project_id, user=user, session=session)

    service = ReportService(session)
    csv_content = await service.generate_issues_csv(project_id)
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=issues_export_{project_id}.csv"}
    )
