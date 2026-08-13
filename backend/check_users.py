import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    e = create_async_engine('postgresql+asyncpg://postgres:root@localhost:5432/jira_db')
    async with e.connect() as c:
        r = await c.execute(text('SELECT username, email, is_active, is_superuser FROM users LIMIT 10'))
        rows = r.fetchall()
        if not rows:
            print("NO USERS IN DATABASE")
        for row in rows:
            print(dict(row._mapping))

asyncio.run(run())
