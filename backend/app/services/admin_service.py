import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.profile import PersonalProfile as Profile
from app.models.project import Project, ProjectAnswer, AnswerStatus
from app.models.prompt_config import PromptConfig, PROMPT_DEFAULTS
from app.models.payment import Payment
from app.schemas.admin import (
    AdminStats, AgentLogEntry, AdminDashboardResponse,
    PromptConfigResponse, PromptConfigUpdate, AdminUserResponse,
)


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── 대시보드 ──────────────────────────────────────────────
    async def get_dashboard_data(self) -> AdminDashboardResponse:
        user_count = (await self.db.execute(select(func.count(User.id)))).scalar()
        profile_count = (await self.db.execute(select(func.count(Profile.id)))).scalar()
        project_count = (await self.db.execute(select(func.count(Project.id)))).scalar()

        all_answers = (await self.db.execute(select(ProjectAnswer))).scalars().all()
        answer_count = len(all_answers)
        success_count = sum(1 for a in all_answers if a.status == AnswerStatus.DONE)
        success_rate = (success_count / answer_count * 100) if answer_count > 0 else 0.0
        revisions_used = sum(3 - (a.revisions_remaining or 3) for a in all_answers)
        avg_revisions = (revisions_used / answer_count) if answer_count > 0 else 0.0

        recent_answers_query = (
            select(ProjectAnswer, User.full_name)
            .join(Project, Project.id == ProjectAnswer.project_id)
            .join(User, User.id == Project.user_id)
            .order_by(ProjectAnswer.updated_at.desc())
            .limit(10)
        )
        logs_result = await self.db.execute(recent_answers_query)
        recent_logs = []
        for ans, full_name in logs_result:
            recent_logs.append(AgentLogEntry(
                id=str(ans.id),
                username=full_name,
                action="Draft Generation" if ans.status == AnswerStatus.DONE else "Pending",
                status=str(ans.status),
                timestamp=ans.updated_at,
                details=f"Project: {ans.project_id}, Q: {ans.question_number}"
            ))

        return AdminDashboardResponse(
            stats=AdminStats(
                user_count=user_count,
                profile_count=profile_count,
                project_count=project_count,
                answer_count=answer_count,
                generation_success_rate=success_rate,
                avg_revisions_used=avg_revisions,
            ),
            recent_logs=recent_logs,
        )

    # ── 사용자 관리 ──────────────────────────────────────────
    async def list_users(self) -> list[AdminUserResponse]:
        from app.repositories.user_repo import UserRepository
        repo = UserRepository(self.db)
        users = await repo.list_all()

        # 사용자별 결제 건수
        payment_counts: dict = {}
        payments_result = await self.db.execute(
            select(Payment.user_id, func.count(Payment.id).label("cnt"))
            .where(Payment.status == "completed")
            .group_by(Payment.user_id)
        )
        for row in payments_result:
            payment_counts[str(row.user_id)] = row.cnt

        result = []
        for u in users:
            result.append(AdminUserResponse(
                id=str(u.id),
                email=u.email,
                full_name=u.full_name,
                phone_number=u.phone_number,
                is_active=u.is_active,
                is_admin=u.is_admin,
                point_balance=9999999 if u.is_admin else u.point_balance,
                free_ingests_remaining=u.free_ingests_remaining,
                created_at=u.created_at,
                last_login_at=u.last_login_at,
                payment_count=payment_counts.get(str(u.id), 0),
            ))
        return result

    async def toggle_user_active(self, user_id: str) -> AdminUserResponse:
        from app.repositories.user_repo import UserRepository
        import uuid as _uuid
        repo = UserRepository(self.db)
        user = await repo.get_by_id(_uuid.UUID(user_id))
        if not user:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        if user.is_admin:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="어드민 계정은 정지할 수 없습니다.")
        updated = await repo.set_active(user, not user.is_active)
        return AdminUserResponse(
            id=str(updated.id),
            email=updated.email,
            full_name=updated.full_name,
            phone_number=updated.phone_number,
            is_active=updated.is_active,
            is_admin=updated.is_admin,
            point_balance=updated.point_balance,
            free_ingests_remaining=updated.free_ingests_remaining,
            created_at=updated.created_at,
            last_login_at=updated.last_login_at,
        )

    # ── 프롬프트 관리 ─────────────────────────────────────────
    async def _ensure_prompts_seeded(self) -> None:
        """DB에 없는 프롬프트 키를 코드 기본값으로 초기 삽입."""
        # 현재 저장된 키 조회
        result = await self.db.execute(select(PromptConfig.prompt_key))
        existing_keys = {row[0] for row in result.fetchall()}

        # 각 프롬프트 모듈에서 기본값 가져오기
        from app.agents.prompts.generator_prompts import GENERATOR_SYSTEM_PROMPT, GENERATOR_USER_TEMPLATE
        from app.agents.prompts.reviewer_prompts import (
            REVIEWER_SYSTEM_PROMPT, REVIEWER_OPINION_TEMPLATE,
            REVIEWER_COMPARE_TEMPLATE, APPLY_REVIEW_TEMPLATE,
        )
        from app.agents.prompts.gap_prompts import GAP_SYSTEM_PROMPT, GAP_ANALYSIS_TEMPLATE
        from app.agents.prompts.humanizer_prompts import (
            HUMANIZER_SYSTEM_PROMPT, HUMANIZER_DETECT_TEMPLATE, HUMANIZER_REWRITE_TEMPLATE,
        )

        code_defaults = {
            "generator_system": GENERATOR_SYSTEM_PROMPT,
            "generator_user": GENERATOR_USER_TEMPLATE,
            "reviewer_system": REVIEWER_SYSTEM_PROMPT,
            "reviewer_opinion": REVIEWER_OPINION_TEMPLATE,
            "reviewer_compare": REVIEWER_COMPARE_TEMPLATE,
            "apply_review": APPLY_REVIEW_TEMPLATE,
            "gap_system": GAP_SYSTEM_PROMPT,
            "gap_analysis": GAP_ANALYSIS_TEMPLATE,
            "humanizer_system": HUMANIZER_SYSTEM_PROMPT,
            "humanizer_detect": HUMANIZER_DETECT_TEMPLATE,
            "humanizer_rewrite": HUMANIZER_REWRITE_TEMPLATE,
        }

        new_records = []
        for key, content in code_defaults.items():
            if key not in existing_keys:
                meta = PROMPT_DEFAULTS.get(key, {})
                new_records.append(PromptConfig(
                    prompt_key=key,
                    label=meta.get("label", key),
                    description=meta.get("description", ""),
                    category=meta.get("category", "general"),
                    content=content,
                    default_content=content,
                ))

        if new_records:
            self.db.add_all(new_records)
            await self.db.commit()

    async def list_prompt_configs(self) -> list[PromptConfig]:
        await self._ensure_prompts_seeded()
        result = await self.db.execute(
            select(PromptConfig).order_by(PromptConfig.category, PromptConfig.prompt_key)
        )
        return list(result.scalars().all())

    async def get_prompt_config(self, prompt_key: str) -> PromptConfig | None:
        await self._ensure_prompts_seeded()
        result = await self.db.execute(
            select(PromptConfig).where(PromptConfig.prompt_key == prompt_key)
        )
        return result.scalar_one_or_none()

    async def update_prompt_config(
        self, prompt_key: str, body: PromptConfigUpdate, admin_id: str
    ) -> PromptConfig:
        config = await self.get_prompt_config(prompt_key)
        if not config:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="프롬프트를 찾을 수 없습니다.")

        config.content = body.content
        config.updated_by = uuid.UUID(admin_id)
        config.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(config)
        return config

    async def reset_prompt_config(self, prompt_key: str, admin_id: str) -> PromptConfig:
        config = await self.get_prompt_config(prompt_key)
        if not config:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="프롬프트를 찾을 수 없습니다.")

        config.content = config.default_content
        config.updated_by = uuid.UUID(admin_id)
        config.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(config)
        return config
