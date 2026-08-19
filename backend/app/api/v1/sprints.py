import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.core.permissions import SystemRole, Permission
from app.schemas.sprint import SprintCreate, SprintUpdate, SprintResponse, SprintAddIssueRequest
from app.services.sprint_service import SprintService
from app.api.dependencies import get_current_user, ProjectPermissionGuard

router = APIRouter(prefix="/sprints", tags=["Sprints"])


from datetime import datetime, timezone
from app.db.models.sprint import SprintStatus, Sprint
from app.core.exceptions import NotFoundException, ValidationException
from app.repositories.audit_repository import AuditRepository

def build_sprint_response(sprint: Sprint) -> SprintResponse:
    now = datetime.now(timezone.utc)

    start_dt = sprint.start_date
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)

    due_dt = sprint.due_date
    if due_dt.tzinfo is None:
        due_dt = due_dt.replace(tzinfo=timezone.utc)

    db_status = sprint.status

    if db_status == SprintStatus.COMPLETED:
        effective_status = SprintStatus.COMPLETED
        is_overdue = False
        days_remaining = 0
        day_counter_text = "Completed"
    else:
        if now > due_dt:
            effective_status = SprintStatus.OVERDUE
            is_overdue = True
            overdue_days = max(1, (now.date() - due_dt.date()).days)
            days_remaining = -overdue_days
            day_counter_text = f"Overdue by {overdue_days} day{'s' if overdue_days != 1 else ''}"
        elif now < start_dt:
            effective_status = SprintStatus.PLANNED
            is_overdue = False
            start_in_days = max(1, (start_dt.date() - now.date()).days)
            days_remaining = start_in_days
            day_counter_text = f"Starts in {start_in_days} day{'s' if start_in_days != 1 else ''}"
        else:
            effective_status = SprintStatus.ACTIVE
            is_overdue = False
            rem_days = (due_dt.date() - now.date()).days
            days_remaining = rem_days
            if rem_days == 0:
                day_counter_text = "Due today"
            else:
                day_counter_text = f"{rem_days} day{'s' if rem_days != 1 else ''} remaining"

    resp = SprintResponse.model_validate(sprint)
    resp.effective_status = effective_status
    resp.is_overdue = is_overdue
    resp.days_remaining = days_remaining
    resp.day_counter_text = day_counter_text
    return resp


@router.post("", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
async def create_sprint(
    data: SprintCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    guard = ProjectPermissionGuard(Permission.SPRINT_MANAGE)
    await guard(project_id=data.project_id, user=user, session=session)

    service = SprintService(session)
    sprint = await service.create_sprint(data, creator_id=user.id)
    return build_sprint_response(sprint)


@router.get("", response_model=List[SprintResponse])
async def list_sprints(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    guard = ProjectPermissionGuard()
    await guard(project_id=project_id, user=user, session=session)

    service = SprintService(session)
    sprints = await service.sprint_repo.list_by_project(project_id)
    return [build_sprint_response(s) for s in sprints]


@router.patch("/{sprint_id}", response_model=SprintResponse)
async def update_sprint(
    sprint_id: uuid.UUID,
    data: SprintUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    service = SprintService(session)
    sprint = await service.sprint_repo.get(sprint_id)
    if not sprint:
        raise NotFoundException("Sprint", sprint_id)

    guard = ProjectPermissionGuard(Permission.SPRINT_MANAGE)
    await guard(project_id=sprint.project_id, user=user, session=session)

    new_start = data.start_date or sprint.start_date
    new_due = data.due_date or sprint.due_date
    if new_start > new_due:
        raise ValidationException("Sprint start date cannot be after due date.")

    if data.name is not None:
        sprint.name = data.name
    if data.goal is not None:
        sprint.goal = data.goal
    if data.start_date is not None:
        sprint.start_date = data.start_date
    if data.due_date is not None:
        sprint.due_date = data.due_date
    if data.status is not None:
        sprint.status = data.status

    await session.flush()

    audit_repo = AuditRepository(session)
    await audit_repo.log_audit(
        action="SPRINT_UPDATE",
        resource_type="sprint",
        user_id=user.id,
        project_id=sprint.project_id,
        resource_id=str(sprint.id),
        details={"name": sprint.name, "status": str(sprint.status)}
    )

    await session.commit()
    await session.refresh(sprint)
    return build_sprint_response(sprint)


@router.post("/{sprint_id}/issues", response_model=List[uuid.UUID])
async def add_issue_to_sprint(
    sprint_id: uuid.UUID,
    data: SprintAddIssueRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    service = SprintService(session)
    sprint = await service.sprint_repo.get(sprint_id)
    if not sprint:
        raise NotFoundException("Sprint", sprint_id)

    guard = ProjectPermissionGuard(Permission.SPRINT_MANAGE)
    await guard(project_id=sprint.project_id, user=user, session=session)

    return await service.add_issue_to_sprint(sprint_id=sprint_id, issue_id=data.issue_id, user_id=user.id)

