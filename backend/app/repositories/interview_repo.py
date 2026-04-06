import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interview import (
    InterviewSession, InterviewSessionStatus,
    InterviewQuestion, InterviewAnswer, QuestionType,
)


class InterviewRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Session ───────────────────────────────────────────────

    async def create_session(
        self,
        user_id: uuid.UUID,
        project_id: uuid.UUID,
        cover_letter_snapshot: str | None = None,
    ) -> InterviewSession:
        session = InterviewSession(
            user_id=user_id,
            project_id=project_id,
            cover_letter_snapshot=cover_letter_snapshot,
            status=InterviewSessionStatus.GENERATING,
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_session(self, session_id: uuid.UUID, user_id: uuid.UUID) -> InterviewSession | None:
        result = await self.db.execute(
            select(InterviewSession)
            .where(InterviewSession.id == session_id, InterviewSession.user_id == user_id)
            .options(
                selectinload(InterviewSession.questions)
                .selectinload(InterviewQuestion.answers)
            )
        )
        return result.scalar_one_or_none()

    async def list_sessions(self, project_id: uuid.UUID, user_id: uuid.UUID) -> list[InterviewSession]:
        result = await self.db.execute(
            select(InterviewSession)
            .where(
                InterviewSession.project_id == project_id,
                InterviewSession.user_id == user_id,
            )
            .order_by(InterviewSession.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_session(self, session: InterviewSession, data: dict) -> InterviewSession:
        for k, v in data.items():
            setattr(session, k, v)
        await self.db.flush()
        return session

    # ── Question ──────────────────────────────────────────────

    async def add_question(
        self,
        session_id: uuid.UUID,
        question_number: int,
        question_type: QuestionType,
        question_text: str,
        hint_text: str | None = None,
        reference_links: list | None = None,
        is_follow_up: bool = False,
        parent_question_id: uuid.UUID | None = None,
        points_consumed: int = 0,
    ) -> InterviewQuestion:
        q = InterviewQuestion(
            session_id=session_id,
            question_number=question_number,
            question_type=question_type,
            question_text=question_text,
            hint_text=hint_text,
            reference_links=reference_links,
            is_follow_up=is_follow_up,
            parent_question_id=parent_question_id,
            points_consumed=points_consumed,
        )
        self.db.add(q)
        await self.db.flush()
        return q

    async def get_question(self, question_id: uuid.UUID) -> InterviewQuestion | None:
        result = await self.db.execute(
            select(InterviewQuestion)
            .where(InterviewQuestion.id == question_id)
            .options(selectinload(InterviewQuestion.answers))
        )
        return result.scalar_one_or_none()

    async def count_follow_ups(self, parent_question_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(InterviewQuestion)
            .where(InterviewQuestion.parent_question_id == parent_question_id)
        )
        return result.scalar_one()

    async def get_next_question_number(self, session_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.coalesce(func.max(InterviewQuestion.question_number), 0))
            .where(InterviewQuestion.session_id == session_id)
        )
        return result.scalar_one() + 1

    # ── Answer ────────────────────────────────────────────────

    async def add_answer(
        self,
        question_id: uuid.UUID,
        user_id: uuid.UUID,
        answer_text: str,
        attempt_number: int = 1,
    ) -> InterviewAnswer:
        answer = InterviewAnswer(
            question_id=question_id,
            user_id=user_id,
            answer_text=answer_text,
            attempt_number=attempt_number,
        )
        self.db.add(answer)
        await self.db.flush()
        return answer

    async def update_answer(self, answer: InterviewAnswer, data: dict) -> InterviewAnswer:
        for k, v in data.items():
            setattr(answer, k, v)
        await self.db.flush()
        return answer

    async def get_all_qa_for_session(self, session_id: uuid.UUID) -> list[dict]:
        """세션의 모든 Q&A를 질문 순서대로 반환 (요약용)."""
        result = await self.db.execute(
            select(InterviewQuestion)
            .where(InterviewQuestion.session_id == session_id)
            .options(selectinload(InterviewQuestion.answers))
            .order_by(InterviewQuestion.question_number)
        )
        questions = result.scalars().all()
        qa_list = []
        for q in questions:
            for a in q.answers:
                qa_list.append({
                    "question_number": q.question_number,
                    "question_type": q.question_type.value,
                    "question_text": q.question_text,
                    "answer_text": a.answer_text,
                    "ai_feedback": a.ai_feedback,
                })
        return qa_list
