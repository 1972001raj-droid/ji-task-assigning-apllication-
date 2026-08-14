"""Reset admin password to a known value."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.security import hash_password

NEW_PASSWORD = "Admin123!"


async def reset():
    e = create_async_engine("postgresql+asyncpg://postgres:root@localhost:5432/jira_db")
    new_hash = hash_password(NEW_PASSWORD)
    async with e.connect() as c:
        await c.execute(
            text("UPDATE users SET hashed_password = :h WHERE username = :u"),
            {"h": new_hash, "u": "admin"},
        )
        await c.commit()
        print(f"Password reset to: {NEW_PASSWORD}")
    await e.dispose()


if __name__ == "__main__":
    asyncio.run(reset())
