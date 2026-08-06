import uuid
from typing import List
from fastapi import APIRouter, Depends, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.db.session import get_async_session
from app.db.models.user import User
from app.db.models.session import AuthSession
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse, SessionResponse
from app.services.auth_service import AuthService
from app.api.dependencies import get_current_user_and_session, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


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
    roles = [m.role for m in user.project_memberships] if user.project_memberships else []
    user_resp.roles = roles
    
    if user.is_superuser:
        user_resp.dashboard_route = "/dashboard/admin"
    elif any(r == "MANAGER" for r in roles):
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
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    auth_service = AuthService(session)
    await auth_service.revoke_session(session_id, user.id)
    return {"message": "Session revoked successfully"}
