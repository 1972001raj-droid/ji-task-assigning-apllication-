import uuid
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional, List
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import verify_password, hash_password, generate_session_token, generate_csrf_token, hash_token
from app.core.exceptions import AuthenticationException, NotFoundException, ValidationException, AppException
from app.db.models.user import User, UserStatus
from app.db.models.session import AuthSession
from app.db.models.token import AccountToken, TokenType
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
        
        # Check active status
        if not user or not user.is_active or user.status != UserStatus.ACTIVE or not verify_password(password, user.hashed_password):
            # Log failed login attempt
            await self.audit_repo.log_audit(
                action="LOGIN_FAILED",
                resource_type="auth",
                details={"identifier": username_or_email},
                ip_address=ip_address
            )
            await self.session.commit()
            raise AuthenticationException("Invalid username/email or password")

        # Update last_login_at
        user.last_login_at = datetime.now(timezone.utc)

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
        if not user or not user.is_active or user.status != UserStatus.ACTIVE:
            raise AuthenticationException("User account is inactive, suspended, or deactivated")

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

    async def revoke_all_user_sessions(self, user_id: uuid.UUID) -> None:
        """Revoke all active sessions for a user (e.g. after password change or deactivation)."""
        await self.session.execute(
            update(AuthSession).where(AuthSession.user_id == user_id).values(is_revoked=True)
        )
        await self.session.commit()

    async def change_password(self, user_id: uuid.UUID, current_password: str, new_password: str) -> None:
        """Change current user's password with validation."""
        user = await self.user_repo.get(user_id)
        if not user:
            raise NotFoundException("User", user_id)
        if not verify_password(current_password, user.hashed_password):
            raise ValidationException("Current password does not match.")
        if len(new_password) < 12:
            raise ValidationException("New password must be at least 12 characters.")

        user.hashed_password = hash_password(new_password)
        user.must_change_password = False
        await self.session.flush()

        # Revoke all existing sessions
        await self.revoke_all_user_sessions(user_id)

        await self.audit_repo.log_audit(
            action="PASSWORD_CHANGED",
            resource_type="auth",
            user_id=user_id
        )
        await self.session.commit()

    async def create_password_reset_token(self, identifier: str) -> Optional[str]:
        """Create secure single-use password reset token."""
        user = await self.user_repo.get_by_email_or_username(identifier)
        if not user or not user.is_active or user.status == UserStatus.DEACTIVATED:
            return None  # Return None silently to avoid account enumeration

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=2)

        token_obj = AccountToken(
            user_id=user.id,
            token_hash=token_hash,
            token_type=TokenType.PASSWORD_RESET,
            expires_at=expires_at,
            is_used=False
        )
        self.session.add(token_obj)
        await self.audit_repo.log_audit(
            action="PASSWORD_RESET_REQUESTED",
            resource_type="auth",
            user_id=user.id
        )
        await self.session.commit()
        return raw_token

    async def reset_password_with_token(self, raw_token: str, new_password: str) -> None:
        """Reset password using a valid reset token."""
        if len(new_password) < 12:
            raise ValidationException("Password must be at least 12 characters.")

        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        stmt = select(AccountToken).where(
            AccountToken.token_hash == token_hash,
            AccountToken.token_type == TokenType.PASSWORD_RESET,
            AccountToken.is_used == False,
            AccountToken.expires_at > datetime.now(timezone.utc)
        )
        token_obj = (await self.session.execute(stmt)).scalars().first()
        if not token_obj:
            raise ValidationException("Invalid or expired password reset link.")

        user = await self.user_repo.get(token_obj.user_id)
        if not user:
            raise NotFoundException("User", token_obj.user_id)

        user.hashed_password = hash_password(new_password)
        user.must_change_password = False
        token_obj.is_used = True
        await self.session.flush()

        await self.revoke_all_user_sessions(user.id)
        await self.audit_repo.log_audit(
            action="PASSWORD_RESET_COMPLETED",
            resource_type="auth",
            user_id=user.id
        )
        await self.session.commit()

    async def create_invitation_token(self, user_id: uuid.UUID) -> str:
        """Create secure single-use invitation token."""
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=48)

        token_obj = AccountToken(
            user_id=user_id,
            token_hash=token_hash,
            token_type=TokenType.INVITATION,
            expires_at=expires_at,
            is_used=False
        )
        self.session.add(token_obj)
        await self.session.commit()
        return raw_token

    async def activate_account_with_token(self, raw_token: str, password: str, full_name: Optional[str] = None) -> User:
        """Activate account using an invitation token."""
        if len(password) < 12:
            raise ValidationException("Password must be at least 12 characters.")

        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        stmt = select(AccountToken).where(
            AccountToken.token_hash == token_hash,
            AccountToken.token_type == TokenType.INVITATION,
            AccountToken.is_used == False,
            AccountToken.expires_at > datetime.now(timezone.utc)
        )
        token_obj = (await self.session.execute(stmt)).scalars().first()
        if not token_obj:
            raise ValidationException("Invalid or expired invitation link.")

        user = await self.user_repo.get(token_obj.user_id)
        if not user:
            raise NotFoundException("User", token_obj.user_id)

        user.hashed_password = hash_password(password)
        user.status = UserStatus.ACTIVE
        user.is_active = True
        user.must_change_password = False
        if full_name:
            user.full_name = full_name.strip()

        token_obj.is_used = True
        await self.session.flush()

        await self.audit_repo.log_audit(
            action="ACCOUNT_ACTIVATED",
            resource_type="auth",
            user_id=user.id
        )
        await self.session.commit()
        return user
