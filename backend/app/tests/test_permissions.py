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
