from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
import uuid
from app.models.project import ProjectStatus, AnswerStatus, RevisionType


class ProjectAnswerBase(BaseModel):
    question_number: int
    question_text: str
    char_limit: Optional[int] = None


class ProjectAnswerCreate(ProjectAnswerBase):
    pass


class ProjectAnswerResponse(ProjectAnswerBase):
    id: uuid.UUID
    answer_text: Optional[str] = None
    status: AnswerStatus
    matched_profiles: Optional[list[dict]] = None
    revisions_remaining: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    position: str = Field(min_length=1, max_length=255)
    title: str = Field(min_length=1, max_length=255)
    questions: list[ProjectAnswerCreate] = Field(default_factory=list)
    generation_config: Optional[dict[str, Any]] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[ProjectStatus] = None
    generation_config: Optional[dict[str, Any]] = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    company_cache_id: Optional[uuid.UUID] = None
    company_name: str
    position: str
    title: str
    status: ProjectStatus
    generation_config: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    answers: list[ProjectAnswerResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    id: uuid.UUID
    company_name: str
    position: str
    title: str
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    answer_count: int

    class Config:
        from_attributes = True


# ── 버전 이력 ────────────────────────────────────────────────
class VersionResponse(BaseModel):
    id: uuid.UUID
    revision_number: int
    revision_type: RevisionType
    new_text: str
    previous_text: Optional[str] = None
    revision_request: Optional[str] = None
    ai_review_text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── AI 검토 의견 ─────────────────────────────────────────────
class ReviewResponse(BaseModel):
    opinion: str
    compare: Optional[str] = None


# ── 프로필 갭 분석 ────────────────────────────────────────────
class GapItem(BaseModel):
    gap: str
    recommendation: str
    profile_type: str


class GapAnalysisResponse(BaseModel):
    critical: list[GapItem] = []
    recommended: list[GapItem] = []
    nice_to_have: list[GapItem] = []


# ── 유저 직접 수정 / AI 검토 요청 ─────────────────────────────
class UserEditRequest(BaseModel):
    edited_text: str = Field(min_length=1)


class AIReviewRequest(BaseModel):
    current_text: str = Field(min_length=1)


class ApplyReviewRequest(BaseModel):
    current_text: str
    ai_review: str


# ── AI 어투 감지 + 인간화 ──────────────────────────────────────
class HumanizeRequest(BaseModel):
    current_text: str = Field(min_length=1)


class HumanizeDetectResponse(BaseModel):
    diagnosis: str          # 감지된 AI 패턴 목록
    ai_level: str           # 낮음 / 보통 / 높음


class HumanizeRewriteResponse(BaseModel):
    rewritten_text: str
