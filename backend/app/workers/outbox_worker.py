import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
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
                if actor_id:
                    await notif_service.dispatch(
                        user_id=actor_id,
                        event_type="STATUS_UPDATE",
                        title="Issue Status Updated",
                        message=f"Issue {payload.get('issue_id')} moved from {payload.get('from_status')} to {payload.get('to_status')}",
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
