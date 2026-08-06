from typing import Any, Dict
from sqlalchemy import String, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, UUIDMixin, TimestampMixin


class OutboxEvent(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "outbox_events"

    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
