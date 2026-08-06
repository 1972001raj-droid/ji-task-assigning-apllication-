# Backend System Architecture Document

## Overview

The project management application backend is a production-structured, modular API service written in Python 3.12+ using FastAPI, PostgreSQL, SQLAlchemy 2.x Async ORM, asyncpg, and Alembic migrations.

## Modular Components

1. **`app/core/`**: Core configuration settings, Argon2id security utilities, CSRF token validation, system role and permission matrix definitions, and domain exceptions.
2. **`app/db/`**: Declarative Base models, UUID and timestamp mixins, engine initialization, and async session generator (`AsyncSessionLocal`).
3. **`app/db/models/`**: PostgreSQL ORM models representing users, auth_sessions, organizations, projects, project estimation settings, normalized issues, acceptance criteria, comments, sprints, sprint issue assignments, activity events, audit logs, outbox events, and notifications.
4. **`app/schemas/`**: Pydantic v2 schemas defining strict request/response data contracts.
5. **`app/repositories/`**: Scoped database query layer encapsulating all SQLAlchemy queries.
6. **`app/services/`**: Core business domain logic:
   - `AuthService`: Authentication, Argon2id verification, session lifecycle.
   - `WorkflowService`: Authoritative status engine enforcing optimistic locking and propagation rules 1-10 inside a single transaction.
   - `IssueService`: Hierarchy enforcement (Epic -> Story -> Task/Bug -> Subtask), estimation scheme validation, acceptance criteria, comments.
   - `SprintService`: Sprint management, board building, and FR-18 task+story placement.
   - `ReportService`: Roadmaps, timelines, burndown analytics, team workload, and CSV exports.
   - `NotificationService`: Pluggable adapter pattern (InAppNotificationAdapter, ConsoleAdapter).
   - `AuditService`: Security audit logs.
7. **`app/api/v1/`**: Thin FastAPI routers routing HTTP requests to services and returning Pydantic response models.
8. **`app/workers/`**: Asynchronous outbox consumers processing transactional events for notifications.

## Data Model & Tenancy Isolation

- **Tenant Scope**: All project resources (`issues`, `sprints`, `acceptance_criteria`, etc.) are linked to a `project_id`.
- **Authorization**: `ProjectPermissionGuard` verifies server-side project membership and effective system roles (`ADMIN`, `MANAGER`, `DEVELOPER_TESTER`) before granting access to resources.
- **Optimistic Locking**: Every issue record maintains an integer `version` field. State updates check `issue.version == current_version` and increment `version += 1`, returning HTTP 409 Conflict if stale.

## Security & Session Architecture

- **Passcode Hashing**: Passwords stored using Argon2id.
- **Server-Side Sessions**: Hashed session tokens stored in PostgreSQL (`auth_sessions`). Raw token passed via HttpOnly, Secure, SameSite cookies.
- **CSRF Protection**: State-changing browser requests (POST, PUT, PATCH, DELETE) require matching `X-CSRF-Token` header.
- **Sanitisation**: Sensitive data (passwords, tokens, cookies, secrets) excluded from logs.

## Workflow Engine & Event Outbox Flow

```
[Client] -> POST /api/v1/issues/{id}/transition
               |
        [WorkflowService] (Begin Transaction)
               |
        1. Lock Issue & Associated Stories/Tasks (`with_for_update()`)
        2. Validate Version & Optimistic Lock
        3. Enforce Workflow Rules (Rules 1-10)
        4. Log Activity Event (User History)
        5. Write Audit Log Entry (Security Audit)
        6. Create Outbox Event (`OutboxEvent`)
               |
        (Commit Transaction)
               |
        [OutboxWorker] -> Dispatch to Pluggable Notification Adapters
```
