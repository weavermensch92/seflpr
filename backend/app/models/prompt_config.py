import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


# 관리 가능한 프롬프트 키 목록 (코드 기본값)
PROMPT_DEFAULTS = {
    "generator_system": {
        "label": "자소서 생성 — 시스템 프롬프트",
        "description": "AI가 자소서 초안을 생성할 때 사용하는 시스템 지침.",
        "category": "generator",
    },
    "generator_user": {
        "label": "자소서 생성 — 유저 템플릿",
        "description": "기업정보·프로필·문항을 AI에게 전달하는 포맷.",
        "category": "generator",
    },
    "reviewer_system": {
        "label": "AI 검토 — 시스템 프롬프트",
        "description": "작성 의도·버전비교 검토 시 사용하는 시스템 지침.",
        "category": "reviewer",
    },
    "reviewer_opinion": {
        "label": "AI 검토 — 작성 의도 템플릿",
        "description": "왜 이렇게 작성했는지 의견을 밝히는 프롬프트.",
        "category": "reviewer",
    },
    "reviewer_compare": {
        "label": "AI 검토 — 버전 비교 템플릿",
        "description": "직전 버전과 현재 버전 비교 평가 프롬프트.",
        "category": "reviewer",
    },
    "apply_review": {
        "label": "AI 검토 의견 반영 템플릿",
        "description": "검토 의견을 반영하여 자소서를 수정하는 프롬프트.",
        "category": "reviewer",
    },
    "gap_system": {
        "label": "프로필 갭 분석 — 시스템 프롬프트",
        "description": "부족한 경험 및 보강 활동을 추천하는 시스템 지침.",
        "category": "gap",
    },
    "gap_analysis": {
        "label": "프로필 갭 분석 — 분석 템플릿",
        "description": "부족 항목 JSON 출력 프롬프트.",
        "category": "gap",
    },
    "humanizer_system": {
        "label": "AI 어투 제거 — 시스템 프롬프트",
        "description": "AI 냄새 제거·인간화 재작성 시스템 지침.",
        "category": "humanizer",
    },
    "humanizer_detect": {
        "label": "AI 어투 감지 템플릿",
        "description": "AI 냄새 패턴 8가지를 찾아 목록으로 반환하는 프롬프트.",
        "category": "humanizer",
    },
    "humanizer_rewrite": {
        "label": "AI 어투 인간화 재작성 템플릿",
        "description": "AI 패턴 제거 후 사람처럼 재작성하는 프롬프트.",
        "category": "humanizer",
    },
}


class PromptConfig(Base):
    """어드민이 관리하는 AI 프롬프트 설정."""
    __tablename__ = "prompt_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prompt_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="general")

    # 실제 프롬프트 내용
    content: Mapped[str] = mapped_column(Text, nullable=False)
    default_content: Mapped[str] = mapped_column(Text, nullable=False)  # 초기화용 원본 저장

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
