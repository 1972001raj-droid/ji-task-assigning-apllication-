import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.exceptions import AppException
from app.db.session import engine
from app.api.v1 import (
    auth,
    users,
    organizations,
    projects,
    memberships,
    issues,
    sprints,
    boards,
    search,
    reports,
    notifications,
    audit_logs,
    admin,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    yield
    # Shutdown logic
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        description="Production-Structured Backend for Project Management Application",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan
    )

    # CORS Middleware with explicit origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware for request ID and request duration logging
    @app.middleware("http")
    async def request_context_middleware(request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    # Global Exception Handler for domain exceptions
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "message": exc.message,
                    "status_code": exc.status_code,
                    "details": exc.details,
                    "request_id": getattr(request.state, "request_id", None)
                }
            }
        )

    # Health & Readiness Endpoints
    @app.get("/health", tags=["System"])
    async def health_check():
        return {"status": "ok", "environment": settings.ENVIRONMENT}

    @app.get("/readiness", tags=["System"])
    async def readiness_check():
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return {"status": "ready", "database": "connected"}
        except Exception as e:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={"status": "not_ready", "error": str(e)}
            )

    # Include V1 API Routers
    api_v1_prefix = "/api/v1"
    app.include_router(auth.router, prefix=api_v1_prefix)
    app.include_router(users.router, prefix=api_v1_prefix)
    app.include_router(organizations.router, prefix=api_v1_prefix)
    app.include_router(projects.router, prefix=api_v1_prefix)
    app.include_router(memberships.router, prefix=api_v1_prefix)
    app.include_router(issues.router, prefix=api_v1_prefix)
    app.include_router(sprints.router, prefix=api_v1_prefix)
    app.include_router(boards.router, prefix=api_v1_prefix)
    app.include_router(search.router, prefix=api_v1_prefix)
    app.include_router(reports.router, prefix=api_v1_prefix)
    app.include_router(notifications.router, prefix=api_v1_prefix)
    app.include_router(audit_logs.router, prefix=api_v1_prefix)
    app.include_router(admin.router, prefix=api_v1_prefix)

    return app


app = create_app()
