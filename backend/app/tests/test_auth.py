import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_login_success_and_logout(client: AsyncClient, seed_data):
    # 1. Login with email
    resp = await client.post("/api/v1/auth/login", json={
        "username_or_email": "dev@example.com",
        "password": "Password123!"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "csrf_token" in data
    assert data["user"]["email"] == "dev@example.com"
    csrf_token = data["csrf_token"]
    assert settings.COOKIE_NAME in resp.cookies

    # 2. Get /me with session cookie
    me_resp = await client.get("/api/v1/me")
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == "dev_user"
    assert me_data["dashboard_route"] == "/dashboard/developer"

    # 3. Logout with CSRF header
    logout_resp = await client.post("/api/v1/auth/logout", headers={settings.CSRF_HEADER_NAME: csrf_token})
    assert logout_resp.status_code == 200

    # 4. Accessing /me after logout fails
    me_after = await client.get("/api/v1/me")
    assert me_after.status_code == 401


@pytest.mark.asyncio
async def test_login_by_username(client: AsyncClient, seed_data):
    resp = await client.post("/api/v1/auth/login", json={
        "username_or_email": "manager_user",
        "password": "Password123!"
    })
    assert resp.status_code == 200
    assert resp.json()["user"]["username"] == "manager_user"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient, seed_data):
    resp = await client.post("/api/v1/auth/login", json={
        "username_or_email": "dev@example.com",
        "password": "WrongPassword!"
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_csrf_protection(client: AsyncClient, seed_data):
    # Login
    login_resp = await client.post("/api/v1/auth/login", json={
        "username_or_email": "dev@example.com",
        "password": "Password123!"
    })
    assert login_resp.status_code == 200

    # State changing POST without CSRF header should fail (403)
    proj_id = str(seed_data["project_a"].id)
    fail_resp = await client.post("/api/v1/issues", json={
        "project_id": proj_id,
        "issue_type": "EPIC",
        "title": "CSRF Test Epic"
    })
    assert fail_resp.status_code == 403
