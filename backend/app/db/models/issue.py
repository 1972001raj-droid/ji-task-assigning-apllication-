import uuid
from enum import Enum as PyEnum
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Enum, ForeignKey, Float, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.db.models.user import User


class IssueType(str, PyEnum):
    EPIC = "EPIC"
    STORY = "STORY"
    TASK = "TASK"
    BUG = "BUG"
    SUBTASK = "SUBTASK"


class IssueStatus(str, PyEnum):
    BACKLOG = "BACKLOG"
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    DONE = "DONE"


class IssuePriority(str, PyEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class Issue(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "issues"

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_type: Mapped[IssueType] = mapped_column(Enum(IssueType, native_enum=False), nullable=False, index=True)
    status: Mapped[IssueStatus] = mapped_column(Enum(IssueStatus, native_enum=False), default=IssueStatus.BACKLOG, nullable=False, index=True)
    parent_issue_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("issues.id", ondelete="SET NULL"), nullable=True, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[IssuePriority] = mapped_column(Enum(IssuePriority, native_enum=False), default=IssuePriority.MEDIUM, nullable=False)
    estimate: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    reporter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)

    position: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    parent_issue: Mapped[Optional["Issue"]] = relationship("Issue", remote_side="Issue.id", back_populates="child_issues")
    child_issues: Mapped[List["Issue"]] = relationship("Issue", back_populates="parent_issue", cascade="all, delete-orphan")

    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assignee_id])
    reporter: Mapped["User"] = relationship("User", foreign_keys=[reporter_id])

    acceptance_criteria: Mapped[List["AcceptanceCriteria"]] = relationship("AcceptanceCriteria", back_populates="story", cascade="all, delete-orphan")
    comments: Mapped[List["IssueComment"]] = relationship("IssueComment", back_populates="issue", cascade="all, delete-orphan")
    sprint_assignments: Mapped[List["SprintIssueAssignment"]] = relationship("SprintIssueAssignment", back_populates="issue", cascade="all, delete-orphan")
