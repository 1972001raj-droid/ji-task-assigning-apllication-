import asyncio
import os
import sys
from sqlalchemy import select

# Ensure backend root directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.organization import Organization, OrganizationMembership
from app.core.security import hash_password
from app.core.permissions import SystemRole


async def main() -> None:
    username = os.getenv("BOOTSTRAP_ADMIN_USERNAME", "admin").strip()
    email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com").strip().lower()
    password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "AdminPassword123!")
    full_name = os.getenv("BOOTSTRAP_ADMIN_FULL_NAME", "System Administrator").strip()

    if not password:
        print("ERROR: BOOTSTRAP_ADMIN_PASSWORD must not be empty.")
        sys.exit(1)

    async with AsyncSessionLocal() as session:
        # Check if user already exists by email or username
        stmt = select(User).where((User.email == email) | (User.username == username))
        existing_user = (await session.execute(stmt)).scalars().first()

        if existing_user:
            print(f"Admin user '{username}' ({email}) already exists. Skipping bootstrap.")
            return

        # Create new Admin / Superuser
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

        # Create default organization for admin if none exists
        org_slug = f"{username}-workspace"
        org_stmt = select(Organization).where(Organization.slug == org_slug)
        existing_org = (await session.execute(org_stmt)).scalars().first()

        if not existing_org:
            existing_org = Organization(
                name=f"{full_name}'s Workspace",
                slug=org_slug,
            )
            session.add(existing_org)
            await session.flush()

        # Add Org Membership
        membership = OrganizationMembership(
            org_id=existing_org.id,
            user_id=admin_user.id,
            role=SystemRole.ADMIN,
        )
        session.add(membership)

        await session.commit()
        print(f"Successfully bootstrapped Admin user: {username} ({email})")


if __name__ == "__main__":
    asyncio.run(main())
