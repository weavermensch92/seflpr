import asyncio
import logging
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import hash_password
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def reset_superadmin():
    async with AsyncSessionLocal() as db:
        try:
            # 1. 기존 슈퍼어드민 검색
            query = select(User).where(User.email == settings.SUPERADMIN_EMAIL)
            result = await db.execute(query)
            admin = result.scalars().first()

            # 2. 새 해시 생성 (현재 security.py의 로직 사용)
            new_hash = hash_password(settings.SUPERADMIN_PASSWORD)

            if admin:
                logger.info(f"Found existing admin: {admin.email}. Resetting password...")
                admin.password_hash = new_hash
                admin.is_admin = True
                admin.is_active = True
            else:
                logger.info("Admin not found. Creating new superadmin...")
                admin = User(
                    email=settings.SUPERADMIN_EMAIL,
                    password_hash=new_hash,
                    full_name=settings.SUPERADMIN_NAME or "SuperAdmin",
                    is_admin=True,
                    is_active=True,
                    point_balance=999999
                )
                db.add(admin)

            await db.commit()
            logger.info("✅ Superadmin password reset successfully!")
            
        except Exception as e:
            logger.error(f"❌ Failed to reset admin: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(reset_superadmin())
