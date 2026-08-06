import uuid
from enum import Enum as PyEnum
from typing import Optional, List, Any, TYPE_CHECKING
from sqlalchemy import String, Text, Enum, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin
from app.core.permissions import SystemRole

if TYPE_CHECKING:
    from app.db.models.organization import Organization


class EstimationScheme(str, PyEnum):
    FIBONACCI = "FIBONACCI"
    TSHIRT = "TSHIRT"
    CUSTOM = "CUSTOM"


class Project(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("org_id", "key", name="uq_project_org_key"),)

    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="projects")
    memberships: Mapped[List["ProjectMembership"]] = relationship("ProjectMembership", back_populates="project", cascade="all, delete-orphan")
    estimation_settings: Mapped[Optional["ProjectEstimationSettings"]] = relationship("ProjectEstimationSettings", back_populates="project", uselist=False, cascade="all, delete-orphan")


class ProjectMembership(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "project_memberships"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_project_user"),)

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[SystemRole] = mapped_column(Enum(SystemRole, native_enum=False), default=SystemRole.DEVELOPER_TESTER, nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="memberships")
    user: Mapped["User"] = relationship("User", back_populates="project_memberships")


class ProjectEstimationSettings(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "project_estimation_settings"

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    scheme: Mapped[EstimationScheme] = mapped_column(Enum(EstimationScheme, native_enum=False), default=EstimationScheme.FIBONACCI, nullable=False)
    allowed_values: Mapped[List[str]] = mapped_column(JSON, default=lambda: ["1", "2", "3", "5", "8", "13", "21"], nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="estimation_settings")
