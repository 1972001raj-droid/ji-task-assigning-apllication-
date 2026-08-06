from typing import Any, Optional, Dict
from fastapi import status


class AppException(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Any] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class NotFoundException(AppException):
    def __init__(self, resource: str = "Resource", identifier: Optional[Any] = None):
        msg = f"{resource} not found"
        if identifier:
            msg = f"{resource} with id '{identifier}' not found"
        super().__init__(message=msg, status_code=status.HTTP_404_NOT_FOUND)


class PermissionDeniedException(AppException):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN)


class AuthenticationException(AppException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED)


class VersionConflictException(AppException):
    def __init__(self, message: str = "Optimistic locking failure. Resource was modified by another transaction."):
        super().__init__(message=message, status_code=status.HTTP_409_CONFLICT)


class InvalidTransitionException(AppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, details=details)


class ValidationException(AppException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, details=details)


class RateLimitException(AppException):
    def __init__(self, message: str = "Rate limit exceeded. Please try again later."):
        super().__init__(message=message, status_code=status.HTTP_429_TOO_MANY_REQUESTS)
