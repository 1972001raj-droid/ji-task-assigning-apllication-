import hashlib
import hmac
import secrets
from typing import Tuple
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError

ph = PasswordHasher()


def hash_password(password: str) -> str:
    """Hash password using Argon2id."""
    return ph.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against Argon2id hash."""
    try:
        return ph.verify(hashed_password, password)
    except (VerifyMismatchError, VerificationError):
        return False


def generate_session_token() -> Tuple[str, str]:
    """Generate raw session token and its SHA256 hash for database storage."""
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_token(raw_token)
    return raw_token, token_hash


def hash_token(token: str) -> str:
    """Hash raw token with SHA256."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_csrf_token() -> str:
    """Generate cryptographically secure CSRF token."""
    return secrets.token_urlsafe(32)


def verify_csrf_token(header_token: str, expected_token: str) -> bool:
    """Constant time comparison of CSRF tokens."""
    if not header_token or not expected_token:
        return False
    return hmac.compare_digest(header_token, expected_token)
