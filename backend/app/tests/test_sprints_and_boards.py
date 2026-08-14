import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_sprints_and_boards(client: AsyncClient, seed_data):
    login = await client.post("/api/v1/auth/login", json={"username_or_email": "manager_user", "password": "Password123!"})
    csrf = login.json()["csrf_token"]
    headers = {settings.CSRF_HEADER_NAME: csrf}
    proj_id = str(seed_data["project_a"].id)

    # 1. Create Sprint
    now = datetime.now(timezone.utc)
    sprint_resp = await client.post("/api/v1/sprints", json={
        "project_id": proj_id,
        "name": "Sprint 1",
        "goal": "Deliver MVP backend",
        "start_date": now.isoformat(),
        "due_date": (now + timedelta(days=14)).isoformat()
    }, headers=headers)
    assert sprint_resp.status_code == 201
    sprint_id = sprint_resp.json()["id"]

    # 2. Create Epic, Story & Task
    epic = (await client.post("/api/v1/issues", json={"project_id": proj_id, "issue_type": "EPIC", "title": "Sprint Epic"}, headers=headers)).json()
    story = (await client.post("/api/v1/issues", json={"project_id": proj_id, "issue_type": "STORY", "title": "Sprint Story", "parent_issue_id": epic["id"]}, headers=headers)).json()
    task = (await client.post("/api/v1/issues", json={"project_id": proj_id, "issue_type": "TASK", "title": "Sprint Task", "parent_issue_id": story["id"]}, headers=headers)).json()


    # 3. Add Task to Sprint (FR-18: automatically includes parent Story)
    add_resp = await client.post(f"/api/v1/sprints/{sprint_id}/issues", json={"issue_id": task["id"]}, headers=headers)
    assert add_resp.status_code == 200
    assigned_ids = add_resp.json()
    assert task["id"] in assigned_ids
    assert story["id"] in assigned_ids

    # 4. Get Board for Sprint
    board_resp = await client.get(f"/api/v1/boards?project_id={proj_id}&sprint_id={sprint_id}")
    assert board_resp.status_code == 200
    board_data = board_resp.json()
    assert len(board_data["columns"]) == 5
