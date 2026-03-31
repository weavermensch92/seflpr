"""
DB에 저장된 프롬프트를 우선 사용하고,
없으면 코드 기본값으로 폴백하는 유틸리티.
"""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.prompt_config import PromptConfig


async def load_prompt(db: Optional[AsyncSession], prompt_key: str, fallback: str) -> str:
    """
    DB에서 prompt_key에 해당하는 활성 프롬프트를 조회.
    없거나 DB 연결이 없으면 fallback(코드 기본값) 반환.
    """
    if db is None:
        return fallback
    try:
        result = await db.execute(
            select(PromptConfig.content).where(
                PromptConfig.prompt_key == prompt_key,
                PromptConfig.is_active == True,  # noqa: E712
            )
        )
        content = result.scalar_one_or_none()
        return content if content else fallback
    except Exception:
        return fallback
