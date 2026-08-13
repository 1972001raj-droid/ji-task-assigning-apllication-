import uuid
from typing import List, TYPE_CHECKING
from sqlalchemy import String, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin
from app.core.permissions import SystemRole

if TYPE_CHECKING:
    from app.db.models.project import Project
    from app.db.models.user import User


class Organization(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)

    memberships: Mapped[List["OrganizationMembership"]] = relationship("OrganizationMembership", back_populates="organization", cascade="all, delete-orphan")
    projects: Mapped[List["Project"]] = relationship("Project", back_populates="organization", cascade="all, delete-orphan")


class OrganizationMembership(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "organization_memberships"
    __table_args__ = (UniqueConstraint("org_id", "user_id", name="uq_org_user"),)

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[SystemRole] = mapped_column(Enum(SystemRole, native_enum=False), default=SystemRole.DEVELOPER_TESTER, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="memberships")
    user: Mapped["User"] = relationship("User", back_populates="org_memberships")
