import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _load_key(path: str) -> str:
    key_path = Path(path)
    if not key_path.exists():
        raise FileNotFoundError(
            f"JWT key not found at {path}. "
            "Run: mkdir -p keys && openssl genrsa -out keys/private.pem 2048 "
            "&& openssl rsa -in keys/private.pem -pubout -out keys/public.pem"
        )
    return key_path.read_text()


def get_private_key() -> str:
    return _load_key(settings.JWT_PRIVATE_KEY_PATH)


def get_public_key() -> str:
    return _load_key(settings.JWT_PUBLIC_KEY_PATH)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": subject,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, get_private_key(), algorithm="RS256")


def create_refresh_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": subject,
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, get_private_key(), algorithm="RS256")


def decode_token(token: str, token_type: str = "access") -> str:
    """토큰을 디코딩하고 subject(user_id)를 반환. 실패 시 예외 발생."""
    try:
        payload = jwt.decode(token, get_public_key(), algorithms=["RS256"])
        if payload.get("type") != token_type:
            raise JWTError("Invalid token type")
        subject: str = payload.get("sub")
        if subject is None:
            raise JWTError("Missing subject")
        return subject
    except JWTError:
        raise
