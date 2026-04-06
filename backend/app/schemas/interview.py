import uuid
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field
from app.models.interview import InterviewSessionStatus, QuestionType


# ── 요청 ──────────────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    """면접 세션 시작 요청 (프로젝트 ID는 URL path에서)."""
    pass


class SubmitAnswerRequest(BaseModel):
    question_id: uuid.UUID
    answer_text: str = Field(min_length=1, max_length=5000)


class FollowUpRequest(BaseModel):
    parent_question_id: uuid.UUID


# ── 응답 ──────────────────────────────────────────────────────

class AnswerResponse(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    answer_text: str
    ai_feedback: Optional[str] = None
    study_recommendations: Optional[list[dict[str, Any]]] = None
    reference_links: Optional[list[dict[str, Any]]] = None
    attempt_number: int = 1
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionResponse(BaseModel):
    id: uuid.UUID
    question_number: int
    question_type: QuestionType
    question_text: str
    hint_text: Optional[str] = None
    reference_links: Optional[list[dict[str, Any]]] = None
    is_follow_up: bool = False
    parent_question_id: Optional[uuid.UUID] = None
    points_consumed: int = 0
    follow_up_count: int = 0
    answers: list[AnswerResponse] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    status: InterviewSessionStatus
    total_questions: int = 0
    total_follow_ups: int = 0
    total_points_spent: int = 0
    created_at: datetime
    completed_at: Optional[datetime] = None
    questions: list[QuestionResponse] = Field(default_factory=list)

    # 프로젝트 정보 (편의)
    company_name: Optional[str] = None
    position: Optional[str] = None

    class Config:
        from_attributes = True


class SessionListItem(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    status: InterviewSessionStatus
    total_questions: int
    total_points_spent: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    company_name: Optional[str] = None
    position: Optional[str] = None

    class Config:
        from_attributes = True


class SessionSummaryResponse(BaseModel):
    overall_score: int  # 0-100
    strengths: list[str]
    weaknesses: list[str]
    improvement_tips: list[str]
    study_plan: list[dict[str, str]]  # [{topic, description}]
    question_scores: list[dict[str, Any]]  # [{question, score, summary}]
