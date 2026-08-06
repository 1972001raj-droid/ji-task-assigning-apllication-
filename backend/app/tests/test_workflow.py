import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_workflow_propagation_rules_and_optimistic_locking(client: AsyncClient, seed_data):
    login = await client.post("/api/v1/auth/login", json={"username_or_email": "manager_user", "password": "Password123!"})
    csrf = login.json()["csrf_token"]
    headers = {settings.CSRF_HEADER_NAME: csrf}
    proj_id = str(seed_data["project_a"].id)

    # 1. Create Epic & Story
    epic = (await client.post("/api/v1/issues", json={"project_id": proj_id, "issue_type": "EPIC", "title": "Workflow Epic"}, headers=headers)).json()
    story = (await client.post("/api/v1/issues", json={"project_id": proj_id, "issue_type": "STORY", "title": "Workflow Story", "parent_issue_id": epic["id"]}, headers=headers)).json()
    
    # 2. Create two linked Tasks under Story (both in BACKLOG)
    task1 = (await client.post("/api/v1/issues", json={"project_id": proj_id, "issue_type": "TASK", "title": "Task 1", "parent_issue_id": story["id"]}, headers=headers)).json()
    task2 = (await client.post("/api/v1/issues", json={"project_id": proj_id, "issue_type": "TASK", "title": "Task 2", "parent_issue_id": story["id"]}, headers=headers)).json()

    # --- RULE 1: Story Backlog -> To Do (moves Story & linked tasks to To Do) ---
    t1_resp = await client.post(f"/api/v1/issues/{story['id']}/transition", json={
        "target_status": "TODO",
        "current_version": story["version"]
    }, headers=headers)
    assert t1_resp.status_code == 200
    updated_story = t1_resp.json()
    assert updated_story["status"] == "TODO"

    # Verify linked tasks moved to TODO
    t1_fetch = (await client.get(f"/api/v1/issues/{task1['id']}")).json()
    t2_fetch = (await client.get(f"/api/v1/issues/{task2['id']}")).json()
    assert t1_fetch["status"] == "TODO"
    assert t2_fetch["status"] == "TODO"

    # --- RULE 2: Story To Do -> In Progress ---
    t2_resp = await client.post(f"/api/v1/issues/{story['id']}/transition", json={
        "target_status": "IN_PROGRESS",
        "current_version": updated_story["version"]
    }, headers=headers)
    assert t2_resp.status_code == 200
    story_inp = t2_resp.json()
    assert story_inp["status"] == "IN_PROGRESS"

    # --- RULE 3: Story In Progress -> Review BLOCKED because tasks are still in TODO ---
    t3_block = await client.post(f"/api/v1/issues/{story['id']}/transition", json={
        "target_status": "REVIEW",
        "current_version": story_inp["version"]
    }, headers=headers)
    assert t3_block.status_code == 422

    # Move task1 & task2 to REVIEW
    # First task1 -> IN_PROGRESS
    t1_inp = (await client.post(f"/api/v1/issues/{task1['id']}/transition", json={"target_status": "IN_PROGRESS", "current_version": t1_fetch["version"]}, headers=headers)).json()
    # task1 -> REVIEW
    t1_rev = (await client.post(f"/api/v1/issues/{task1['id']}/transition", json={"target_status": "REVIEW", "current_version": t1_inp["version"]}, headers=headers)).json()
    # task2 -> REVIEW
    t2_rev = (await client.post(f"/api/v1/issues/{task2['id']}/transition", json={"target_status": "REVIEW", "current_version": t2_fetch["version"]}, headers=headers)).json()

    # Now Story In Progress -> Review SUCCEEDS because all linked tasks are in REVIEW
    t3_pass = await client.post(f"/api/v1/issues/{story['id']}/transition", json={
        "target_status": "REVIEW",
        "current_version": story_inp["version"]
    }, headers=headers)
    assert t3_pass.status_code == 200
    story_rev = t3_pass.json()
    assert story_rev["status"] == "REVIEW"

    # --- RULE 4: Story Review -> Done requires tasks DONE and AC complete ---
    # Add Acceptance Criteria to Story
    ac_resp = await client.post(f"/api/v1/issues/{story['id']}/acceptance-criteria", json={
        "description": "Must pass integration tests"
    }, headers=headers)
    assert ac_resp.status_code == 201
    ac_id = ac_resp.json()["id"]

    # Transitioning Story to DONE fails because tasks are not DONE and AC not completed
    t4_block = await client.post(f"/api/v1/issues/{story['id']}/transition", json={
        "target_status": "DONE",
        "current_version": story_rev["version"]
    }, headers=headers)
    assert t4_block.status_code == 422

    # Complete AC
    await client.patch(f"/api/v1/acceptance-criteria/{ac_id}", json={"is_completed": True}, headers=headers)

    # Move task1 and task2 to DONE
    t1_done = (await client.post(f"/api/v1/issues/{task1['id']}/transition", json={"target_status": "DONE", "current_version": t1_rev["version"]}, headers=headers)).json()
    t2_done = (await client.post(f"/api/v1/issues/{task2['id']}/transition", json={"target_status": "DONE", "current_version": t2_rev["version"]}, headers=headers)).json()

    # Now Story Review -> Done SUCCEEDS
    t4_pass = await client.post(f"/api/v1/issues/{story['id']}/transition", json={
        "target_status": "DONE",
        "current_version": story_rev["version"]
    }, headers=headers)
    assert t4_pass.status_code == 200
    assert t4_pass.json()["status"] == "DONE"

    # --- OPTIMISTIC LOCKING TEST ---
    # Attempting a transition with stale version (e.g. version 1) returns 409 Conflict
    stale_conflict = await client.post(f"/api/v1/issues/{story['id']}/transition", json={
        "target_status": "TODO",
        "current_version": 1
    }, headers=headers)
    assert stale_conflict.status_code == 409
