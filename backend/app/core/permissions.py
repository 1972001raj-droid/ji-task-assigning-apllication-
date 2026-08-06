from enum import Enum
from typing import Set


class SystemRole(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    DEVELOPER_TESTER = "DEVELOPER_TESTER"


class Permission(str, Enum):
    USER_MANAGE = "user:manage"
    PROJECT_MANAGE = "project:manage"
    WORKFLOW_MANAGE = "workflow:manage"
    AUDIT_READ = "audit:read"
    REPORT_READ = "report:read"
    
    EPIC_MANAGE = "epic:manage"
    STORY_MANAGE = "story:manage"
    ACCEPTANCE_CRITERIA_MANAGE = "acceptance_criteria:manage"
    SPRINT_MANAGE = "sprint:manage"
    
    TASK_CREATE_UPDATE = "task:create_update"
    BUG_CREATE_UPDATE = "bug:create_update"
    SUBTASK_CREATE_UPDATE = "subtask:create_update"
    COMMENT_CREATE = "comment:create"
    ISSUE_TRANSITION = "issue:transition"


ROLE_PERMISSIONS: dict[SystemRole, Set[Permission]] = {
    SystemRole.ADMIN: {
        Permission.USER_MANAGE,
        Permission.PROJECT_MANAGE,
        Permission.WORKFLOW_MANAGE,
        Permission.AUDIT_READ,
        Permission.REPORT_READ,
        Permission.EPIC_MANAGE,
        Permission.STORY_MANAGE,
        Permission.ACCEPTANCE_CRITERIA_MANAGE,
        Permission.SPRINT_MANAGE,
        Permission.TASK_CREATE_UPDATE,
        Permission.BUG_CREATE_UPDATE,
        Permission.SUBTASK_CREATE_UPDATE,
        Permission.COMMENT_CREATE,
        Permission.ISSUE_TRANSITION,
    },
    SystemRole.MANAGER: {
        Permission.REPORT_READ,
        Permission.EPIC_MANAGE,
        Permission.STORY_MANAGE,
        Permission.ACCEPTANCE_CRITERIA_MANAGE,
        Permission.SPRINT_MANAGE,
        Permission.TASK_CREATE_UPDATE,
        Permission.BUG_CREATE_UPDATE,
        Permission.SUBTASK_CREATE_UPDATE,
        Permission.COMMENT_CREATE,
        Permission.ISSUE_TRANSITION,
    },
    SystemRole.DEVELOPER_TESTER: {
        Permission.REPORT_READ,
        Permission.TASK_CREATE_UPDATE,
        Permission.BUG_CREATE_UPDATE,
        Permission.SUBTASK_CREATE_UPDATE,
        Permission.COMMENT_CREATE,
        Permission.ISSUE_TRANSITION,
    },
}


def has_permission(role: SystemRole, permission: Permission) -> bool:
    """Check if a given role possesses a specific permission."""
    return permission in ROLE_PERMISSIONS.get(role, set())
