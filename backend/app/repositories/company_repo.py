import uuid
from typing import Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.company import CompanyPositionCache


class CompanyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_cache(self, company_name: str, position: str) -> Optional[CompanyPositionCache]:
        query = select(CompanyPositionCache).where(
            CompanyPositionCache.company_name_normalized == company_name.lower().strip(),
            CompanyPositionCache.position_normalized == position.lower().strip()
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_cache(self, company_name: str, position: str, research_data: dict) -> CompanyPositionCache:
        cache = CompanyPositionCache(
            company_name=company_name,
            company_name_normalized=company_name.lower().strip(),
            position=position,
            position_normalized=position.lower().strip(),
            research_data=research_data,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        self.db.add(cache)
        await self.db.commit()
        await self.db.refresh(cache)
        return cache

    async def update_cache(self, cache_id: uuid.UUID, research_data: dict) -> CompanyPositionCache:
        query = select(CompanyPositionCache).where(CompanyPositionCache.id == cache_id)
        result = await self.db.execute(query)
        cache = result.scalar_one_or_none()
        
        if cache:
            cache.research_data = research_data
            cache.last_updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(cache)
        return cache
