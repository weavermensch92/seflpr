import uuid
from datetime import date, datetime, timezone
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Text, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import enum

from app.core.database import Base


class ProfileType(str, enum.Enum):
    EDUCATION = "education"
    WORK_EXPERIENCE = "work_experience"
    PROJECT = "project"
    CERTIFICATION = "certification"
    SKILL = "skill"
    ACTIVITY = "activity"
    AWARD = "award"
    STRENGTH = "strength"
    WEAKNESS = "weakness"
    MOTIVATION = "motivation"
    FREE_TEXT = "free_text"


class ProfileSource(str, enum.Enum):
    MANUAL = "manual"
    FILE_UPLOAD = "file_upload"
    OCR = "ocr"
    FREE_TEXT = "free_text"
    LINK = "link"


class PersonalProfile(Base):
    __tablename__ = "personal_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    profile_type: Mapped[ProfileType] = mapped_column(SAEnum(ProfileType), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    organization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # 민감 내용은 AES-256-GCM 암호화 저장
    description_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)

    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # 검색/매칭용 키워드 태그 (GIN 인덱스 필요 - 마이그레이션에서 추가)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)

    # 유형별 추가 메타데이터
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    # AI 해석 데이터 (자소서용 메모리)
    is_ai_memory: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_interpreted_content_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)

    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[ProfileSource] = mapped_column(SAEnum(ProfileSource), default=ProfileSource.MANUAL)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="profiles")
