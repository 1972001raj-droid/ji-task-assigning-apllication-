import uuid
from typing import List
from fastapi import APIRouter, Depends, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.db.session import get_async_session
from app.db.models.user import User
from app.db.models.session import AuthSession
from app.schemas.auth import (
    LoginRequest, LoginResponse, UserResponse, SessionResponse,
    ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest,
    ActivateAccountRequest
)
from app.services.auth_service import AuthService
from app.api.dependencies import get_current_user_and_session, get_current_user
from sqlalchemy import select
from app.db.models.project import ProjectMembership
from app.db.models.organization import OrganizationMembership

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def _resolve_user_roles(user: User, session: AsyncSession) -> List[str]:
    """Helper to query project and organization memberships explicitly to avoid async lazy load errors."""
    pm_res = await session.execute(select(ProjectMembership.role).where(ProjectMembership.user_id == user.id))
    om_res = await session.execute(select(OrganizationMembership.role).where(OrganizationMembership.user_id == user.id))
    roles = list({str(getattr(r[0], 'value', r[0])).upper() for r in pm_res.fetchall()} | {str(getattr(r[0], 'value', r[0])).upper() for r in om_res.fetchall()})
    if user.is_superuser and "ADMIN" not in roles:
        roles.append("ADMIN")
    return roles


@router.post("/login", response_model=LoginResponse)
async def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_async_session)
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    auth_service = AuthService(session)
    user, raw_token, csrf_token = await auth_service.authenticate_user(
        data.username_or_email,
        data.password,
        ip_address=ip_address,
        user_agent=user_agent
    )

    # Set HttpOnly, Secure, SameSite cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.SESSION_EXPIRE_HOURS * 3600
    )

    user_resp = UserResponse.model_validate(user)
    roles = await _resolve_user_roles(user, session)
    user_resp.roles = roles
    
    if user.is_superuser or "ADMIN" in roles:
        user_resp.dashboard_route = "/dashboard/admin"
    elif "MANAGER" in roles:
        user_resp.dashboard_route = "/dashboard/manager"
    else:
        user_resp.dashboard_route = "/dashboard/developer"

    return LoginResponse(
        user=user_resp,
        csrf_token=csrf_token,
        message="Login successful"
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    user_and_session: tuple[User, AuthSession] = Depends(get_current_user_and_session),
    session: AsyncSession = Depends(get_async_session)
):
    token = request.cookies.get(settings.COOKIE_NAME)
    if token:
        auth_service = AuthService(session)
        await auth_service.logout(token)

    response.delete_cookie(key=settings.COOKIE_NAME)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Retrieve profile and roles of the currently authenticated user."""
    user_resp = UserResponse.model_validate(current_user)
    roles = await _resolve_user_roles(current_user, session)
    user_resp.roles = roles

    if current_user.is_superuser or "ADMIN" in roles:
        user_resp.dashboard_route = "/dashboard/admin"
    elif "MANAGER" in roles:
        user_resp.dashboard_route = "/dashboard/manager"
    else:
        user_resp.dashboard_route = "/dashboard/developer"

    return user_resp


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Change authenticated user's password."""
    auth_service = AuthService(session)
    await auth_service.change_password(current_user.id, data.current_password, data.new_password)
    return {"message": "Password changed successfully. All other active sessions have been revoked."}


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """Request a password reset token. Always returns a generic response."""
    auth_service = AuthService(session)
    raw_token = await auth_service.create_password_reset_token(data.identifier.strip())
    # In production with email provider, this sends the link to user's email.
    return {
        "message": "If the account exists and is active, a password reset link has been dispatched.",
        # Provide token in response for testing/development if needed
        "reset_token": raw_token if settings.ENVIRONMENT == "development" else None
    }


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """Reset password using a secure token."""
    auth_service = AuthService(session)
    await auth_service.reset_password_with_token(data.token.strip(), data.new_password)
    return {"message": "Password reset successfully. You may now log in with your new password."}


@router.post("/activate-account", response_model=UserResponse)
async def activate_account(
    data: ActivateAccountRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """Activate account using an invitation token."""
    auth_service = AuthService(session)
    user = await auth_service.activate_account_with_token(data.token.strip(), data.new_password, data.full_name)
    user_resp = UserResponse.model_validate(user)
    roles = await _resolve_user_roles(user, session)
    user_resp.roles = roles
    return user_resp


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    user_and_session: tuple[User, AuthSession] = Depends(get_current_user_and_session),
    session: AsyncSession = Depends(get_async_session)
):
    user, current_auth_session = user_and_session
    auth_service = AuthService(session)
    sessions_with_flag = await auth_service.list_user_sessions(user.id, current_auth_session.id)
    
    res = []
    for sess, is_curr in sessions_with_flag:
        resp = SessionResponse.model_validate(sess)
        resp.is_current = is_curr
        res.append(resp)
    return res


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: uuid.UUID,
    user_and_session: tuple[User, AuthSession] = Depends(get_current_user_and_session),
    session: AsyncSession = Depends(get_async_session)
):
    user, _ = user_and_session
    auth_service = AuthService(session)
    await auth_service.revoke_session(session_id, user.id)
    return {"message": "Session revoked successfully"}
