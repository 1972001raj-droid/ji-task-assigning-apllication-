import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_search_and_reports(client: AsyncClient, seed_data):
    login = await client.post("/api/v1/auth/login", json={"username_or_email": "manager_user", "password": "Password123!"})
    csrf = login.json()["csrf_token"]
    headers = {settings.CSRF_HEADER_NAME: csrf}
    proj_id = str(seed_data["project_a"].id)

    # Create test issues
    await client.post("/api/v1/issues", json={
        "project_id": proj_id,
        "issue_type": "EPIC",
        "title": "Searchable Core Engine",
        "description": "High performance search query engine"
    }, headers=headers)

    # 1. Search Issues
    search_resp = await client.get(f"/api/v1/search/issues?project_id={proj_id}&q=Searchable")
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert search_data["total"] >= 1
    assert "Searchable" in search_data["items"][0]["title"]

    # 2. Roadmap API
    roadmap_resp = await client.get(f"/api/v1/reports/roadmap?project_id={proj_id}")
    assert roadmap_resp.status_code == 200

    # 3. Timeline API
    timeline_resp = await client.get(f"/api/v1/reports/timeline?project_id={proj_id}")
    assert timeline_resp.status_code == 200

    # 4. Workload API
    workload_resp = await client.get(f"/api/v1/reports/workload?project_id={proj_id}")
    assert workload_resp.status_code == 200

    # 5. CSV Export Endpoint
    csv_resp = await client.get(f"/api/v1/reports/export/issues?project_id={proj_id}")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert "Title" in csv_resp.text
