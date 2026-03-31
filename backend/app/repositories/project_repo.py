import uuid
from typing import Optional, Sequence
from datetime import datetime, timezone
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.project import Project, ProjectAnswer, ProjectStatus, AnswerRevision, RevisionType


class ProjectRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_project(self, project: Project) -> Project:
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def list_projects(self, user_id: uuid.UUID) -> Sequence[Project]:
        query = (
            select(Project)
            .where(Project.user_id == user_id)
            .order_by(Project.created_at.desc())
            .options(selectinload(Project.answers))
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_project(self, project_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Project]:
        query = (
            select(Project)
            .where(Project.id == project_id, Project.user_id == user_id)
            .options(selectinload(Project.answers))
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_project(
        self,
        project_id: uuid.UUID,
        user_id: uuid.UUID,
        update_data: dict
    ) -> Optional[Project]:
        project = await self.get_project(project_id, user_id)
        if not project:
            return None
        
        for key, value in update_data.items():
            if hasattr(project, key):
                setattr(project, key, value)
        
        project.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def delete_project(self, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        project = await self.get_project(project_id, user_id)
        if not project:
            return False
        
        await self.db.delete(project)
        await self.db.commit()
        return True

    async def create_answers(self, answers: list[ProjectAnswer]) -> list[ProjectAnswer]:
        self.db.add_all(answers)
        await self.db.commit()
        return answers

    async def get_answer(self, answer_id: uuid.UUID) -> Optional[ProjectAnswer]:
        query = (
            select(ProjectAnswer)
            .where(ProjectAnswer.id == answer_id)
            .options(selectinload(ProjectAnswer.project))
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_answer(self, answer_id: uuid.UUID, update_data: dict) -> Optional[ProjectAnswer]:
        answer = await self.get_answer(answer_id)
        if not answer:
            return None

        for key, value in update_data.items():
            if hasattr(answer, key):
                setattr(answer, key, value)

        answer.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(answer)
        return answer

    async def save_revision(
        self,
        answer_id: uuid.UUID,
        previous_text: Optional[str],
        new_text: str,
        revision_type: RevisionType,
        revision_request: Optional[str] = None,
        ai_review_text: Optional[str] = None,
    ) -> AnswerRevision:
        """버전 이력 저장."""
        # 현재 최대 revision_number 조회
        q = select(func.max(AnswerRevision.revision_number)).where(AnswerRevision.answer_id == answer_id)
        result = await self.db.execute(q)
        max_num = result.scalar_one_or_none() or 0

        revision = AnswerRevision(
            answer_id=answer_id,
            previous_text=previous_text,
            new_text=new_text,
            revision_type=revision_type,
            revision_request=revision_request,
            ai_review_text=ai_review_text,
            revision_number=max_num + 1,
        )
        self.db.add(revision)
        await self.db.commit()
        await self.db.refresh(revision)
        return revision

    async def get_versions(self, answer_id: uuid.UUID) -> Sequence[AnswerRevision]:
        """답변의 전체 버전 이력 조회 (최신순)."""
        q = (
            select(AnswerRevision)
            .where(AnswerRevision.answer_id == answer_id)
            .order_by(AnswerRevision.revision_number.desc())
        )
        result = await self.db.execute(q)
        return result.scalars().all()

    async def save_ai_review(self, revision_id: uuid.UUID, review_text: str) -> None:
        """최신 버전에 AI 검토 의견 저장."""
        q = select(AnswerRevision).where(AnswerRevision.id == revision_id)
        result = await self.db.execute(q)
        revision = result.scalar_one_or_none()
        if revision:
            revision.ai_review_text = review_text
            await self.db.commit()
