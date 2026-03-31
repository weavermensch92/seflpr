from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import get_current_admin_user_id
from app.services.admin_service import AdminService
from app.schemas.admin import AdminDashboardResponse, PromptConfigResponse, PromptConfigUpdate

router = APIRouter(prefix="/admin", tags=["admin"])

# ── 모든 라우트에 get_current_admin_user_id 적용 ──────────────
# is_admin=True 인 유저만 통과, 일반 유저는 403 반환

@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_admin_dashboard(
    admin_id: str = Depends(get_current_admin_user_id),
    db: AsyncSession = Depends(get_db),
):
    """어드민 대시보드 — is_admin 계정만 접근 가능."""
    return await AdminService(db).get_dashboard_data()


@router.get("/prompts", response_model=list[PromptConfigResponse])
async def list_prompts(
    admin_id: str = Depends(get_current_admin_user_id),
    db: AsyncSession = Depends(get_db),
):
    """저장된 프롬프트 설정 전체 목록 조회."""
    return await AdminService(db).list_prompt_configs()


@router.get("/prompts/{prompt_key}", response_model=PromptConfigResponse)
async def get_prompt(
    prompt_key: str,
    admin_id: str = Depends(get_current_admin_user_id),
    db: AsyncSession = Depends(get_db),
):
    """특정 프롬프트 키 조회."""
    config = await AdminService(db).get_prompt_config(prompt_key)
    if not config:
        raise HTTPException(status_code=404, detail="프롬프트를 찾을 수 없습니다.")
    return config


@router.put("/prompts/{prompt_key}", response_model=PromptConfigResponse)
async def update_prompt(
    prompt_key: str,
    body: PromptConfigUpdate,
    admin_id: str = Depends(get_current_admin_user_id),
    db: AsyncSession = Depends(get_db),
):
    """프롬프트 내용 수정. 수정자 admin_id 기록."""
    return await AdminService(db).update_prompt_config(prompt_key, body, admin_id)


@router.post("/prompts/{prompt_key}/reset", response_model=PromptConfigResponse)
async def reset_prompt(
    prompt_key: str,
    admin_id: str = Depends(get_current_admin_user_id),
    db: AsyncSession = Depends(get_db),
):
    """프롬프트를 코드 기본값으로 초기화."""
    return await AdminService(db).reset_prompt_config(prompt_key, admin_id)


@router.post("/users/{user_id}/grant-points")
async def grant_points(
    user_id: str,
    amount: int = Body(..., embed=True),
    reason: str = Body("admin_grant", embed=True),
    admin_id: str = Depends(get_current_admin_user_id),
    db: AsyncSession = Depends(get_db),
):
    """특정 유저에게 포인트를 지급합니다 (어드민 전용)."""
    from app.services.point_service import PointService
    import uuid
    u_id = uuid.UUID(user_id)
    point_service = PointService(db)
    new_balance = await point_service.add_points(u_id, amount, reason)
    await db.commit()
    return {"user_id": user_id, "new_balance": new_balance}
