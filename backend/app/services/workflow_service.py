import uuid
from typing import List, Tuple, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.issue import Issue, IssueType, IssueStatus
from app.core.exceptions import (
    NotFoundException,
    VersionConflictException,
    InvalidTransitionException,
    PermissionDeniedException,
)
from app.repositories.issue_repository import IssueRepository
from app.repositories.activity_repository import ActivityRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.outbox_repository import OutboxRepository


class WorkflowService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.issue_repo = IssueRepository(session)
        self.activity_repo = ActivityRepository(session)
        self.audit_repo = AuditRepository(session)
        self.outbox_repo = OutboxRepository(session)

    async def check_story_eligibility(self, story_id: uuid.UUID) -> Tuple[bool, bool]:
        """Check if a Story is eligible for Review and eligible for Done."""
        tasks = await self.issue_repo.get_linked_tasks(story_id)
        ac_list = await self.issue_repo.get_acceptance_criteria(story_id)

        all_tasks_review_or_done = len(tasks) > 0 and all(t.status in (IssueStatus.REVIEW, IssueStatus.DONE) for t in tasks) if tasks else True
        all_tasks_done = len(tasks) > 0 and all(t.status == IssueStatus.DONE for t in tasks) if tasks else True
        all_ac_done = len(ac_list) > 0 and all(ac.is_completed for ac in ac_list) if ac_list else True

        eligible_for_review = all_tasks_review_or_done
        eligible_for_done = all_tasks_done and all_ac_done
        return eligible_for_review, eligible_for_done

    async def transition_issue(
        self,
        issue_id: uuid.UUID,
        target_status: IssueStatus,
        current_version: int,
        user_id: uuid.UUID,
        project_id: uuid.UUID
    ) -> Issue:
        """
        Authoritative single-transaction status transition engine enforcing rules 1-10,
        optimistic locking, activity logging, audit trails, and outbox event creation.
        """
        # Fetch issue with lock
        issue = await self.issue_repo.get_for_update(issue_id)
        if not issue or issue.project_id != project_id:
            raise NotFoundException("Issue", issue_id)

        # Optimistic locking version check
        if issue.version != current_version:
            raise VersionConflictException(
                f"Optimistic lock conflict: expected version {issue.version}, provided {current_version}"
            )

        if issue.status == target_status:
            return issue  # No-op if status is unchanged

        from_status = issue.status
        issue_type = issue.issue_type

        # Dispatch transition based on issue type
        if issue_type == IssueType.STORY:
            await self._handle_story_transition(issue, target_status)
        elif issue_type == IssueType.TASK:
            await self._handle_task_transition(issue, target_status)
        elif issue_type in (IssueType.BUG, IssueType.SUBTASK, IssueType.EPIC):
            # Direct transitions for standalone bugs, subtasks, epics
            issue.status = target_status
            issue.version += 1
        else:
            issue.status = target_status
            issue.version += 1

        # Activity, Audit, and Outbox logs inside the same transaction
        await self.activity_repo.log_activity(
            issue_id=issue.id,
            user_id=user_id,
            action="ISSUE_TRANSITIONED",
            details={
                "from_status": from_status.value,
                "to_status": target_status.value,
                "issue_type": issue_type.value,
            }
        )

        await self.audit_repo.log_audit(
            action="ISSUE_TRANSITION",
            resource_type="issue",
            user_id=user_id,
            project_id=project_id,
            resource_id=str(issue.id),
            details={
                "from_status": from_status.value,
                "to_status": target_status.value,
                "issue_type": issue_type.value,
            }
        )

        await self.outbox_repo.create_event(
            event_type="ISSUE_STATUS_CHANGED",
            payload={
                "issue_id": str(issue.id),
                "project_id": str(project_id),
                "actor_id": str(user_id),
                "from_status": from_status.value,
                "to_status": target_status.value,
                "issue_type": issue_type.value,
            }
        )

        await self.session.commit()
        return issue

    async def _handle_story_transition(self, story: Issue, target_status: IssueStatus) -> None:
        current_status = story.status

        # Rule 1: Story: Backlog -> To Do => Move Story to To Do and all linked Tasks to To Do
        if current_status == IssueStatus.BACKLOG and target_status == IssueStatus.TODO:
            story.status = IssueStatus.TODO
            story.version += 1
            linked_tasks = await self.issue_repo.get_linked_tasks(story.id)
            for task in linked_tasks:
                if task.status != IssueStatus.TODO:
                    task.status = IssueStatus.TODO
                    task.version += 1

        # Rule 2: Story: To Do -> In Progress => Move Story to In Progress. Do not automatically change Tasks.
        elif current_status == IssueStatus.TODO and target_status == IssueStatus.IN_PROGRESS:
            story.status = IssueStatus.IN_PROGRESS
            story.version += 1

        # Rule 3: Story: In Progress -> Review => Allow only when every linked Task is Review or Done
        elif current_status == IssueStatus.IN_PROGRESS and target_status == IssueStatus.REVIEW:
            linked_tasks = await self.issue_repo.get_linked_tasks(story.id)
            incomplete_tasks = [t for t in linked_tasks if t.status not in (IssueStatus.REVIEW, IssueStatus.DONE)]
            if incomplete_tasks:
                raise InvalidTransitionException(
                    "Cannot move Story to Review: not all linked Tasks are in Review or Done.",
                    details={"incomplete_tasks": [str(t.id) for t in incomplete_tasks]}
                )
            story.status = IssueStatus.REVIEW
            story.version += 1

        # Rule 4: Story: Review -> Done => Allow only when every linked Task is Done and all Acceptance Criteria complete
        elif current_status == IssueStatus.REVIEW and target_status == IssueStatus.DONE:
            linked_tasks = await self.issue_repo.get_linked_tasks(story.id)
            not_done_tasks = [t for t in linked_tasks if t.status != IssueStatus.DONE]
            if not_done_tasks:
                raise InvalidTransitionException(
                    "Cannot move Story to Done: not all linked Tasks are Done.",
                    details={"not_done_tasks": [str(t.id) for t in not_done_tasks]}
                )
            ac_list = await self.issue_repo.get_acceptance_criteria(story.id)
            incomplete_ac = [ac for ac in ac_list if not ac.is_completed]
            if incomplete_ac:
                raise InvalidTransitionException(
                    "Cannot move Story to Done: not all Acceptance Criteria are complete.",
                    details={"incomplete_acceptance_criteria": [str(ac.id) for ac in incomplete_ac]}
                )
            story.status = IssueStatus.DONE
            story.version += 1

        else:
            # Other direct transitions (e.g. Backlog -> In Progress, Review -> In Progress, etc.)
            story.status = target_status
            story.version += 1

    async def _handle_task_transition(self, task: Issue, target_status: IssueStatus) -> None:
        current_status = task.status
        parent_story_id = task.parent_issue_id

        # Rule 5: Task: Backlog -> To Do => Move parent Story to To Do and sibling Tasks to To Do
        if current_status == IssueStatus.BACKLOG and target_status == IssueStatus.TODO:
            task.status = IssueStatus.TODO
            task.version += 1
            if parent_story_id:
                parent_story = await self.issue_repo.get_for_update(parent_story_id)
                if parent_story and parent_story.status == IssueStatus.BACKLOG:
                    parent_story.status = IssueStatus.TODO
                    parent_story.version += 1
                
                sibling_tasks = await self.issue_repo.get_linked_tasks(parent_story_id)
                for sib in sibling_tasks:
                    if sib.id != task.id and sib.status == IssueStatus.BACKLOG:
                        sib.status = IssueStatus.TODO
                        sib.version += 1

        # Rule 6: Task: To Do -> In Progress => Move parent Story to In Progress. Do not automatically change sibling Tasks.
        elif current_status == IssueStatus.TODO and target_status == IssueStatus.IN_PROGRESS:
            task.status = IssueStatus.IN_PROGRESS
            task.version += 1
            if parent_story_id:
                parent_story = await self.issue_repo.get_for_update(parent_story_id)
                if parent_story and parent_story.status in (IssueStatus.BACKLOG, IssueStatus.TODO):
                    parent_story.status = IssueStatus.IN_PROGRESS
                    parent_story.version += 1

        # Rule 7: Task: In Progress -> Review => Parent Story normally remains In Progress. Do not change siblings.
        elif current_status == IssueStatus.IN_PROGRESS and target_status == IssueStatus.REVIEW:
            task.status = IssueStatus.REVIEW
            task.version += 1

        # Rule 8: Task: Review -> Done => Parent Story remains Review or In Progress until all Tasks are complete.
        elif current_status == IssueStatus.REVIEW and target_status == IssueStatus.DONE:
            task.status = IssueStatus.DONE
            task.version += 1

        else:
            task.status = target_status
            task.version += 1
