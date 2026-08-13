import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_cross_project_isolation(client: AsyncClient, seed_data):
    # Login as 'other_user' who is ONLY a member of Project Beta (proj_b)
    login_resp = await client.post("/api/v1/auth/login", json={
        "username_or_email": "other_user",
        "password": "Password123!"
    })
    assert login_resp.status_code == 200
    csrf_token = login_resp.json()["csrf_token"]

    proj_a_id = str(seed_data["project_a"].id)
    proj_b_id = str(seed_data["project_b"].id)

    # Attempting to search issues in Project A (which user is NOT a member of) must yield 404 (or 403)
    resp = await client.get(f"/api/v1/search/issues?project_id={proj_a_id}")
    assert resp.status_code in (403, 404)

    # Accessing Project B (which user IS a member of) succeeds
    resp_b = await client.get(f"/api/v1/search/issues?project_id={proj_b_id}")
    assert resp_b.status_code == 200


@pytest.mark.asyncio
async def test_project_delete_permissions(client: AsyncClient, seed_data):
    proj_a_id = str(seed_data["project_a"].id)

    # 1. Developer user attempts to delete Project A -> Expect 403 Forbidden
    login_dev = await client.post("/api/v1/auth/login", json={
        "username_or_email": "dev_user",
        "password": "Password123!"
    })
    assert login_dev.status_code == 200
    csrf_dev = login_dev.json()["csrf_token"]

    resp_dev = await client.delete(
        f"/api/v1/projects/{proj_a_id}",
        headers={settings.CSRF_HEADER_NAME: csrf_dev}
    )
    assert resp_dev.status_code == 403

    # 2. Manager user attempts to delete Project A -> Expect 204 No Content
    login_mgr = await client.post("/api/v1/auth/login", json={
        "username_or_email": "manager_user",
        "password": "Password123!"
    })
    assert login_mgr.status_code == 200
    csrf_mgr = login_mgr.json()["csrf_token"]

    resp_mgr = await client.delete(
        f"/api/v1/projects/{proj_a_id}",
        headers={settings.CSRF_HEADER_NAME: csrf_mgr}
    )
    assert resp_mgr.status_code == 204

