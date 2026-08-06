import uuid
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.db.models.session import AuthSession
    from app.db.models.organization import OrganizationMembership
    from app.db.models.project import ProjectMembership


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dark_mode_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    sessions: Mapped[List["AuthSession"]] = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")
    org_memberships: Mapped[List["OrganizationMembership"]] = relationship("OrganizationMembership", back_populates="user", cascade="all, delete-orphan")
    project_memberships: Mapped[List["ProjectMembership"]] = relationship("ProjectMembership", back_populates="user", cascade="all, delete-orphan")
