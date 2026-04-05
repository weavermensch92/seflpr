from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class SendOtpRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^01[0-9]{8,9}$", description="한국 휴대폰 번호 (01012345678 형식)")


class VerifyOtpRequest(BaseModel):
    phone_number: str
    code: str = Field(..., min_length=6, max_length=6)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)
    phone_number: str = Field(..., pattern=r"^01[0-9]{8,9}$", description="인증 완료된 휴대폰 번호")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_admin: bool
    point_balance: int
    phone_number: Optional[str] = None

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
