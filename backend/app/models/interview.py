import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.core.database import Base


MAX_FOLLOW_UPS_PER_QUESTION = 5  # 꼬리질문 질문당 최대 개수
POINT_COST_NEW_QUESTION = 3       # 신규 질문 포인트 비용
POINT_COST_FOLLOW_UP = 1          # 꼬리 질문 포인트 비용


class InterviewSessionStatus(str, enum.Enum):
    GENERATING = "generating"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class QuestionType(str, enum.Enum):
    RESUME = "resume"           # 자소서 기반
    VALUES = "values"           # 기업 가치관
    TECHNICAL = "technical"     # 직무/기술
    SITUATIONAL = "situational" # 상황 대처


class InterviewSession(Base):
    """면접 연습 세션."""
    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 질문 생성 시점에 고정된 자소서 스냅샷 (이후 수정과 무관)
    cover_letter_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[InterviewSessionStatus] = mapped_column(
        SAEnum(InterviewSessionStatus), default=InterviewSessionStatus.GENERATING
    )
    
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    total_follow_ups: Mapped[int] = mapped_column(Integer, default=0)
    total_points_spent: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="interview_sessions")
    questions: Mapped[list["InterviewQuestion"]] = relationship(
        back_populates="session", cascade="all, delete-orphan",
        order_by="InterviewQuestion.question_number"
    )


class InterviewQuestion(Base):
    """생성된 면접 예상 질문."""
    __tablename__ = "interview_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)

    question_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1~
    question_type: Mapped[QuestionType] = mapped_column(SAEnum(QuestionType), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    hint_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 질문 생성 시 참고한 외부 링크+발췌 [{url, title, excerpt}]
    reference_links: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # 꼬리 질문 여부
    is_follow_up: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_question_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_questions.id"), nullable=True)

    points_consumed: Mapped[int] = mapped_column(Integer, default=0) # 이 질문에 소비된 포인트 (신규 3P, 꼬리 1P, 첫 질문은 0P)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    session: Mapped["InterviewSession"] = relationship(back_populates="questions")
    answers: Mapped[list["InterviewAnswer"]] = relationship(back_populates="question", cascade="all, delete-orphan")
    follow_ups: Mapped[list["InterviewQuestion"]] = relationship("InterviewQuestion", foreign_keys=[parent_question_id])


class InterviewAnswer(Base):
    """유저 답변 + AI 피드백."""
    __tablename__ = "interview_answers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    ai_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 더 공부할 것 목록 [{topic, description}]
    study_recommendations: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # 피드백 시 참고한 외부 링크+발췌 [{url, title, excerpt}]
    reference_links: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    attempt_number: Mapped[int] = mapped_column(Integer, default=1)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    question: Mapped["InterviewQuestion"] = relationship(back_populates="answers")
