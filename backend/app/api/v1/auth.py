from fastapi import APIRouter, Depends, Response, Cookie, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.schemas.auth import (
    RegisterRequest, LoginRequest, RegisterResponse, TokenResponse,
    SendOtpRequest, VerifyOtpRequest,
)
from app.services.auth_service import AuthService
from app.services import sms_service

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_KEY = "refresh_token"


@router.post("/phone/send-otp", status_code=200)
async def send_otp(body: SendOtpRequest):
    """전화번호 OTP 발송 (회원가입 전 인증)."""
    try:
        await sms_service.send_otp(body.phone_number)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    return {"message": "인증번호가 발송되었습니다."}


@router.post("/phone/verify-otp", status_code=200)
async def verify_otp(body: VerifyOtpRequest):
    """OTP 검증."""
    if not sms_service.verify_otp(body.phone_number, body.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="인증번호가 올바르지 않거나 만료되었습니다.",
        )
    return {"message": "인증이 완료되었습니다.", "verified": True}


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    body: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    result = await service.register(body)
    return result


@router.post("/login")
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    data = await service.login(body)

    # Refresh token을 httpOnly Secure 쿠키로 발급
    response.set_cookie(
        key=REFRESH_COOKIE_KEY,
        value=data["refresh_token"],
        httponly=True,
        secure=settings.is_production,
        samesite="strict",
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth/refresh",
    )
    return {
        "access_token": data["access_token"],
        "token_type": "bearer",
        "user": data["user"],
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_KEY),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="리프레시 토큰이 없습니다.",
        )
    service = AuthService(db)
    return await service.refresh(refresh_token)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key=REFRESH_COOKIE_KEY, path="/api/v1/auth/refresh")
    return {"message": "로그아웃 되었습니다."}
