# Corrected Backend Implementation Plan

## 1. Scope and non-negotiable rules

This plan implements the requirement document as written. It does not remove, reprioritize, or replace any functional requirement.

- This is the backend and local-development plan only. Do not add Docker, Kubernetes, CI/CD, or production-deployment configuration in this phase.
- PostgreSQL is required from the beginning for local development and tests. It may be installed locally or run as a local development dependency; that is separate from deploying the application.
- The backend is the source of truth for authorization, hierarchy validation, sprint membership, workflow transitions, audit history, and analytics data. A frontend must not enforce these rules by itself.
- UI-only requirements remain in scope for the complete product. The backend supplies the APIs and data for them; dark-mode rendering itself is a frontend task.

## 2. Technology and project structure

Use Python 3.12+, FastAPI, PostgreSQL, SQLAlchemy 2.x async ORM, `asyncpg`, Alembic, Pydantic v2, `pydantic-settings`, Argon2id password hashing, `pytest`, `pytest-asyncio`, and `httpx`.

```text
backend/
  app/
    main.py
    core/                 # settings, security, permissions, errors
    db/                   # engine, base model, SQLAlchemy models
    schemas/              # Pydantic request/response contracts
    repositories/         # scoped database queries only
    services/             # business rules and transactions
    api/
      dependencies.py
      v1/                 # FastAPI routers
    workers/              # outbox consumers; no external provider required yet
    tests/
  alembic/
  docs/
  .env.example
  README.md
  pyproject.toml
```

Use an application factory, API versioning under `/api/v1`, a request-scoped `AsyncSession`, structured logging with request IDs, and `/health` plus `/readiness` endpoints. Keep routers thin; services own business rules; repositories own database access.

## 3. Security, authentication, and roles

### Authentication (FR-01)

- Accept either email or username plus password.
- Hash passwords with Argon2id; never log passwords, session values, cookies, or authorization headers.
- Use opaque, server-side sessions stored as hashes in PostgreSQL. Send the session identifier in an `HttpOnly`, `Secure`, and `SameSite` cookie. Make the `Secure` setting configurable only for local HTTP development.
- Implement login, logout, current user, expiry, revocation, and session listing/revocation for the current user.
- Do not add public self-registration: it is not a stated requirement. Admin user-management APIs provision users instead, matching the supplied admin workflow.
- Require CSRF protection on cookie-authenticated state-changing requests, rate-limit login attempts, and configure CORS with an explicit origin list only.

### Authorization and dashboard routing (FR-02, FR-03)

- Define `ADMIN`, `MANAGER`, and `DEVELOPER_TESTER` roles on organization/project memberships.
- Require membership and permission checks server-side for every project-scoped request.
- `POST /auth/login` and `GET /me` return the authenticated user, effective role(s), available projects, and the role-specific dashboard route for the frontend to use.
- Admin can manage users, memberships/roles, projects, workflow configuration, and audit-log access. Managers can manage epics, stories, acceptance criteria, sprints, and their permitted project work. Developers/Testers can create/update permitted tasks, subtasks, bugs, comments, and workflow changes.

## 4. Database design and migrations

Use UUID primary keys. Add `created_at`, `updated_at`, and actor fields where applicable. Use Alembic for all schema changes; never create production tables at application startup.

### Foundation tables

- `users`: username, normalized email, password hash, active state, profile data, preference data.
- `auth_sessions`: hashed session token, user ID, expiry, revocation data, CSRF secret/token metadata, creation and last-used data.
- `organizations`, `organization_memberships`, `projects`, and `project_memberships`: tenant/project boundary and effective roles.

### Work-management tables (FR-04 through FR-14)

- `issues`: one normalized table with `issue_type` (`EPIC`, `STORY`, `TASK`, `BUG`, `SUBTASK`), status (`BACKLOG`, `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`), project ID, `parent_issue_id`, title, description, priority, reporter, assignee, position/rank, optimistic-lock `version`, and optional planning dates.
- Use parent relationships only for the required hierarchy: Story -> Epic; Task -> Story; Bug -> Story; Subtask -> Story or Task. Reject cycles and all other parent-child combinations.
- Automatic epic linking (FR-13) is derived from the Story relationship. The API returns an effective epic ID for Tasks and Bugs, but the database does not store a second editable epic relationship that can become inconsistent.
- `acceptance_criteria`: Story ID, text, completed state, completed-by, completed-at, and ordering.
- `comments`: Issue ID, author, body, timestamps, and edit metadata. Generic issue comments support epics, stories, tasks, bugs, and subtasks.
- `project_estimation_settings`: selected scheme (`FIBONACCI`, `TSHIRT`, or `CUSTOM`) and allowed values. Story estimate values are validated against that selected scheme. This explicitly covers all three estimation modes in FR-14.

