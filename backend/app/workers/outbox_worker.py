import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.db.models.issue import Issue
from app.repositories.outbox_repository import OutboxRepository
from app.services.notification_service import NotificationService


class OutboxWorker:
    def __init__(self):
        self.running = False

    async def process_batch(self, session: AsyncSession) -> int:
        repo = OutboxRepository(session)
        notif_service = NotificationService(session)
        events = await repo.get_unprocessed(limit=20)

        processed_count = 0
        for event in events:
            if event.event_type == "ISSUE_STATUS_CHANGED":
                payload = event.payload
                actor_id = payload.get("actor_id")
                issue_id = payload.get("issue_id")
                if actor_id and issue_id:
                    # Fetch the issue title to avoid exposing raw UUID in notifications
                    stmt = select(Issue.title).where(Issue.id == uuid.UUID(issue_id))
                    res = await session.execute(stmt)
                    issue_title = res.scalar_one_or_none()

                    from_status = payload.get("from_status", "").replace("_", " ").title()
                    to_status = payload.get("to_status", "").replace("_", " ").title()

                    if issue_title:
                        msg = f"'{issue_title}' moved from {from_status} to {to_status}"
                    else:
                        msg = f"Issue moved from {from_status} to {to_status}"

                    await notif_service.dispatch(
                        user_id=actor_id,
                        event_type="STATUS_UPDATE",
                        title="Issue Status Updated",
                        message=msg,
                        payload=payload
                    )
            event.processed = True
            processed_count += 1

        if processed_count > 0:
            await session.commit()
        return processed_count

    async def run_once(self):
        async with AsyncSessionLocal() as session:
            return await self.process_batch(session)
