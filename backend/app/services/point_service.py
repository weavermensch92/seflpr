import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status

from app.models.user import User
from app.models.payment import PointTransaction, PointTransactionType


class PointService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_balance(self, user_id: uuid.UUID) -> int:
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        # 어드민은 9,999,999P로 표시 (무제한 시각화)
        if user.is_admin:
            return 9999999
        return user.point_balance

    async def deduct_points(
        self, 
        user_id: uuid.UUID, 
        amount: int, 
        reason: str, 
        reference_id: uuid.UUID = None
    ) -> int:
        """
        포인트를 차감합니다. 
        amount는 양수로 입력받아 내부에서 음수로 처리합니다.
        """
        if amount <= 0:
            raise ValueError("차감할 포인트는 0보다 커야 합니다.")

        # 사용자 조회 및 락 (동시성 제어)
        query = select(User).where(User.id == user_id).with_for_update()
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

        # 어드민은 무제한 이용 가능 (체크 및 차감 생략)
        if user.is_admin:
            return user.point_balance

        if user.point_balance < amount:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"포인트가 부족합니다. (현재: {user.point_balance}P, 필요: {amount}P)"
            )

        # 포인트 차감
        user.point_balance -= amount
        
        # 트랜잭션 기록
        transaction = PointTransaction(
            user_id=user_id,
            type=PointTransactionType.CONSUME,
            amount=-amount,
            balance_after=user.point_balance,
            reason=reason,
            reference_id=reference_id
        )
        self.db.add(transaction)
        
        await self.db.flush()  # 변경사항 반영 (커밋은 호출부에서 처리하도록 유도하거나 여기서 처리)
        return user.point_balance

    async def add_points(
        self, 
        user_id: uuid.UUID, 
        amount: int, 
        reason: str, 
        payment_id: uuid.UUID = None,
        reference_id: uuid.UUID = None
    ) -> int:
        """포인트를 충전/지급합니다."""
        if amount <= 0:
            raise ValueError("추가할 포인트는 0보다 커야 합니다.")

        query = select(User).where(User.id == user_id).with_for_update()
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

        user.point_balance += amount
        
        transaction = PointTransaction(
            user_id=user_id,
            type=PointTransactionType.CHARGE if payment_id else PointTransactionType.ADMIN_GRANT,
            amount=amount,
            balance_after=user.point_balance,
            reason=reason,
            payment_id=payment_id,
            reference_id=reference_id
        )
        self.db.add(transaction)
        
        await self.db.flush()
        return user.point_balance

    async def list_transactions(self, user_id: uuid.UUID, limit: int = 20, offset: int = 0) -> list[PointTransaction]:
        query = (
            select(PointTransaction)
            .where(PointTransaction.user_id == user_id)
            .order_by(PointTransaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
