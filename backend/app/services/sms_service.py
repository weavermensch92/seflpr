"""
SMS OTP 서비스
- COOLSMS_API_KEY/SECRET 환경변수가 설정되면 실제 SMS 발송
- 미설정 시 서버 로그에 OTP 출력 (개발 모드)
"""
import random
import hashlib
import hmac
import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── In-memory OTP store: phone -> {code, expires_at, verified} ──────────────
_otp_store: dict[str, dict] = {}

OTP_EXPIRE_MINUTES = 5


def _generate_code() -> str:
    return str(random.randint(100000, 999999))


def _make_coolsms_signature(api_key: str, api_secret: str) -> tuple[str, str, str]:
    """CoolSMS HMAC-SHA256 인증 헤더 생성."""
    date = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    salt = str(random.randint(100000000, 999999999))
    data = date + salt
    signature = hmac.new(
        api_secret.encode(),
        data.encode(),
        hashlib.sha256,
    ).hexdigest()
    return date, salt, signature


async def _send_sms_coolsms(to: str, text: str) -> None:
    api_key = settings.COOLSMS_API_KEY
    api_secret = settings.COOLSMS_API_SECRET
    sender = settings.COOLSMS_SENDER

    date, salt, signature = _make_coolsms_signature(api_key, api_secret)
    auth_header = (
        f"HMAC-SHA256 apiKey={api_key}, date={date}, "
        f"salt={salt}, signature={signature}"
    )

    payload = {
        "message": {
            "to": to,
            "from": sender,
            "text": text,
        }
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://api.coolsms.co.kr/messages/v4/send",
            json=payload,
            headers={"Authorization": auth_header, "Content-Type": "application/json"},
        )
        if resp.status_code not in (200, 201):
            logger.error(f"CoolSMS 발송 실패: {resp.status_code} {resp.text}")
            raise RuntimeError("SMS 발송에 실패했습니다. 잠시 후 다시 시도해주세요.")


async def send_otp(phone_number: str) -> None:
    """OTP 생성 후 SMS 발송. 기존 미인증 OTP는 덮어씀."""
    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES)
    _otp_store[phone_number] = {"code": code, "expires_at": expires_at, "verified": False}

    text = f"[SelfPR] 인증번호 {code} (5분 이내 입력)"

    if settings.COOLSMS_API_KEY and settings.COOLSMS_API_SECRET and settings.COOLSMS_SENDER:
        await _send_sms_coolsms(phone_number, text)
        logger.info(f"SMS 발송 완료 → {phone_number}")
    else:
        # 개발 모드: 로그에 출력
        logger.warning(f"[DEV] SMS OTP for {phone_number}: {code}")


def verify_otp(phone_number: str, code: str) -> bool:
    """OTP 검증. 맞으면 verified=True 마킹."""
    entry = _otp_store.get(phone_number)
    if not entry:
        return False
    if datetime.now(timezone.utc) > entry["expires_at"]:
        _otp_store.pop(phone_number, None)
        return False
    if entry["code"] != code:
        return False
    entry["verified"] = True
    return True


def is_verified(phone_number: str) -> bool:
    """등록 전 인증 완료 여부 확인."""
    entry = _otp_store.get(phone_number)
    if not entry:
        return False
    if datetime.now(timezone.utc) > entry["expires_at"]:
        return False
    return entry.get("verified", False)


def consume(phone_number: str) -> None:
    """등록 완료 후 OTP 항목 삭제."""
    _otp_store.pop(phone_number, None)
