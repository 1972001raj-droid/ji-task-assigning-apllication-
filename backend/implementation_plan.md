# Production Backend Architecture & Implementation Plan

Build a production-grade, modular FastAPI backend for a multi-tenant project management application using Python 3.12, PostgreSQL, SQLAlchemy 2.x async ORM, Alembic migrations, Argon2id security, CSRF protection, optimistic locking, and a complete workflow transition engine.

## User Review Required

> [!IMPORTANT]
> **Database & Environment Setup**: Tests and local execution require a local PostgreSQL instance. A `pyproject.toml` and `.env.example` will be provided for dependency management and configuration. No Docker/K8s/CI configs will be generated per prompt restrictions.
> **Session & Cookie Security**: Authentication will use server-side sessions backed by PostgreSQL and HttpOnly/Secure/SameSite cookies alongside CSRF token validation on state-changing endpoints.

## Proposed Changes

### Core Architecture & Configuration (`backend/app/core/`)

#### [NEW] [config.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/core/config.py)
- Pydantic `BaseSettings` for database URL, session secrets, CORS origins, cookie settings, and rate limiters.

#### [NEW] [security.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/core/security.py)
- Argon2id password hashing utilities using `argon2-cffi` / `passlib`.
- Session token generation (cryptographically secure random tokens) and CSRF token verification.

#### [NEW] [permissions.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/core/permissions.py)
- Role definitions: `ADMIN`, `MANAGER`, `DEVELOPER_TESTER`.
- Permission matrix checking project-level and workspace-level permissions.

#### [NEW] [exceptions.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/core/exceptions.py)
- Custom exceptions (e.g. `VersionConflictException`, `PermissionDeniedException`, `InvalidTransitionException`, `ResourceNotFoundException`) mapped to HTTP 409, 403, 422, 404.

---

### Database Models & Session Management (`backend/app/db/`)

#### [NEW] [session.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/db/session.py)
- Async SQLAlchemy engine & `async_sessionmaker` bound to PostgreSQL (`postgresql+asyncpg://...`).

#### [NEW] [base.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/db/base.py)
- Declarative Base class with standard mixins (`id` UUID, `created_at`, `updated_at`, `created_by`).

#### [NEW] [models/](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/db/models/)
- `user.py`: Users, credentials, preferences.
- `session.py`: Active server-side sessions (`token_hash`, `user_id`, `expires_at`, `created_at`).
- `organization.py`: Organizations, Org Memberships (`role`).
- `project.py`: Projects, Project Memberships (`role`).
- `issue.py`: Issue model (`issue_type`, `status`, `project_id`, `parent_issue_id`, `title`, `description`, `priority`, `estimate`, `assignee_id`, `reporter_id`, `sprint_id`, `position`, `version`).
- `acceptance_criteria.py`: Acceptance criteria items for Stories.
- `comment.py`: Issue comments.
- `sprint.py`: Sprints (`name`, `goal`, `start_date`, `due_date`, `status`, `project_id`).
- `activity.py`: Immutable activity history log.
- `audit.py`: Append-only security & system audit log.
- `outbox.py`: Transactional outbox events.
- `notification.py`: In-app notifications.

---

### Schemas (`backend/app/schemas/`)

#### [NEW] [schemas/](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/schemas/)
- Pydantic v2 schemas for Request/Response models: Auth, User, Org, Project, Membership, Issue, Transition, Sprint, Board, Analytics, Notification, AuditLog, and CSV export.

---

### Repositories (`backend/app/repositories/`)

#### [NEW] [repositories/](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/repositories/)
- Base repository pattern and concrete repos for User, Session, Org, Project, Issue, Sprint, Activity, Audit, Outbox, and Notification.

---

### Services (`backend/app/services/`)

#### [NEW] [auth_service.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/services/auth_service.py)
- User registration, authentication, server-side session management, cookie handling, password hashing.

