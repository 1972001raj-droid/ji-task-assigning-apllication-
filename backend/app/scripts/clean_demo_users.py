import asyncio
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import engine, AsyncSessionLocal
from app.db.base import Base
import app.db.models  # Ensure all models are registered
from app.db.models.user import User
from app.db.models.organization import Organization, OrganizationMembership
from app.core.security import hash_password
from app.core.permissions import SystemRole


async def main():
    username = os.getenv("BOOTSTRAP_ADMIN_USERNAME", "admin").strip()
    email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com").strip().lower()
    password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "AdminPassword123!")
    full_name = os.getenv("BOOTSTRAP_ADMIN_FULL_NAME", "System Administrator").strip()

    print("Re-creating database schema to wipe all predefined/demo logins...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Database schema successfully recreated.")

    async with AsyncSessionLocal() as session:
        # Bootstrap ONLY single Admin user
        admin_user = User(
            username=username,
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            is_active=True,
            is_superuser=True,
        )
        session.add(admin_user)
        await session.flush()

        # Create Admin's primary Organization
        org = Organization(
            name=f"{full_name}'s Organization",
            slug=f"{username}-org",
        )
        session.add(org)
        await session.flush()

        # Link Admin to Org
        org_mem = OrganizationMembership(
            org_id=org.id,
            user_id=admin_user.id,
            role=SystemRole.ADMIN,
        )
        session.add(org_mem)
        await session.commit()

        print(f"Successfully bootstrapped ONLY Admin account: '{username}' ({email})")
        print("Password: AdminPassword123!")
        print("All predefined/demo logins (manager, dev, etc.) have been completely removed.")


if __name__ == "__main__":
    asyncio.run(main())
