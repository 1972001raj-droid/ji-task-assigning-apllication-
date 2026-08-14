import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session
from app.db.models.user import User
from app.db.models.issue import IssueType, IssueStatus, IssuePriority
from app.core.permissions import SystemRole, Permission
from app.core.exceptions import NotFoundException, PermissionDeniedException, VersionConflictException
from app.schemas.issue import (
    IssueCreate,
    IssueUpdate,
    IssueResponse,
    IssueDetailResponse,
    IssueTransitionRequest,
    AcceptanceCriteriaCreate,
    AcceptanceCriteriaUpdate,
    AcceptanceCriteriaResponse,
    IssueCommentCreate,
    IssueCommentResponse,
)
from app.services.issue_service import IssueService
from app.services.workflow_service import WorkflowService
from app.api.dependencies import get_current_user, ProjectPermissionGuard

from sqlalchemy import select
from app.db.models.project import ProjectMembership
from app.db.models.organization import OrganizationMembership

router = APIRouter(prefix="", tags=["Issues"])


@router.post("/issues", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    data: IssueCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    from sqlalchemy import text as sql_text

    guard = ProjectPermissionGuard()
    await guard(project_id=data.project_id, user=user, session=session)

    pm_res = await session.execute(select(ProjectMembership.role).where(ProjectMembership.user_id == user.id))
    om_res = await session.execute(select(OrganizationMembership.role).where(OrganizationMembership.user_id == user.id))
    all_roles = {str(getattr(r[0], 'value', r[0])).upper() for r in pm_res.fetchall()} | {str(getattr(r[0], 'value', r[0])).upper() for r in om_res.fetchall()}

    is_manager_or_admin = user.is_superuser or "ADMIN" in all_roles or "MANAGER" in all_roles

    if not is_manager_or_admin:
        if data.issue_type not in (IssueType.SUBTASK, IssueType.BUG):
            raise PermissionDeniedException("Only Managers and Admins can create top-level Issues, Epics, User Stories, or Tasks.")

    issue_service = IssueService(session)
    issue = await issue_service.create_issue(data, reporter_id=user.id)

    resp = IssueResponse.model_validate(issue)
    resp.effective_epic_id = await issue_service.get_effective_epic_id(issue)
    return resp




@router.get("/issues/{issue_id}", response_model=IssueDetailResponse)
async def get_issue_detail(
    issue_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    issue_service = IssueService(session)
    issue = await issue_service.issue_repo.get(issue_id)
    if not issue:
        raise NotFoundException("Issue", issue_id)

    guard = ProjectPermissionGuard()
    await guard(project_id=issue.project_id, user=user, session=session)

    workflow_service = WorkflowService(session)
    elig_review, elig_done = await workflow_service.check_story_eligibility(issue.id) if issue.issue_type == IssueType.STORY else (False, False)

    resp = IssueDetailResponse.model_validate(issue)
    resp.effective_epic_id = await issue_service.get_effective_epic_id(issue)
    resp.is_eligible_for_review = elig_review
    resp.is_eligible_for_done = elig_done
    return resp


@router.put("/issues/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: uuid.UUID,
    data: IssueUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    issue_service = IssueService(session)
    issue = await issue_service.issue_repo.get(issue_id)
    if not issue:
        raise NotFoundException("Issue", issue_id)

    guard = ProjectPermissionGuard()
    await guard(project_id=issue.project_id, user=user, session=session)

    if issue.version != data.version:
        raise VersionConflictException(f"Stale update. Current issue version is {issue.version}, provided {data.version}")

    if data.title is not None:
        issue.title = data.title
    if data.description is not None:
        issue.description = data.description
    if data.priority is not None:
        issue.priority = data.priority
    if data.estimate is not None:
        await issue_service.validate_estimate(issue.project_id, data.estimate)
        issue.estimate = data.estimate
    if data.assignee_id is not None:
        issue.assignee_id = data.assignee_id
    if data.position is not None:
        issue.position = data.position

    issue.version += 1
    await session.commit()

    resp = IssueResponse.model_validate(issue)
    resp.effective_epic_id = await issue_service.get_effective_epic_id(issue)
    return resp


@router.post("/issues/{issue_id}/transition", response_model=IssueResponse)
async def transition_issue(
    issue_id: uuid.UUID,
    data: IssueTransitionRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    issue_service = IssueService(session)
    issue = await issue_service.issue_repo.get(issue_id)
    if not issue:
        raise NotFoundException("Issue", issue_id)

    guard = ProjectPermissionGuard(Permission.ISSUE_TRANSITION)
    await guard(project_id=issue.project_id, user=user, session=session)

    workflow_service = WorkflowService(session)
    updated_issue = await workflow_service.transition_issue(
        issue_id=issue_id,
        target_status=data.target_status,
        current_version=data.current_version,
        user_id=user.id,
        project_id=issue.project_id
    )

    resp = IssueResponse.model_validate(updated_issue)
    resp.effective_epic_id = await issue_service.get_effective_epic_id(updated_issue)
    return resp


@router.post("/issues/{issue_id}/comments", response_model=IssueCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    issue_id: uuid.UUID,
    data: IssueCommentCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    issue_service = IssueService(session)
    issue = await issue_service.issue_repo.get(issue_id)
    if not issue:
        raise NotFoundException("Issue", issue_id)

    guard = ProjectPermissionGuard(Permission.COMMENT_CREATE)
    await guard(project_id=issue.project_id, user=user, session=session)

    return await issue_service.add_comment(issue_id=issue_id, content=data.content, author_id=user.id)


@router.post("/issues/{issue_id}/acceptance-criteria", response_model=AcceptanceCriteriaResponse, status_code=status.HTTP_201_CREATED)
async def add_acceptance_criteria(
    issue_id: uuid.UUID,
    data: AcceptanceCriteriaCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    issue_service = IssueService(session)
    issue = await issue_service.issue_repo.get(issue_id)
    if not issue:
        raise NotFoundException("Issue", issue_id)

    guard = ProjectPermissionGuard(Permission.ACCEPTANCE_CRITERIA_MANAGE)
    await guard(project_id=issue.project_id, user=user, session=session)

    return await issue_service.add_acceptance_criteria(story_id=issue_id, data=data, user_id=user.id)


@router.patch("/acceptance-criteria/{ac_id}", response_model=AcceptanceCriteriaResponse)
async def update_acceptance_criteria(
    ac_id: uuid.UUID,
    data: AcceptanceCriteriaUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    issue_service = IssueService(session)
    return await issue_service.update_acceptance_criteria(ac_id=ac_id, data=data, user_id=user.id)


@router.delete("/issues/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_issue(
    issue_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    issue_service = IssueService(session)
    issue = await issue_service.issue_repo.get(issue_id)
    if not issue:
        raise NotFoundException("Issue", issue_id)

    guard = ProjectPermissionGuard(Permission.ISSUE_DELETE)
    await guard(project_id=issue.project_id, user=user, session=session)

    await session.delete(issue)
    await session.commit()
