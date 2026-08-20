import pytest
import pytest_asyncio
from httpx import AsyncClient
from app.core.config import settings
from app.db.models.user import UserStatus


@pytest.mark.asyncio
async def test_auth_me_and_password_change_flow(client: AsyncClient, seed_data):
    admin = seed_data["admin"]

    # 1. Login as Admin
    login_resp = await client.post("/api/v1/auth/login", json={
        "username_or_email": admin.username,
        "password": "Password123!"
    })
    assert login_resp.status_code == 200
    csrf_token = login_resp.json()["csrf_token"]
    assert "ADMIN" in login_resp.json()["user"]["roles"]

    # 2. Test GET /api/v1/auth/me
    me_resp = await client.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == admin.username
    assert "ADMIN" in me_data["roles"]

    # 3. Test Change Password with valid 12+ char password
    change_pass_resp = await client.post(
        "/api/v1/auth/change-password",
        headers={settings.CSRF_HEADER_NAME: csrf_token},
        json={
            "current_password": "Password123!",
            "new_password": "BrandNewSecurePassword123!"
        }
    )
    assert change_pass_resp.status_code == 200

    # 4. Old password should now fail login
    failed_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": admin.username,
        "password": "Password123!"
    })
    assert failed_login.status_code == 401

    # 5. New password should succeed
    success_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": admin.username,
        "password": "BrandNewSecurePassword123!"
    })
    assert success_login.status_code == 200


@pytest.mark.asyncio
async def test_invitation_and_activation_flow(client: AsyncClient, seed_data):
    manager = seed_data["manager"]
    org = seed_data["org"]
    proj_a = seed_data["project_a"]

    # 1. Manager logs in
    mgr_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": manager.username,
        "password": "Password123!"
    })
    assert mgr_login.status_code == 200
    mgr_csrf = mgr_login.json()["csrf_token"]

    # 2. Manager invites a new Developer
    invite_resp = await client.post(
        "/api/v1/users/invitations",
        headers={settings.CSRF_HEADER_NAME: mgr_csrf},
        json={
            "email": "invited_dev@example.com",
            "role": "DEVELOPER",
            "full_name": "Invited Dev",
            "org_id": str(org.id),
            "project_id": str(proj_a.id)
        }
    )
    assert invite_resp.status_code == 201
    invite_data = invite_resp.json()
    token = invite_data["invitation_token"]
    assert token is not None

    # 3. Invited user activates account with token
    activate_resp = await client.post(
        "/api/v1/auth/activate-account",
        json={
            "token": token,
            "new_password": "MySecretPassword123!",
            "full_name": "Invited Developer Activated"
        }
    )
    assert activate_resp.status_code == 200
    activated_user = activate_resp.json()
    assert activated_user["status"] == "ACTIVE"

    # 4. User can now log in
    dev_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "invited_dev@example.com",
        "password": "MySecretPassword123!"
    })
    assert dev_login.status_code == 200


@pytest.mark.asyncio
async def test_forgot_and_reset_password_flow(client: AsyncClient, seed_data):
    developer = seed_data["developer"]

    # 1. Forgot password request
    forgot_resp = await client.post(
        "/api/v1/auth/forgot-password",
        json={"identifier": developer.email}
    )
    assert forgot_resp.status_code == 200
    reset_token = forgot_resp.json().get("reset_token")

    if reset_token:
        # 2. Reset password using token
        reset_resp = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": reset_token,
                "new_password": "ResetPasswordBrandNew123!"
            }
        )
        assert reset_resp.status_code == 200

        # 3. Log in with reset password
        login_resp = await client.post("/api/v1/auth/login", json={
            "username_or_email": developer.email,
            "password": "ResetPasswordBrandNew123!"
        })
        assert login_resp.status_code == 200


@pytest.mark.asyncio
async def test_last_admin_protection_and_deactivation(client: AsyncClient, seed_data):
    admin = seed_data["admin"]
    developer = seed_data["developer"]

    admin_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": admin.username,
        "password": "Password123!"
    })
    assert admin_login.status_code == 200
    admin_csrf = admin_login.json()["csrf_token"]

    # 1. Attempt to deactivate last active admin -> should be rejected (422)
    deactivate_admin_resp = await client.patch(
        f"/api/v1/users/{admin.id}/status",
        headers={settings.CSRF_HEADER_NAME: admin_csrf},
        json={"status": "DEACTIVATED"}
    )
    assert deactivate_admin_resp.status_code in (400, 422)

    # 2. Deactivate developer account -> should succeed
    deact_dev_resp = await client.patch(
        f"/api/v1/users/{developer.id}/status",
        headers={settings.CSRF_HEADER_NAME: admin_csrf},
        json={"status": "DEACTIVATED"}
    )
    assert deact_dev_resp.status_code == 200
    assert deact_dev_resp.json()["status"] == "DEACTIVATED"

    # 3. Deactivated user cannot log in
    failed_dev_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": developer.username,
        "password": "Password123!"
    })
    assert failed_dev_login.status_code == 401
