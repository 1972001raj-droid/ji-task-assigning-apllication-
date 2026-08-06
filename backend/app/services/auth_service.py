import uuid
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import verify_password, generate_session_token, generate_csrf_token, hash_token
from app.core.exceptions import AuthenticationException, NotFoundException
from app.db.models.user import User
from app.db.models.session import AuthSession
from app.repositories.user_repository import UserRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.audit_repository import AuditRepository


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.session_repo = SessionRepository(session)
        self.audit_repo = AuditRepository(session)

    async def authenticate_user(
        self,
        username_or_email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[User, str, str]:
        """Authenticate credentials and generate server-side session."""
        user = await self.user_repo.get_by_email_or_username(username_or_email)
        if not user or not user.is_active or not verify_password(password, user.hashed_password):
            # Log failed login attempt
            await self.audit_repo.log_audit(
                action="LOGIN_FAILED",
                resource_type="auth",
                details={"identifier": username_or_email},
                ip_address=ip_address
            )
            await self.session.commit()
            raise AuthenticationException("Invalid username/email or password")

        # Generate tokens
        raw_token, token_hash = generate_session_token()
        csrf_token = generate_csrf_token()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)

        auth_session = AuthSession(
            token_hash=token_hash,
            user_id=user.id,
            csrf_token=csrf_token,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent
        )
        await self.session_repo.create(auth_session)

        # Log successful login
        await self.audit_repo.log_audit(
            action="LOGIN_SUCCESS",
            resource_type="auth",
            user_id=user.id,
            details={"username": user.username},
            ip_address=ip_address
        )
        await self.session.commit()
        return user, raw_token, csrf_token

    async def get_user_from_raw_token(self, raw_token: str) -> Tuple[User, AuthSession]:
        token_hash = hash_token(raw_token)
        auth_session = await self.session_repo.get_by_token_hash(token_hash)
        if not auth_session:
            raise AuthenticationException("Invalid or expired session token")

        user = await self.user_repo.get(auth_session.user_id)
        if not user or not user.is_active:
            raise AuthenticationException("User account is inactive or disabled")

        return user, auth_session

    async def logout(self, raw_token: str) -> None:
        token_hash = hash_token(raw_token)
        auth_session = await self.session_repo.get_by_token_hash(token_hash)
        if auth_session:
            auth_session.is_revoked = True
            await self.audit_repo.log_audit(
                action="LOGOUT",
                resource_type="auth",
                user_id=auth_session.user_id
            )
            await self.session.commit()

    async def list_user_sessions(self, user_id: uuid.UUID, current_session_id: uuid.UUID) -> List[Tuple[AuthSession, bool]]:
        sessions = await self.session_repo.get_user_sessions(user_id)
        return [(s, s.id == current_session_id) for s in sessions]

    async def revoke_session(self, session_id: uuid.UUID, user_id: uuid.UUID) -> None:
        auth_session = await self.session_repo.get(session_id)
        if not auth_session or auth_session.user_id != user_id:
            raise NotFoundException("Session", session_id)
        auth_session.is_revoked = True
        await self.session.commit()
