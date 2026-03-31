import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.core.database import Base


class ProjectStatus(str, enum.Enum):
    PENDING_PAYMENT = "pending_payment"
    RESEARCHING = "researching"
    GENERATING = "generating"
    DRAFT = "draft"
    EDITING = "editing"
    FINAL = "final"


class AnswerStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATING = "generating"
    DONE = "done"


class Project(Base):
    """자소서 프로젝트 (기업 + 포지션 단위)."""
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_cache_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("company_position_cache.id"), nullable=True)

    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)  # 예: "삼성전자 소프트웨어 v1"

    status: Mapped[ProjectStatus] = mapped_column(SAEnum(ProjectStatus), default=ProjectStatus.PENDING_PAYMENT)

    # 생성 설정 (문체, 강조 역량 등)
    generation_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # 에이전트 실행 로그
    agent_log: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # 면접 연습 활성화 여부
    interview_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="projects")
    company_cache: Mapped["CompanyPositionCache"] = relationship(back_populates="projects")
    answers: Mapped[list["ProjectAnswer"]] = relationship(back_populates="project", cascade="all, delete-orphan", order_by="ProjectAnswer.question_number")
    payments: Mapped[list["Payment"]] = relationship(back_populates="project")
    interview_sessions: Mapped[list["InterviewSession"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ProjectAnswer(Base):
    """프로젝트별 질문-답변."""
    __tablename__ = "project_answers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    question_number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    char_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # 매칭된 프로필 정보 [{profile_id, relevance_score, reason}]
    matched_profiles: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    status: Mapped[AnswerStatus] = mapped_column(SAEnum(AnswerStatus), default=AnswerStatus.PENDING)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="answers")
    revisions: Mapped[list["AnswerRevision"]] = relationship(back_populates="answer", cascade="all, delete-orphan")


class RevisionType(str, enum.Enum):
    AI_GENERATED = "ai_generated"      # AI 최초 생성
    USER_EDIT = "user_edit"            # 유저 직접 수정
    AI_REVISED = "ai_revised"          # 유저 피드백 반영 AI 첨삭
    AI_REVIEW_APPLIED = "ai_review_applied"  # AI 검토 의견 반영


class AnswerRevision(Base):
    """답변 수정 이력 (버전 관리)."""
    __tablename__ = "answer_revisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    answer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project_answers.id", ondelete="CASCADE"), nullable=False, index=True)

    previous_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_text: Mapped[str] = mapped_column(Text, nullable=False)
    revision_request: Mapped[str | None] = mapped_column(Text, nullable=True)
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    revision_type: Mapped[RevisionType] = mapped_column(SAEnum(RevisionType), default=RevisionType.AI_GENERATED)
    ai_review_text: Mapped[str | None] = mapped_column(Text, nullable=True)   # AI 검토 의견 (review 결과 저장)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    answer: Mapped["ProjectAnswer"] = relationship(back_populates="revisions")