### Sprint and board tables (FR-15 through FR-18)

- `sprints`: project ID, name, goal, start date, due date, lifecycle state, creator, and timestamps. Validate that start date is not after due date.
- `sprint_issue_assignments`: issue ID, sprint ID, added-at/removed-at history, actor, and rank within a board column. This replaces a single `issues.sprint_id` field so sprint history, burndown, and movement audits remain accurate.
- Permit at most one active sprint assignment for an issue. Keep completed historical assignments.
- `board_positions` may be represented by the active sprint assignment rank plus issue status; use a stable fractional/rank strategy so a drag-and-drop move does not require renumbering an entire column.

### History, notifications, and reporting tables (FR-21 through FR-31)

- `activity_events`: immutable user-facing issue actions, including creation, edit, assignment, comment, sprint movement, and status transition.
- `audit_logs`: append-only critical security/administrative/system actions, actor, action, target, before/after data, request ID, and timestamp.
- `outbox_events`: transactionally written events for notifications and analytics processing after a successful commit.
- `notifications`: in-app recipient notification, event type, payload, read state, and timestamps.
- `sprint_daily_metrics`: immutable/rebuildable daily remaining/completed estimate snapshot for reproducible burndown charts. It is populated from sprint assignment and issue-history data.

Add indexes for project, parent issue, issue type, status, active sprint assignment, assignee, timestamps, and filter columns. Add PostgreSQL full-text search indexing for issue title and description.

## 5. Core services and exact workflow behavior

### IssueService

Implement CRUD, hierarchy validation, story estimation, comments, acceptance criteria, issue assignment, search/filtering, and board-position changes. A manager and developer permission check is applied exactly where required by the requirement document.

### SprintService

Implement sprint create/edit, board reads, and issue placement. When a Task is added to a sprint, add the linked parent Story and all linked Tasks required by FR-18 in the same transaction; do not silently move unrelated issues. Record activity, audit, and notification/outbox events.

### WorkflowService (the authoritative status engine)

Expose one command endpoint, `POST /api/v1/issues/{issue_id}/transition`. Do not permit generic `PATCH` updates to issue status.

Within one transaction, the service must lock the affected issue and related Story/Tasks in a deterministic order, validate version and permissions, apply the rule, create activity and audit entries, create outbox events, then commit. Return HTTP 409 for a stale version and a clear HTTP 422 response for a blocked transition.

Implement these rules exactly:

| Requested action | Required behavior |
|---|---|
| Story: Backlog -> To Do | Move the Story to To Do and all linked Tasks to To Do. |
| Story: To Do -> In Progress | Move only the Story to In Progress. |
| Story: In Progress -> Review | Allow only if all linked Tasks are Review or Done; do not change Tasks automatically. |
| Story: Review -> Done | Allow only if all linked Tasks are Done and all acceptance criteria are complete; do not change Tasks automatically. |
| Task: Backlog -> To Do | Move the parent Story to To Do and all sibling Tasks to To Do. |
| Task: To Do -> In Progress | Move the parent Story to In Progress; do not change siblings. |
| Task: In Progress -> Review | Keep the parent Story in In Progress unless another explicit rule changes it; do not change siblings. |
| Task: Review -> Done | Do not automatically complete the parent Story or sibling Tasks. |
| All linked Tasks are Review or Done | Mark the Story as eligible for Review; do not transition it automatically. |
| All linked Tasks are Done and criteria are complete | Mark the Story as eligible for Done; do not transition it automatically. |

Eligibility is computed/returned by the backend and may be persisted as a derived read value, but it is not a replacement for the explicit Story transition.

## 6. API contract

Create documented Pydantic request/response schemas and OpenAPI examples. Never return ORM models directly.

