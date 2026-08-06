# Backend Engineering Assumptions & Design Decisions

This document details design choices made where requirements were silent or provided flexibility for implementation details.

1. **User Provisioning**:
   - *Requirement Silent On*: Self-registration vs Admin provisioning.
   - *Decision*: Authentication uses Admin user-management APIs to provision accounts. Public self-registration is omitted to maintain strict organization tenancy boundaries.

2. **Session Storage**:
   - *Requirement Silent On*: Storage mechanism for server-side sessions.
   - *Decision*: Sessions stored as SHA-256 token hashes in PostgreSQL `auth_sessions` table to support multi-device session listing and individual session revocation without external session store dependencies.

3. **Effective Epic Linking**:
   - *Requirement*: Automatic epic linking for Tasks and Bugs through their parent Story.
   - *Decision*: Derived dynamically at query time (`effective_epic_id`) from the parent Story's `parent_issue_id` rather than storing a duplicate editable column that could become out-of-sync.

4. **Sprint History & Assignments**:
   - *Requirement Silent On*: Tracking issue sprint movements over time.
   - *Decision*: Implemented `sprint_issue_assignments` history table with `is_active`, `added_at`, and `removed_at` timestamps to ensure historical burndown metrics and assignment audits remain accurate.

5. **Acceptance Criteria Validation for Story Transition**:
   - *Requirement*: Story: Review -> Done requires all acceptance criteria complete.
   - *Decision*: When a Story has no acceptance criteria defined, it is considered complete by default, allowing it to transition to Done once all linked tasks are complete.

6. **Outbox Notification Adapters**:
   - *Requirement*: External delivery adapters must be pluggable, but no 3rd-party provider required yet.
   - *Decision*: Implemented `InAppNotificationAdapter` (storing to `notifications` table) and `ConsoleNotificationAdapter` for local development.

7. **CSV Export Format**:
   - *Requirement*: Authorized CSV report export endpoint (FR-31).
   - *Decision*: Export includes standard issue columns: ID, Title, Type, Status, Priority, Estimate, Assignee ID, and Created At timestamp.
