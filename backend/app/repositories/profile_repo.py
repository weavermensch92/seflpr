import uuid
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import PersonalProfile, ProfileType
from app.core.encryption import encrypt, decrypt


class ProfileRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _decrypt(self, profile: PersonalProfile) -> PersonalProfile:
        if profile.description_encrypted:
            profile._description_plain = decrypt(profile.description_encrypted)
        else:
            profile._description_plain = None
        return profile

    async def list_by_user(self, user_id: str | uuid.UUID) -> list[PersonalProfile]:
        result = await self.db.execute(
            select(PersonalProfile)
            .where(PersonalProfile.user_id == user_id)
            .order_by(PersonalProfile.profile_type, PersonalProfile.sort_order)
        )
        profiles = result.scalars().all()
        return [self._decrypt(p) for p in profiles]

    async def get(self, profile_id: str | uuid.UUID, user_id: str | uuid.UUID) -> PersonalProfile | None:
        result = await self.db.execute(
            select(PersonalProfile).where(
                PersonalProfile.id == profile_id,
                PersonalProfile.user_id == user_id,
            )
        )
        profile = result.scalar_one_or_none()
        return self._decrypt(profile) if profile else None

    async def create(self, user_id: str | uuid.UUID, data: dict) -> PersonalProfile:
        description = data.pop("description", None)
        profile = PersonalProfile(
            user_id=user_id,
            description_encrypted=encrypt(description) if description else None,
            **data,
        )
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return self._decrypt(profile)

    async def update(self, profile: PersonalProfile, data: dict) -> PersonalProfile:
        description = data.pop("description", ...)
        if description is not ...:
            profile.description_encrypted = encrypt(description) if description else None
        for k, v in data.items():
            if v is not None:
                setattr(profile, k, v)
        await self.db.commit()
        await self.db.refresh(profile)
        return self._decrypt(profile)

    async def delete(self, profile: PersonalProfile) -> None:
        await self.db.delete(profile)
        await self.db.commit()

    async def bulk_create(self, user_id: str | uuid.UUID, items: list[dict]) -> list[PersonalProfile]:
        profiles = []
        for data in items:
            description = data.pop("description", None)
            p = PersonalProfile(
                user_id=user_id,
                description_encrypted=encrypt(description) if description else None,
                **data,
            )
            self.db.add(p)
            profiles.append(p)
        await self.db.commit()
        for p in profiles:
            await self.db.refresh(p)
            self._decrypt(p)
        return profiles
