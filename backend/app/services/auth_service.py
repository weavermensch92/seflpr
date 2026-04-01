from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.repositories.user_repo import UserRepository
from app.schemas.auth import RegisterRequest, LoginRequest, RegisterResponse, TokenResponse, UserResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def register(self, data: RegisterRequest) -> RegisterResponse:
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 사용 중인 이메일입니다.",
            )
        hashed = hash_password(data.password)
        user = await self.repo.create(
            email=data.email,
            password_hash=hashed,
            full_name=data.full_name,
        )
        access_token = create_access_token(str(user.id))
        return RegisterResponse(
            user=UserResponse(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                is_admin=user.is_admin,
                point_balance=9999999 if user.is_admin else user.point_balance,
            ),
            access_token=access_token,
        )

    async def login(self, data: LoginRequest) -> dict:
        user = await self.repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="이메일 또는 비밀번호가 올바르지 않습니다.",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="비활성화된 계정입니다.",
            )
        await self.repo.update_last_login(user)
        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": UserResponse(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                is_admin=user.is_admin,
                point_balance=9999999 if user.is_admin else user.point_balance,
            ),
        }

    async def refresh(self, refresh_token: str) -> TokenResponse:
        from app.core.security import decode_token
        from jose import JWTError
        try:
            user_id = decode_token(refresh_token, token_type="refresh")
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않거나 만료된 리프레시 토큰입니다.",
            )
        user = await self.repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="사용자를 찾을 수 없습니다.",
            )
        new_access_token = create_access_token(str(user.id))
        return TokenResponse(access_token=new_access_token)
