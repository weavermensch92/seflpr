from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.schemas.interview import (
    SessionResponse, SessionListItem, SubmitAnswerRequest,
    FollowUpRequest, QuestionResponse, AnswerResponse,
    SessionSummaryResponse,
)
from app.services.interview_service import InterviewService

router = APIRouter(prefix="/projects/{project_id}/interviews", tags=["interviews"])


@router.post("", response_model=SessionResponse, status_code=201)
async def start_session(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """면접 세션 시작 (60P 차감 + 초기 5개 질문 AI 생성)."""
    return await InterviewService(db).start_session(user_id, project_id)


@router.get("", response_model=list[SessionListItem])
async def list_sessions(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """프로젝트의 면접 세션 목록."""
    return await InterviewService(db).list_sessions(user_id, project_id)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    project_id: str,
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """면접 세션 상세 (질문 + 답변 포함)."""
    return await InterviewService(db).get_session(user_id, project_id, session_id)


@router.post("/{session_id}/answer", response_model=AnswerResponse)
async def submit_answer(
    project_id: str,
    session_id: str,
    body: SubmitAnswerRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """답변 제출 → AI 피드백 반환."""
    return await InterviewService(db).submit_answer(
        user_id, project_id, session_id, str(body.question_id), body.answer_text,
    )


@router.post("/{session_id}/follow-up", response_model=QuestionResponse)
async def request_follow_up(
    project_id: str,
    session_id: str,
    body: FollowUpRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """꼬리 질문 요청 (1P, 질문당 최대 5개)."""
    return await InterviewService(db).request_follow_up(
        user_id, project_id, session_id, str(body.parent_question_id),
    )


@router.post("/{session_id}/new-question", response_model=QuestionResponse)
async def request_new_question(
    project_id: str,
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """신규 질문 요청 (3P)."""
    return await InterviewService(db).request_new_question(user_id, project_id, session_id)


@router.post("/{session_id}/complete", response_model=SessionSummaryResponse)
async def complete_session(
    project_id: str,
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """세션 종료 → AI 종합 분석."""
    return await InterviewService(db).complete_session(user_id, project_id, session_id)
