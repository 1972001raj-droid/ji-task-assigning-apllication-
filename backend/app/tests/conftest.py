import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.models import User, Organization, OrganizationMembership, Project, ProjectMembership, ProjectEstimationSettings
from app.core.permissions import SystemRole
from app.db.session import get_async_session
from app.main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(autouse=True)
async def prepare_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_async_session] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_data(db_session: AsyncSession):
    # Admin User
    admin_user = User(
        username="admin_user",
        email="admin@example.com",
        hashed_password=hash_password("Password123!"),
        full_name="Admin User",
        is_superuser=True
    )
    # Manager User
    manager_user = User(
        username="manager_user",
        email="manager@example.com",
        hashed_password=hash_password("Password123!"),
        full_name="Manager User"
    )
    # Developer User
    developer_user = User(
        username="dev_user",
        email="dev@example.com",
        hashed_password=hash_password("Password123!"),
        full_name="Developer User"
    )
    # External User (Other Project/Org)
    other_user = User(
        username="other_user",
        email="other@example.com",
        hashed_password=hash_password("Password123!"),
        full_name="Other User"
    )

    db_session.add_all([admin_user, manager_user, developer_user, other_user])
    await db_session.flush()

    # Organizations
    org = Organization(name="Acme Corp", slug="acme")
    other_org = Organization(name="Other Corp", slug="other")
    db_session.add_all([org, other_org])
    await db_session.flush()

    # Org Memberships
    m1 = OrganizationMembership(org_id=org.id, user_id=admin_user.id, role=SystemRole.ADMIN)
    m2 = OrganizationMembership(org_id=org.id, user_id=manager_user.id, role=SystemRole.MANAGER)
    m3 = OrganizationMembership(org_id=org.id, user_id=developer_user.id, role=SystemRole.DEVELOPER_TESTER)
    m4 = OrganizationMembership(org_id=other_org.id, user_id=other_user.id, role=SystemRole.DEVELOPER_TESTER)
    db_session.add_all([m1, m2, m3, m4])

    # Projects
    proj_a = Project(org_id=org.id, name="Project Alpha", key="ALPHA")
    proj_b = Project(org_id=other_org.id, name="Project Beta", key="BETA")
    db_session.add_all([proj_a, proj_b])
    await db_session.flush()

    # Project Memberships
    pm1 = ProjectMembership(project_id=proj_a.id, user_id=admin_user.id, role=SystemRole.ADMIN)
    pm2 = ProjectMembership(project_id=proj_a.id, user_id=manager_user.id, role=SystemRole.MANAGER)
    pm3 = ProjectMembership(project_id=proj_a.id, user_id=developer_user.id, role=SystemRole.DEVELOPER_TESTER)
    pm4 = ProjectMembership(project_id=proj_b.id, user_id=other_user.id, role=SystemRole.DEVELOPER_TESTER)
    db_session.add_all([pm1, pm2, pm3, pm4])

    # Estimation Settings
    est_a = ProjectEstimationSettings(project_id=proj_a.id)
    est_b = ProjectEstimationSettings(project_id=proj_b.id)
    db_session.add_all([est_a, est_b])

    await db_session.commit()

    return {
        "admin": admin_user,
        "manager": manager_user,
        "developer": developer_user,
        "other": other_user,
        "org": org,
        "other_org": other_org,
        "project_a": proj_a,
        "project_b": proj_b,
    }
