import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str | uuid.UUID) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_phone(self, phone_number: str) -> User | None:
        result = await self.db.execute(select(User).where(User.phone_number == phone_number))
        return result.scalar_one_or_none()

    async def list_all(self) -> list[User]:
        result = await self.db.execute(select(User).order_by(User.created_at.desc()))
        return list(result.scalars().all())

    async def create(self, email: str, password_hash: str, full_name: str, phone_number: str | None = None) -> User:
        user = User(
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            phone_number=phone_number,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_last_login(self, user: User) -> None:
        from datetime import datetime, timezone
        user.last_login_at = datetime.now(timezone.utc)
        await self.db.commit()

    async def set_active(self, user: User, is_active: bool) -> User:
        user.is_active = is_active
        await self.db.commit()
        await self.db.refresh(user)
        return user
