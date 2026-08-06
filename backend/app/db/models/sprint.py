import uuid
from enum import Enum as PyEnum
from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Enum, ForeignKey, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.db.models.project import Project
    from app.db.models.user import User
    from app.db.models.issue import Issue


class SprintStatus(str, PyEnum):
    PLANNED = "PLANNED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class Sprint(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "sprints"

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    goal: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    status: Mapped[SprintStatus] = mapped_column(Enum(SprintStatus, native_enum=False), default=SprintStatus.PLANNED, nullable=False, index=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)

    project: Mapped["Project"] = relationship("Project")
    created_by: Mapped["User"] = relationship("User")
    assignments: Mapped[List["SprintIssueAssignment"]] = relationship("SprintIssueAssignment", back_populates="sprint", cascade="all, delete-orphan")


class SprintIssueAssignment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "sprint_issue_assignments"

    sprint_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    added_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    removed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    sprint: Mapped["Sprint"] = relationship("Sprint", back_populates="assignments")
    issue: Mapped["Issue"] = relationship("Issue", back_populates="sprint_assignments")
    added_by: Mapped["User"] = relationship("User")
