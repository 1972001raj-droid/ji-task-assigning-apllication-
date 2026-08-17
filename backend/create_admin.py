"""
Bootstrap the first admin user and a default organization.

Usage (from the backend/ directory, with .venv activated):
    python create_admin.py

Environment variables (from .env):
    FIRST_ADMIN_USERNAME  – default: admin
    FIRST_ADMIN_EMAIL     – default: admin@example.com
    FIRST_ADMIN_PASSWORD  – required (or set via env)
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Allow running from the backend/ directory without installing the package.
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.organization import Organization, OrganizationMembership
from app.core.security import hash_password
from app.core.permissions import SystemRole


ADMIN_USERNAME = os.getenv("FIRST_ADMIN_USERNAME", "admin")
ADMIN_EMAIL = os.getenv("FIRST_ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.getenv("FIRST_ADMIN_PASSWORD", "")
ORG_NAME = os.getenv("DEFAULT_ORG_NAME", "My Organization")
ORG_SLUG = os.getenv("DEFAULT_ORG_SLUG", "my-org")


async def main() -> None:
    if not ADMIN_PASSWORD:
        print("ERROR: Set FIRST_ADMIN_PASSWORD environment variable before running this script.")
        sys.exit(1)

    async with AsyncSessionLocal() as session:
        # Check if admin already exists
        existing = (await session.execute(
            select(User).where(User.email == ADMIN_EMAIL.lower().strip())
        )).scalars().first()

        if existing:
            print(f"Admin user '{ADMIN_EMAIL}' already exists — skipping creation.")
        else:
            admin = User(
                username=ADMIN_USERNAME,
                email=ADMIN_EMAIL.lower().strip(),
                hashed_password=hash_password(ADMIN_PASSWORD),
                full_name="Administrator",
                is_active=True,
                is_superuser=True,
            )
            session.add(admin)
            await session.flush()

            # Create default org if not exists
            org = (await session.execute(
                select(Organization).where(Organization.slug == ORG_SLUG)
            )).scalars().first()

            if not org:
                org = Organization(name=ORG_NAME, slug=ORG_SLUG)
                session.add(org)
                await session.flush()
                print(f"Created organization: '{ORG_NAME}' (slug={ORG_SLUG})")

            # Link admin to org
            mem = OrganizationMembership(
                org_id=org.id,
                user_id=admin.id,
                role=SystemRole.ADMIN,
            )
            session.add(mem)
            await session.commit()
            print(f"Admin user created: username='{ADMIN_USERNAME}', email='{ADMIN_EMAIL}'")
            print("Login at POST /api/v1/auth/login")


if __name__ == "__main__":
    asyncio.run(main())
