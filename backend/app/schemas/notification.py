import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    event_type: str
    title: str
    message: str
    payload: Optional[Dict[str, Any]] = None
    is_read: bool
    created_at: datetime
