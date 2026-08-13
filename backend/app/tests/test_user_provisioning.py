import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.core.permissions import SystemRole


@pytest.mark.asyncio
async def test_user_provisioning_flow(client: AsyncClient, seed_data):
    admin = seed_data["admin"]
    manager = seed_data["manager"]
    developer = seed_data["developer"]
    org = seed_data["org"]
    proj_a = seed_data["project_a"]

    # 1. Admin login & provision Manager
    admin_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": admin.username,
        "password": "Password123!"
    })
    assert admin_login.status_code == 200
    admin_csrf = admin_login.json()["csrf_token"]

    prov_mgr_resp = await client.post(
        "/api/v1/users/provision",
        headers={settings.CSRF_HEADER_NAME: admin_csrf},
        json={
            "username": "new_manager_1",
            "email": "new_mgr1@example.com",
            "password": "SecurePassword123!",
            "full_name": "New Manager",
            "role": "MANAGER",
            "org_id": str(org.id),
            "project_id": str(proj_a.id)
        }
    )
    assert prov_mgr_resp.status_code == 201
    mgr_data = prov_mgr_resp.json()
    assert mgr_data["username"] == "new_manager_1"
    assert "password" not in mgr_data
    assert "hashed_password" not in mgr_data

    # 2. Manager login & provision Developer/Tester
    mgr_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": manager.username,
        "password": "Password123!"
    })
    assert mgr_login.status_code == 200
    mgr_csrf = mgr_login.json()["csrf_token"]

    prov_dev_resp = await client.post(
        "/api/v1/users/provision",
        headers={settings.CSRF_HEADER_NAME: mgr_csrf},
        json={
            "username": "new_dev_1",
            "email": "new_dev1@example.com",
            "password": "SecurePassword123!",
            "full_name": "New Developer",
            "role": "DEVELOPER_TESTER",
            "org_id": str(org.id),
            "project_id": str(proj_a.id)
        }
    )
    assert prov_dev_resp.status_code == 201
    dev_data = prov_dev_resp.json()
    assert dev_data["username"] == "new_dev_1"

    # 3. Manager tries to provision another Manager -> 403 Forbidden
    denied_mgr_resp = await client.post(
        "/api/v1/users/provision",
        headers={settings.CSRF_HEADER_NAME: mgr_csrf},
        json={
            "username": "illegal_mgr",
            "email": "illegal_mgr@example.com",
            "password": "SecurePassword123!",
            "full_name": "Illegal Manager",
            "role": "MANAGER",
            "org_id": str(org.id),
            "project_id": str(proj_a.id)
        }
    )
    assert denied_mgr_resp.status_code == 403

    # 4. Developer login & tries to provision user -> 403 Forbidden
    dev_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": developer.username,
        "password": "Password123!"
    })
    assert dev_login.status_code == 200
    dev_csrf = dev_login.json()["csrf_token"]

    denied_dev_resp = await client.post(
        "/api/v1/users/provision",
        headers={settings.CSRF_HEADER_NAME: dev_csrf},
        json={
            "username": "dev_illegal",
            "email": "dev_illegal@example.com",
            "password": "SecurePassword123!",
            "full_name": "Dev Illegal",
            "role": "DEVELOPER_TESTER",
            "org_id": str(org.id),
            "project_id": str(proj_a.id)
        }
    )
    assert denied_dev_resp.status_code == 403

    # 5. GET /api/v1/users/assignable -> Should return DEVELOPER_TESTER users for project_a
    assignable_resp = await client.get(f"/api/v1/users/assignable?project_id={proj_a.id}")
    assert assignable_resp.status_code == 200
    assignable_list = assignable_resp.json()
    assignable_usernames = [u["username"] for u in assignable_list]
    assert developer.username in assignable_usernames
    assert "new_dev_1" in assignable_usernames
    assert admin.username not in assignable_usernames
    assert manager.username not in assignable_usernames
