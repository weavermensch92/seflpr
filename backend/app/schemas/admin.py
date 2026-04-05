from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import uuid


class AdminStats(BaseModel):
    user_count: int
    profile_count: int
    project_count: int
    answer_count: int
    generation_success_rate: float
    avg_revisions_used: float


class AgentLogEntry(BaseModel):
    id: str
    username: str
    action: str
    status: str
    timestamp: datetime
    details: Optional[str] = None


class AdminDashboardResponse(BaseModel):
    stats: AdminStats
    recent_logs: list[AgentLogEntry]


# ── 프롬프트 설정 ────────────────────────────────────────────
class PromptConfigResponse(BaseModel):
    id: str
    prompt_key: str
    label: str
    description: str
    category: str
    content: str
    default_content: str
    is_active: bool
    updated_by: Optional[str] = None
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v):
        return str(v) if v is not None else v

    @field_validator("updated_by", mode="before")
    @classmethod
    def coerce_updated_by(cls, v):
        return str(v) if v is not None else None


class PromptConfigUpdate(BaseModel):
    content: str


# ── 사용자 관리 ───────────────────────────────────────────────
class AdminUserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone_number: Optional[str] = None
    is_active: bool
    is_admin: bool
    point_balance: int
    free_ingests_remaining: int
    created_at: datetime
    last_login_at: Optional[datetime] = None
    payment_count: int = 0

    model_config = {"from_attributes": True}

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v):
        return str(v) if v is not None else v


class GrantPointsRequest(BaseModel):
    amount: int
    reason: str = "admin_grant"
