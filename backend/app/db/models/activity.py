import uuid
from typing import Any, Dict
from sqlalchemy import String, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin


class ActivityEvent(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "activity_events"

    issue_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    issue: Mapped["Issue"] = relationship("Issue")
    user: Mapped["User"] = relationship("User")
