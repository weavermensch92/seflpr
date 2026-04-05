"""AES-256-GCM 기반 개인정보 필드 암호화 유틸."""
import os
import logging
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

logger = logging.getLogger(__name__)

_FALLBACK_KEY: bytes | None = None


def _get_key() -> bytes:
    key_hex = settings.ENCRYPTION_KEY
    if not key_hex:
        if settings.is_production:
            raise RuntimeError("ENCRYPTION_KEY must be set in production!")
        global _FALLBACK_KEY
        if _FALLBACK_KEY is None:
            _FALLBACK_KEY = os.urandom(32)
            logger.warning("Using random fallback encryption key — data will not survive restart!")
        return _FALLBACK_KEY
    return bytes.fromhex(key_hex)


def encrypt(plaintext: str) -> str:
    """문자열을 AES-256-GCM으로 암호화하여 base64 문자열 반환."""
    if not plaintext:
        return plaintext
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    # nonce + ciphertext를 base64로 인코딩
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt(encrypted: str) -> str:
    """base64 암호화 문자열을 복호화하여 원문 반환."""
    if not encrypted:
        return encrypted
    key = _get_key()
    aesgcm = AESGCM(key)
    raw = base64.b64decode(encrypted.encode("utf-8"))
    nonce = raw[:12]
    ciphertext = raw[12:]
    return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")
