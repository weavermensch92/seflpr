from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user_id
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse,
    VersionResponse, ReviewResponse, GapAnalysisResponse,
    UserEditRequest, AIReviewRequest, ApplyReviewRequest,
    HumanizeRequest, HumanizeDetectResponse, HumanizeRewriteResponse,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """새로운 자소서 프로젝트를 생성합니다."""
    return await ProjectService(db).create_project(user_id, body)


@router.get("", response_model=list[ProjectListResponse])
async def list_projects(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """사용자의 프로젝트 목록을 조회합니다."""
    return await ProjectService(db).list_projects(user_id)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """특정 프로젝트의 상세 정보를 조회합니다."""
    return await ProjectService(db).get_project(project_id, user_id)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """프로젝트 기본 정보를 수정합니다."""
    return await ProjectService(db).update_project(project_id, user_id, body)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """프로젝트를 삭제합니다."""
    await ProjectService(db).delete_project(project_id, user_id)


@router.post("/{project_id}/answers/{answer_id}/generate", response_model=ProjectResponse)
async def generate_answer(
    project_id: str,
    answer_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """AI를 통해 해당 문항의 답변 초안을 생성합니다."""
    return await ProjectService(db).generate_answer(user_id, project_id, answer_id)


@router.post("/{project_id}/answers/{answer_id}/revise", response_model=ProjectResponse)
async def revise_answer(
    project_id: str,
    answer_id: str,
    feedback: str,  # 간단한 스트링으로 받거나 스키마 정의 가능
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """사용자의 피드백을 반영하여 답변을 첨삭합니다."""
    return await ProjectService(db).revise_answer(user_id, project_id, answer_id, feedback)


@router.post("/{project_id}/research", response_model=ProjectResponse)
async def research_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """기업 정보를 리서치하고 프로젝트 데이터에 연동합니다."""
    return await ProjectService(db).research_company(user_id, project_id)


@router.post("/{project_id}/answers/{answer_id}/user-edit", response_model=ProjectResponse)
async def user_edit_answer(
    project_id: str,
    answer_id: str,
    body: UserEditRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """유저 직접 수정 저장 + 버전 이력 기록."""
    return await ProjectService(db).save_user_edit(user_id, project_id, answer_id, body.edited_text)


@router.post("/{project_id}/answers/{answer_id}/ai-review", response_model=ReviewResponse)
async def ai_review_answer(
    project_id: str,
    answer_id: str,
    body: AIReviewRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """현재 텍스트에 대한 AI 검토 의견 반환."""
    result = await ProjectService(db).ai_review(user_id, project_id, answer_id, body.current_text)
    return ReviewResponse(**result)


@router.post("/{project_id}/answers/{answer_id}/apply-review", response_model=ProjectResponse)
async def apply_review(
    project_id: str,
    answer_id: str,
    body: ApplyReviewRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """AI 검토 의견을 반영하여 새 버전 생성 및 저장."""
    return await ProjectService(db).apply_review(
        user_id, project_id, answer_id, body.current_text, body.ai_review
    )


@router.get("/{project_id}/answers/{answer_id}/versions", response_model=list[VersionResponse])
async def get_versions(
    project_id: str,
    answer_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """답변 버전 이력 조회."""
    versions = await ProjectService(db).get_versions(user_id, project_id, answer_id)
    return [VersionResponse.model_validate(v) for v in versions]


@router.get("/{project_id}/gap-analysis", response_model=GapAnalysisResponse)
async def gap_analysis(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """프로필 갭 분석 실행."""
    result = await ProjectService(db).gap_analysis(user_id, project_id)
    return GapAnalysisResponse(**result)


@router.post("/{project_id}/answers/{answer_id}/humanize/detect", response_model=HumanizeDetectResponse)
async def humanize_detect(
    project_id: str,
    answer_id: str,
    body: HumanizeRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """AI 냄새 패턴 감지 — 어떤 부분이 AI스러운지 분석."""
    result = await ProjectService(db).humanize_detect(user_id, project_id, answer_id, body.current_text)
    return HumanizeDetectResponse(**result)


@router.post("/{project_id}/answers/{answer_id}/humanize/rewrite", response_model=HumanizeRewriteResponse)
async def humanize_rewrite(
    project_id: str,
    answer_id: str,
    body: HumanizeRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """AI 어투 제거 후 사람이 쓴 것처럼 재작성."""
    result = await ProjectService(db).humanize_rewrite(user_id, project_id, answer_id, body.current_text)
    return HumanizeRewriteResponse(**result)