- `POST /api/v1/auth/login`, `POST /logout`, `GET /sessions`, `DELETE /sessions/{id}`
- `GET /api/v1/me`
- Organization, project, user-management, and membership endpoints
- Issue CRUD, hierarchy, assignment, comments, acceptance-criteria, and `POST /issues/{id}/transition`
- Sprint CRUD, issue assignment/movement, and board endpoints for Backlog, To Do, In Progress, Review, Done
- Search endpoint with pagination and explicit `status`, `sprint`, `assignee`, `priority`, and `issue_type` filters (FR-27, FR-28)
- Roadmap, timeline, sprint burndown, team-workload, project analytics, and report-dashboard endpoints
- In-app notification list/read endpoints
- Admin-only audit-log endpoints
- Authorized CSV report export endpoint (FR-31)

All issue-changing endpoints require the request's current version where concurrency matters. API error bodies must be consistent and structured.

## 7. Requirement coverage for planning, analytics, and notifications

- Product roadmap (FR-21): return epics/stories with their optional planning dates, status, estimates, and progress.
- Timeline management (FR-22): return project work items by planning date and sprint interval.
- Burndown chart (FR-23): return daily remaining/completed effort per sprint from `sprint_daily_metrics` and immutable history.
- Team workload (FR-24): return project members, roles, assigned active issues, and assigned estimate totals.
- Notifications (FR-25): generate in-app notifications for issue assignment, status update, and sprint update events. The outbox consumer can initially use an in-app adapter and a local console adapter; no third-party service is required.
- Activity history (FR-26): return complete issue history for all issue actions, separate from security audit records.
- Reports dashboard (FR-29): provide project and sprint analytics from the same source data.
- Audit logs (FR-30): include authentication, membership/role, project, issue, transition, and administrative changes.
- Export reports (FR-31): return an authorized CSV download; the document does not require a specific export format, so CSV is the minimum defined backend output.
- Dark mode (FR-32): retain user preference storage/API if wanted by the frontend, but implement dark-mode UI in the frontend phase, not the backend.

## 8. Implementation sequence

1. Create the FastAPI package, configuration, environment example, application factory, health endpoints, database engine, Alembic setup, and test infrastructure.
2. Build users, server sessions, roles, organization/project memberships, login/logout, CSRF, and permission dependencies.
3. Build project models and the normalized issue hierarchy with migrations and hierarchy tests.
4. Build comments, acceptance criteria, estimates, assignments, activity events, audit logs, and outbox writes.
5. Implement and thoroughly test `WorkflowService` before creating drag-and-drop or analytics endpoints.
6. Add sprints, active/historical sprint assignments, board ordering, and FR-18 movement logic.
7. Add search/filter, roadmap, timeline, burndown, workload, and report APIs.
8. Add in-app notification processing and CSV exports.
9. Complete security, concurrency, cross-project isolation, and API integration tests. Only after this backend acceptance gate should the frontend and later Docker deployment work begin.

## 9. Test and acceptance gate

Use a real PostgreSQL test database selected through environment variables. The backend is not complete until all of the following pass:

- Login by email and by username; logout and revoked/expired session behavior.
- CSRF, cookie-security configuration, login rate-limiting behavior, and CORS configuration.
- Role permissions and denial of cross-project reads/writes.
- Valid and invalid Epic/Story/Task/Bug/Subtask hierarchy combinations.
- Fibonacci, T-shirt, and custom story-estimation validation.
- Every workflow rule in the table above, including blocked transitions and eligibility output.
- Sprint issue movement, linked Story/Task movement, position ordering, and historical sprint assignments.
- Optimistic-lock conflict response (HTTP 409).
- Activity event, audit-log, notification, and outbox creation for relevant changes.
- Exact search/filter parameters from FR-27 and FR-28.
- Roadmap/timeline, burndown, workload, report, and CSV export authorization behavior.
- FastAPI OpenAPI documentation at `/docs`, plus `/health` and `/readiness` checks.

## 10. Deliverables for this backend phase

1. Working FastAPI source code and local setup instructions.
2. PostgreSQL models and reviewed Alembic migrations.
3. `.env.example` without secrets.
4. API documentation at `/docs`.
5. `docs/architecture.md` describing the module boundaries, data model, security/session model, workflow engine, and outbox flow.
6. `docs/assumptions.md` documenting only decisions the requirement document leaves open.
7. Automated test suite and documented commands to run it.
8. A final requirement-to-test traceability checklist covering FR-01 through FR-32.
