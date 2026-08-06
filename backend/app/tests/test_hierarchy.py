import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_valid_hierarchy(client: AsyncClient, seed_data):
    login = await client.post("/api/v1/auth/login", json={"username_or_email": "manager_user", "password": "Password123!"})
    csrf = login.json()["csrf_token"]
    headers = {settings.CSRF_HEADER_NAME: csrf}
    proj_id = str(seed_data["project_a"].id)

    # 1. Create Epic
    epic_resp = await client.post("/api/v1/issues", json={
        "project_id": proj_id,
        "issue_type": "EPIC",
        "title": "Alpha Platform Redesign"
    }, headers=headers)
    assert epic_resp.status_code == 201
    epic_id = epic_resp.json()["id"]

    # 2. Create Story under Epic
    story_resp = await client.post("/api/v1/issues", json={
        "project_id": proj_id,
        "issue_type": "STORY",
        "title": "User Profile Page",
        "parent_issue_id": epic_id,
        "estimate": "5"
    }, headers=headers)
    assert story_resp.status_code == 201
    story_id = story_resp.json()["id"]
    assert story_resp.json()["effective_epic_id"] == epic_id

    # 3. Create Task under Story
    task_resp = await client.post("/api/v1/issues", json={
        "project_id": proj_id,
        "issue_type": "TASK",
        "title": "Build avatar upload UI",
        "parent_issue_id": story_id
    }, headers=headers)
    assert task_resp.status_code == 201
    assert task_resp.json()["effective_epic_id"] == epic_id

    # 4. Create Bug under Story
    bug_resp = await client.post("/api/v1/issues", json={
        "project_id": proj_id,
        "issue_type": "BUG",
        "title": "Fix avatar crop bug",
        "parent_issue_id": story_id
    }, headers=headers)
    assert bug_resp.status_code == 201

    # 5. Create Subtask under Task
    subtask_resp = await client.post("/api/v1/issues", json={
        "project_id": proj_id,
        "issue_type": "SUBTASK",
        "title": "Write image compression unit tests",
        "parent_issue_id": task_resp.json()["id"]
    }, headers=headers)
    assert subtask_resp.status_code == 201


@pytest.mark.asyncio
async def test_invalid_parent_type_rejected(client: AsyncClient, seed_data):
    login = await client.post("/api/v1/auth/login", json={"username_or_email": "manager_user", "password": "Password123!"})
    csrf = login.json()["csrf_token"]
    headers = {settings.CSRF_HEADER_NAME: csrf}
    proj_id = str(seed_data["project_a"].id)

    # Create Epic
    epic_resp = await client.post("/api/v1/issues", json={
        "project_id": proj_id,
        "issue_type": "EPIC",
        "title": "Parent Epic"
    }, headers=headers)
    epic_id = epic_resp.json()["id"]

    # Attempting to make Epic a child of another Epic fails (422)
    invalid_epic = await client.post("/api/v1/issues", json={
        "project_id": proj_id,
        "issue_type": "EPIC",
        "title": "Child Epic",
        "parent_issue_id": epic_id
    }, headers=headers)
    assert invalid_epic.status_code == 422


@pytest.mark.asyncio
async def test_estimation_scheme_validation(client: AsyncClient, seed_data):
    login = await client.post("/api/v1/auth/login", json={"username_or_email": "manager_user", "password": "Password123!"})
    csrf = login.json()["csrf_token"]
    headers = {settings.CSRF_HEADER_NAME: csrf}
    proj_id = str(seed_data["project_a"].id)

    # Valid Fibonacci estimate (5)
    valid_est = await client.post("/api/v1/issues", json={
        "project_id": proj_id,
        "issue_type": "STORY",
        "title": "Fib Story",
        "estimate": "5"
    }, headers=headers)
    assert valid_est.status_code == 201

    # Invalid estimate not in allowed values (99)
    invalid_est = await client.post("/api/v1/issues", json={
        "project_id": proj_id,
        "issue_type": "STORY",
        "title": "Invalid Est Story",
        "estimate": "99"
    }, headers=headers)
    assert invalid_est.status_code == 422
