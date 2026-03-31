import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.payment import PointTransactionType


class PointBalanceResponse(BaseModel):
    balance: int
    user_id: uuid.UUID
    
    model_config = ConfigDict(from_attributes=True)


class PointTransactionResponse(BaseModel):
    id: uuid.UUID
    type: PointTransactionType
    amount: int
    balance_after: int
    reason: str
    reference_id: uuid.UUID | None = None
    payment_id: uuid.UUID | None = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PointChargeRequest(BaseModel):
    amount: int  # 포인트 양

class PointGrantRequest(BaseModel):
    user_id: uuid.UUID
    amount: int
    reason: str
