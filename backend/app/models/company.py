import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

from app.core.database import Base


class CompanyPositionCache(Base):
    """기업+포지션별 리서치 캐시 (유저 간 공유)."""
    __tablename__ = "company_position_cache"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_name_normalized: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    position: Mapped[str] = mapped_column(String(255), nullable=False)
    position_normalized: Mapped[str] = mapped_column(String(255), nullable=False)

    # 수집된 리서치 데이터 (JSONB)
    # {overview, core_values, culture, recent_news, job_postings, industry, talent_keywords, sources}
    research_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # 합격 사례 (블라인드, 잡플래닛 등)
    success_cases: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # AI 분석 결과 캐시
    analysis_summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # 요청 횟수 (인기 기업 파악용)
    requester_count: Mapped[int] = mapped_column(Integer, default=1)

    last_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # 사용된 검색 쿼리 목록
    search_queries: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    request_logs: Mapped[list["CompanyRequestLog"]] = relationship(back_populates="cache", cascade="all, delete-orphan")
    projects: Mapped[list["Project"]] = relationship(back_populates="company_cache")


class CompanyRequestLog(Base):
    """유저별 기업 리서치 요청 이력 (어드민 조회용)."""
    __tablename__ = "company_request_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    cache_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company_position_cache.id", ondelete="CASCADE"), nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[str] = mapped_column(String(255), nullable=False)
    was_cache_hit: Mapped[bool] = mapped_column(default=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    cache: Mapped["CompanyPositionCache"] = relationship(back_populates="request_logs")
