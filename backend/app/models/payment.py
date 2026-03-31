import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.core.database import Base


class PaymentType(str, enum.Enum):
    POINT_CHARGE = "point_charge"       # 포인트 충전
    # 기존 타입들은 하위 호환성을 위해 유지하거나 deprecated 처리
    PROJECT_CREATE = "project_create"   # 자소서 프로젝트 생성
    INTERVIEW_CREATE = "interview_create" # 면접 연습 세트


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PointTransactionType(str, enum.Enum):
    CHARGE = "charge"           # 충전
    CONSUME = "consume"         # 소비
    REFUND = "refund"           # 환불
    ADMIN_GRANT = "admin_grant" # 어드민 지급


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)

    payment_type: Mapped[PaymentType] = mapped_column(SAEnum(PaymentType), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)

    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # 원 단위

    # PG사 결제 키
    order_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    payment_key: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # PG사 응답 원본
    pg_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="payments")
    project: Mapped["Project"] = relationship(back_populates="payments")
    point_transaction: Mapped["PointTransaction | None"] = relationship(back_populates="payment", uselist=False)


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("payments.id", ondelete="SET NULL"), nullable=True)

    type: Mapped[PointTransactionType] = mapped_column(SAEnum(PointTransactionType), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # 양수(충전) 또는 음수(소비)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)  # 거래 후 잔액

    reason: Mapped[str] = mapped_column(String(255), nullable=False)  # 'project_create', 'interview_start', 'payment_charge' 등
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)  # 관련 프로젝트/세션 ID

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user: Mapped["User"] = relationship(back_populates="point_transactions")
    payment: Mapped["Payment | None"] = relationship(back_populates="point_transaction")
