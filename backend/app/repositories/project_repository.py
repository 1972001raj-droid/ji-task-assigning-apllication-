import uuid
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.project import Project, ProjectMembership, ProjectEstimationSettings
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    def __init__(self, session: AsyncSession):
        super().__init__(Project, session)

    async def get_by_key(self, org_id: uuid.UUID, key: str) -> Optional[Project]:
        stmt = select(Project).where(Project.org_id == org_id, Project.key == key.upper())
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def get_membership(self, project_id: uuid.UUID, user_id: uuid.UUID) -> Optional[ProjectMembership]:
        stmt = select(ProjectMembership).where(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == user_id
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def list_user_projects(self, user_id: uuid.UUID) -> List[Project]:
        stmt = select(Project).join(ProjectMembership).where(ProjectMembership.user_id == user_id)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def get_estimation_settings(self, project_id: uuid.UUID) -> Optional[ProjectEstimationSettings]:
        stmt = select(ProjectEstimationSettings).where(ProjectEstimationSettings.project_id == project_id)
        res = await self.session.execute(stmt)
        return res.scalars().first()
