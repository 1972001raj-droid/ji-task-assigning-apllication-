# ProjectFlow - Project Management System

A full-stack, role-based project management application for planning, tracking, and delivering work across epics, stories, tasks, bugs, and subtasks.

Built with a FastAPI + PostgreSQL backend and a React + TypeScript frontend, ProjectFlow provides sprint boards, workflow automation, reporting, notifications, audit logs, and secure session-based authentication.

## Features

- Secure login with username/email and password
- Role-based access for:
  - Admin
  - Manager
  - Developer/Tester
- Organization and project management
- Epic, story, task, bug, and subtask hierarchy
- Configurable story-point estimation:
  - Fibonacci
  - T-shirt sizing
  - Custom values
- Sprint creation and issue assignment
- Kanban board with:
  - Backlog
  - To Do
  - In Progress
  - Review
  - Done
- Drag-and-drop issue movement and ordering
- Workflow validation and automatic task/story propagation
- Acceptance criteria tracking for stories
- Issue comments
- Global issue search and filters
- Product roadmap and project timeline
- Sprint burndown chart
- Team workload reporting
- CSV issue export
- In-app notifications
- Activity and audit logging
- Dark mode support
- Glassmorphism-based responsive React UI

## Tech Stack

### Backend

- Python 3.12+
- FastAPI
- PostgreSQL
- SQLAlchemy 2.x Async ORM
- Alembic
- Pydantic v2
- Argon2id password hashing
- Server-side sessions
- CSRF protection
- Pytest and pytest-asyncio

### Frontend

- React
- TypeScript
- Vite
- Axios
- Lucide React
- Responsive glassmorphism UI
- Cookie-based authentication
- Drag-and-drop board interactions
- Analytics and reporting views

## Project Structure

```text
projectflow/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routes and dependencies
│   │   ├── core/             # Configuration, security, permissions
│   │   ├── db/               # Database models and session setup
│   │   ├── repositories/     # Database access layer
│   │   ├── schemas/          # Pydantic request/response models
│   │   ├── services/         # Business logic and workflow engine
│   │   ├── tests/            # Backend test suite
│   │   └── main.py           # FastAPI application entry point
│   ├── alembic/              # Database migrations
│   ├── docs/                 # Architecture documentation
│   ├── .env.example
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios API clients
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # Authentication and project state
│   │   ├── pages/            # Application pages
│   │   ├── types/            # TypeScript API types
│   │   └── styles/           # Design system and global styles
│   ├── public/
│   ├── .env.example
│   └── package.json
│
└── README.md
```

## Roles and Permissions

| Role | Capabilities |
|---|---|
| Admin | Audit logs, project controls, workflow controls, reports, sessions, and full application access |
| Manager | Create/manage epics, stories, acceptance criteria, sprints, tasks, bugs, reports, and workflow actions |
| Developer/Tester | Create/manage tasks, bugs, subtasks, comments, issue transitions, and reports |

> The backend always enforces permissions. The frontend uses roles to show the appropriate interface and actions.

## Workflow Rules

The system includes a workflow engine that validates issue transitions.

Examples:

- Moving a Story from **Backlog** to **To Do** moves linked tasks to **To Do**.
- A Story can move to **Review** only when linked tasks are in **Review** or **Done**.
- A Story can move to **Done** only when all linked tasks and acceptance criteria are complete.
- Moving a Task from **Backlog** to **To Do** moves its parent Story and sibling tasks to **To Do**.
- All workflow transitions use optimistic locking to prevent conflicting updates.

## Getting Started

### Prerequisites

Install the following:

- Python 3.12 or newer
- PostgreSQL
- Node.js 20 or newer
- npm

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/projectflow.git
cd projectflow
```

### 2. Set up PostgreSQL

Create the development and test databases:

```sql
CREATE DATABASE jira_db;
CREATE DATABASE jira_test_db;
```

### 3. Set up the backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -e .
```

Create your environment file:

```bash
copy .env.example .env
```

Update `DATABASE_URL` in `.env` if needed:

```env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/jira_db
TEST_DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/jira_test_db
```

Run database migrations:

```bash
alembic upgrade head
```

Start the backend:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend services:

- API: `http://127.0.0.1:8000`
- Swagger API documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`
- Readiness check: `http://127.0.0.1:8000/readiness`

### 4. Set up the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create a frontend environment file:

```bash
copy .env.example .env
```

Use the API base path:

```env
VITE_API_BASE_URL=/api/v1
```

Start the frontend:

```bash
npm run dev
```

Open the URL shown by Vite, normally:

```text
http://127.0.0.1:5173
```

## API Overview

| Area | Base Endpoint |
|---|---|
| Authentication | `/api/v1/auth` |
| Current user | `/api/v1/me` |
| Organizations | `/api/v1/organizations` |
| Projects | `/api/v1/projects` |
| Issues | `/api/v1/issues` |
| Sprints | `/api/v1/sprints` |
| Boards | `/api/v1/boards` |
| Search | `/api/v1/search/issues` |
| Reports | `/api/v1/reports` |
| Notifications | `/api/v1/notifications` |
| Audit logs | `/api/v1/audit-logs` |

Interactive API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

## Security

- Passwords are hashed with Argon2id.
- Sessions are stored server-side in PostgreSQL.
- Authentication uses HttpOnly cookies.
- State-changing requests require an `X-CSRF-Token` header.
- Multi-tenant project access is enforced server-side.
- Optimistic locking prevents stale issue updates.
- Audit logs record critical administrative and workflow actions.

## Testing

Run backend tests:

```bash
cd backend
pytest -v
```

Build the frontend:

```bash
cd frontend
npm run build
```

## Environment Variables

### Backend

```env
ENVIRONMENT=local
DEBUG=true
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/jira_db
TEST_DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/jira_test_db
SECRET_KEY=replace-with-a-secure-secret
COOKIE_SECURE=false
CORS_ORIGINS=["http://127.0.0.1:5173"]
```

### Frontend

```env
VITE_API_BASE_URL=/api/v1
```

## Important

Do not commit these files or directories:

```text
.env
.venv/
node_modules/
__pycache__/
.pytest_cache/
dist/
```

Use `.env.example` files as templates instead.

## Future Improvements

- User provisioning and invitation workflow
- Sprint editing and completion controls
- Activity-history API view
- File attachments
- Real-time notifications with WebSockets
- Docker and CI/CD configuration
- Production deployment setup

## License

This project is for educational and portfolio purposes. Add a license file before using it in production.
