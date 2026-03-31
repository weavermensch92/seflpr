import uuid
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.services.point_service import PointService
from app.schemas.point import PointBalanceResponse, PointTransactionResponse

router = APIRouter(prefix="/points", tags=["Points"])

@router.get("/balance", response_model=PointBalanceResponse)
async def get_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """현재 포인트 잔액을 확인합니다."""
    point_service = PointService(db)
    balance = await point_service.get_balance(current_user.id)
    return PointBalanceResponse(balance=balance, user_id=current_user.id)

@router.get("/transactions", response_model=List[PointTransactionResponse])
async def list_transactions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """포인트 거래 내역을 조회합니다."""
    point_service = PointService(db)
    transactions = await point_service.list_transactions(current_user.id, limit=limit, offset=offset)
    return transactions
