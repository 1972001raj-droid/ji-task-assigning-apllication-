import uuid
from typing import TYPE_CHECKING
from sqlalchemy import Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.db.models.issue import Issue
    from app.db.models.user import User


class IssueComment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "issue_comments"

    issue_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    issue: Mapped["Issue"] = relationship("Issue", back_populates="comments")
    author: Mapped["User"] = relationship("User")
