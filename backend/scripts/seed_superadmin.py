"""
슈퍼어드민 계정 생성 시드 스크립트.
자격증명은 .env의 SUPERADMIN_* 변수에서만 읽습니다.

실행:
    cd backend
    python -m scripts.seed_superadmin
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.core.config import settings
from app.models.user import User


async def seed() -> None:
    email = settings.SUPERADMIN_EMAIL
    password = settings.SUPERADMIN_PASSWORD
    name = settings.SUPERADMIN_NAME

    if not email or not password or not name:
        print("[ERROR] SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD / SUPERADMIN_NAME 가 .env에 설정되지 않았습니다.")
        sys.exit(1)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()

        if existing:
            if not existing.is_admin:
                existing.is_admin = True
                await db.commit()
                print(f"[OK] 기존 계정({email})에 어드민 권한을 부여했습니다.")
            else:
                print(f"[SKIP] 슈퍼어드민 계정({email})이 이미 존재합니다.")
            return

        admin = User(
            email=email,
            password_hash=hash_password(password),
            full_name=name,
            is_active=True,
            is_admin=True,
        )
        db.add(admin)
        await db.commit()
        print(f"[OK] 슈퍼어드민 계정이 생성되었습니다: {email}")


if __name__ == "__main__":
    asyncio.run(seed())
