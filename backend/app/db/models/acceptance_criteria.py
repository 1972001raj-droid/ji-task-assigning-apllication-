import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Boolean, ForeignKey, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.db.models.issue import Issue
    from app.db.models.user import User


class AcceptanceCriteria(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "acceptance_criteria"

    story_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    story: Mapped["Issue"] = relationship("Issue", back_populates="acceptance_criteria")
    completed_by: Mapped[Optional["User"]] = relationship("User")