#### [NEW] [workflow_service.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/services/workflow_service.py)
- Authoritative `transition_issue` engine:
  - Enforces optimistic locking (`version` check).
  - Implements exact propagation rules 1-10.
  - Validates acceptance criteria completeness before moving Story to `DONE`.
  - Atomic single DB transaction for issue update + activity log + audit log + outbox event.

#### [NEW] [issue_service.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/services/issue_service.py)
- Issue CRUD, hierarchy validation (Epic -> Story -> Task/Bug -> Subtask), story point estimates, drag-and-drop position reordering, comments, acceptance criteria.

#### [NEW] [sprint_service.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/services/sprint_service.py)
- Sprint management, adding issues to sprint (auto-including parent Story / linked tasks).

#### [NEW] [report_service.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/services/report_service.py)
- Roadmap, Timeline, Sprint Burndown, Workload Analytics, and CSV export generator.

#### [NEW] [notification_service.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/services/notification_service.py)
- Pluggable outbox processor / adapters (InAppNotificationAdapter, ConsoleAdapter).

#### [NEW] [audit_service.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/services/audit_service.py)
- Helper for logging security and administrative events.

---

### API Endpoints (`backend/app/api/`)

#### [NEW] [dependencies.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/api/dependencies.py)
- Session authentication extractor, CSRF checker, project tenant & permission guards.

#### [NEW] [v1/](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/api/v1/)
- `auth.py`: `/login`, `/logout`, `/sessions`
- `users.py`: `/me`, dashboard redirection info
- `organizations.py`, `projects.py`, `memberships.py`
- `issues.py`: CRUD, hierarchy validation, `/transition`, `/comments`, `/acceptance-criteria`
- `sprints.py`: Sprint management
- `boards.py`: Board views (Backlog, To Do, In Progress, Review, Done)
- `search.py`: Issue search and filtering
- `reports.py`: Analytics APIs & CSV export
- `notifications.py`: User in-app notifications
- `audit_logs.py`: System audit log viewer (Admin only)

---

### App Entry Point & Migrations (`backend/app/main.py`, `backend/alembic/`)

#### [NEW] [main.py](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/main.py)
- FastAPI application factory, middleware (CORS, Rate Limiting, CSRF, Request ID logging), health/readiness endpoints, OpenAPI configuration.

#### [NEW] [alembic/](file:///c:/Users/Zesus/Desktop/projects/ji/backend/alembic/)
- Complete Alembic async configuration and initial migration scripts for all database tables and indexes.

---

### Documentation & Tests (`backend/docs/`, `backend/app/tests/`)

#### [NEW] [docs/architecture.md](file:///c:/Users/Zesus/Desktop/projects/ji/backend/docs/architecture.md)
- Explains modular architecture, data model, security/session model, workflow engine, and event/outbox flow.

#### [NEW] [docs/assumptions.md](file:///c:/Users/Zesus/Desktop/projects/ji/backend/docs/assumptions.md)
- Documents design decisions where requirements were silent.

#### [NEW] [tests/](file:///c:/Users/Zesus/Desktop/projects/ji/backend/app/tests/)
- Async pytest test suite covering authentication, RBAC, project isolation, issue hierarchy, workflow propagation rules 1-10, optimistic locking conflicts, board movements, and audit logging.

## Verification Plan

### Automated Tests
- Run `pytest` with async test configuration (`pytest -v`).
- Test security & auth (session creation, revocation, CSRF headers, login rate limiting).
- Test tenant & project permission enforcement (attempting cross-project reads/writes returns 403/404).
- Test issue hierarchy rules (validating allowed parent types and rejecting invalid parent-child links).
- Test WorkflowService propagation rules 1-10 explicitly.
- Test optimistic concurrency control (updating issue with stale version returns HTTP 409).
- Test audit log creation and outbox event insertion.

### Manual Verification
- Start FastAPI dev server (`uvicorn app.main:app --reload`).
- Verify `/docs` OpenAPI schema rendering, tags, and response models.
- Verify `/health` and `/readiness` endpoints.
