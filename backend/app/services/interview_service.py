import uuid
import logging
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.repositories.interview_repo import InterviewRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.company_repo import CompanyRepository
from app.services.point_service import PointService
from app.models.interview import InterviewSessionStatus, QuestionType
from app.schemas.interview import (
    SessionResponse, SessionListItem, QuestionResponse, AnswerResponse,
    SessionSummaryResponse,
)

logger = logging.getLogger(__name__)


def _to_question_response(q) -> QuestionResponse:
    follow_up_count = len([fq for fq in getattr(q, 'follow_ups', [])]) if hasattr(q, 'follow_ups') else 0
    return QuestionResponse(
        id=q.id,
        question_number=q.question_number,
        question_type=q.question_type,
        question_text=q.question_text,
        hint_text=q.hint_text,
        reference_links=q.reference_links,
        is_follow_up=q.is_follow_up,
        parent_question_id=q.parent_question_id,
        points_consumed=q.points_consumed,
        follow_up_count=follow_up_count,
        answers=[AnswerResponse(
            id=a.id,
            question_id=a.question_id,
            answer_text=a.answer_text,
            ai_feedback=a.ai_feedback,
            study_recommendations=a.study_recommendations,
            reference_links=a.reference_links,
            attempt_number=a.attempt_number,
            created_at=a.created_at,
        ) for a in (q.answers or [])],
        created_at=q.created_at,
    )


def _to_session_response(session, project=None) -> SessionResponse:
    return SessionResponse(
        id=session.id,
        project_id=session.project_id,
        user_id=session.user_id,
        status=session.status,
        total_questions=session.total_questions,
        total_follow_ups=session.total_follow_ups,
        total_points_spent=session.total_points_spent,
        created_at=session.created_at,
        completed_at=session.completed_at,
        questions=[_to_question_response(q) for q in (session.questions or [])],
        company_name=project.company_name if project else None,
        position=project.position if project else None,
    )


class InterviewService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = InterviewRepository(db)
        self.project_repo = ProjectRepository(db)
        self.point_service = PointService(db)

    async def start_session(self, user_id: str, project_id: str) -> SessionResponse:
        """면접 세션을 시작합니다. 60P 차감 + 초기 5개 질문 생성."""
        u_id = uuid.UUID(user_id)
        p_id = uuid.UUID(project_id)

        # 1. 프로젝트 조회
        project = await self.project_repo.get_project(p_id, u_id)
        if not project:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

        # 2. 포인트 차감
        await self.point_service.deduct_points(
            u_id, settings.INTERVIEW_SESSION_COST_POINTS, "interview_session_start",
            reference_id=p_id,
        )

        # 3. 자소서 스냅샷 생성
        cover_letter = ""
        for answer in (project.answers or []):
            if answer.answer_text:
                cover_letter += f"[{answer.question_text}]\n{answer.answer_text}\n\n"

        # 4. 세션 생성
        session = await self.repo.create_session(u_id, p_id, cover_letter or None)

        # 5. 기업 리서치 캐시 조회
        company_research = ""
        if project.company_cache_id:
            company_repo = CompanyRepository(self.db)
            cache = await company_repo.get_cache_by_id(project.company_cache_id)
            if cache and cache.research_data:
                company_research = str(cache.research_data)

        # 6. AI 질문 생성
        from app.agents.interview_generator import InterviewGeneratorAgent
        agent = InterviewGeneratorAgent()
        questions_data = await agent.generate_questions(
            company_name=project.company_name,
            position=project.position,
            cover_letter=cover_letter,
            company_research=company_research,
            num_questions=5,
            db=self.db,
        )

        # 7. 질문 DB 저장
        for i, q_data in enumerate(questions_data, 1):
            q_type = q_data.get("question_type", "resume")
            try:
                q_type_enum = QuestionType(q_type)
            except ValueError:
                q_type_enum = QuestionType.RESUME

            await self.repo.add_question(
                session_id=session.id,
                question_number=i,
                question_type=q_type_enum,
                question_text=q_data.get("question_text", ""),
                hint_text=q_data.get("hint_text"),
                points_consumed=0,  # 초기 질문은 세션 비용에 포함
            )

        # 8. 세션 상태 업데이트
        await self.repo.update_session(session, {
            "status": InterviewSessionStatus.READY,
            "total_questions": len(questions_data),
            "total_points_spent": settings.INTERVIEW_SESSION_COST_POINTS,
        })

        await self.db.commit()

        # 9. 응답
        session = await self.repo.get_session(session.id, u_id)
        return _to_session_response(session, project)

    async def get_session(self, user_id: str, project_id: str, session_id: str) -> SessionResponse:
        u_id = uuid.UUID(user_id)
        s_id = uuid.UUID(session_id)
        p_id = uuid.UUID(project_id)

        session = await self.repo.get_session(s_id, u_id)
        if not session or session.project_id != p_id:
            raise HTTPException(status_code=404, detail="면접 세션을 찾을 수 없습니다.")

        project = await self.project_repo.get_project(p_id, u_id)
        return _to_session_response(session, project)

    async def list_sessions(self, user_id: str, project_id: str) -> list[SessionListItem]:
        u_id = uuid.UUID(user_id)
        p_id = uuid.UUID(project_id)

        project = await self.project_repo.get_project(p_id, u_id)
        if not project:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

        sessions = await self.repo.list_sessions(p_id, u_id)
        return [
            SessionListItem(
                id=s.id,
                project_id=s.project_id,
                status=s.status,
                total_questions=s.total_questions,
                total_points_spent=s.total_points_spent,
                created_at=s.created_at,
                completed_at=s.completed_at,
                company_name=project.company_name,
                position=project.position,
            )
            for s in sessions
        ]

    async def submit_answer(
        self, user_id: str, project_id: str, session_id: str,
        question_id: str, answer_text: str,
    ) -> AnswerResponse:
        """답변을 제출하고 AI 피드백을 생성합니다."""
        u_id = uuid.UUID(user_id)
        s_id = uuid.UUID(session_id)
        q_id = uuid.UUID(question_id)

        session = await self.repo.get_session(s_id, u_id)
        if not session:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

        question = await self.repo.get_question(q_id)
        if not question or question.session_id != s_id:
            raise HTTPException(status_code=404, detail="질문을 찾을 수 없습니다.")

        # 답변 저장
        answer = await self.repo.add_answer(q_id, u_id, answer_text)

        # 세션 상태 업데이트
        if session.status == InterviewSessionStatus.READY:
            await self.repo.update_session(session, {"status": InterviewSessionStatus.IN_PROGRESS})

        # AI 피드백 생성
        from app.agents.interview_feedback import InterviewFeedbackAgent
        agent = InterviewFeedbackAgent()
        feedback_data = await agent.generate_feedback(
            question_text=question.question_text,
            question_type=question.question_type.value,
            answer_text=answer_text,
            cover_letter=session.cover_letter_snapshot or "",
            db=self.db,
        )

        # 피드백 저장
        await self.repo.update_answer(answer, {
            "ai_feedback": feedback_data.get("feedback", ""),
            "study_recommendations": feedback_data.get("study_recommendations", []),
        })

        await self.db.commit()

        return AnswerResponse(
            id=answer.id,
            question_id=answer.question_id,
            answer_text=answer.answer_text,
            ai_feedback=answer.ai_feedback,
            study_recommendations=answer.study_recommendations,
            reference_links=answer.reference_links,
            attempt_number=answer.attempt_number,
            created_at=answer.created_at,
        )

    async def request_follow_up(
        self, user_id: str, project_id: str, session_id: str,
        parent_question_id: str,
    ) -> QuestionResponse:
        """꼬리 질문을 요청합니다 (1P)."""
        u_id = uuid.UUID(user_id)
        s_id = uuid.UUID(session_id)
        pq_id = uuid.UUID(parent_question_id)

        session = await self.repo.get_session(s_id, u_id)
        if not session:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

        parent_q = await self.repo.get_question(pq_id)
        if not parent_q or parent_q.session_id != s_id:
            raise HTTPException(status_code=404, detail="질문을 찾을 수 없습니다.")

        # 꼬리 질문 제한 확인
        follow_up_count = await self.repo.count_follow_ups(pq_id)
        if follow_up_count >= settings.MAX_FOLLOW_UPS_PER_QUESTION:
            raise HTTPException(
                status_code=400,
                detail=f"이 질문에 대한 꼬리 질문은 최대 {settings.MAX_FOLLOW_UPS_PER_QUESTION}개까지 가능합니다."
            )

        # 포인트 차감
        await self.point_service.deduct_points(
            u_id, settings.INTERVIEW_FOLLOW_UP_POINTS, "interview_follow_up",
            reference_id=s_id,
        )

        # 부모 질문의 마지막 답변 가져오기
        user_answer = ""
        if parent_q.answers:
            user_answer = parent_q.answers[-1].answer_text

        # AI 꼬리 질문 생성
        from app.agents.interview_generator import InterviewGeneratorAgent
        agent = InterviewGeneratorAgent()
        follow_up_data = await agent.generate_follow_up(
            original_question=parent_q.question_text,
            user_answer=user_answer,
            cover_letter=session.cover_letter_snapshot or "",
            db=self.db,
        )

        # DB 저장
        next_num = await self.repo.get_next_question_number(s_id)
        q_type = follow_up_data.get("question_type", parent_q.question_type.value)
        try:
            q_type_enum = QuestionType(q_type)
        except ValueError:
            q_type_enum = parent_q.question_type

        new_q = await self.repo.add_question(
            session_id=s_id,
            question_number=next_num,
            question_type=q_type_enum,
            question_text=follow_up_data.get("question_text", ""),
            hint_text=follow_up_data.get("hint_text"),
            is_follow_up=True,
            parent_question_id=pq_id,
            points_consumed=settings.INTERVIEW_FOLLOW_UP_POINTS,
        )

        # 세션 카운터 업데이트
        await self.repo.update_session(session, {
            "total_questions": session.total_questions + 1,
            "total_follow_ups": session.total_follow_ups + 1,
            "total_points_spent": session.total_points_spent + settings.INTERVIEW_FOLLOW_UP_POINTS,
        })

        await self.db.commit()
        return _to_question_response(new_q)

    async def request_new_question(
        self, user_id: str, project_id: str, session_id: str,
    ) -> QuestionResponse:
        """신규 질문을 요청합니다 (3P)."""
        u_id = uuid.UUID(user_id)
        s_id = uuid.UUID(session_id)

        session = await self.repo.get_session(s_id, u_id)
        if not session:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

        if session.total_questions >= settings.MAX_INTERVIEW_QUESTIONS:
            raise HTTPException(status_code=400, detail=f"세션당 최대 {settings.MAX_INTERVIEW_QUESTIONS}개 질문까지 가능합니다.")

        # 포인트 차감
        await self.point_service.deduct_points(
            u_id, settings.INTERVIEW_NEW_QUESTION_POINTS, "interview_new_question",
            reference_id=s_id,
        )

        # AI 질문 1개 생성
        from app.agents.interview_generator import InterviewGeneratorAgent
        agent = InterviewGeneratorAgent()

        p_id = uuid.UUID(project_id)
        project = await self.project_repo.get_project(p_id, u_id)

        company_research = ""
        if project and project.company_cache_id:
            company_repo = CompanyRepository(self.db)
            cache = await company_repo.get_cache_by_id(project.company_cache_id)
            if cache and cache.research_data:
                company_research = str(cache.research_data)

        questions_data = await agent.generate_questions(
            company_name=project.company_name if project else "",
            position=project.position if project else "",
            cover_letter=session.cover_letter_snapshot or "",
            company_research=company_research,
            num_questions=1,
            db=self.db,
        )

        q_data = questions_data[0] if questions_data else {
            "question_type": "resume",
            "question_text": "추가 질문을 생성하지 못했습니다. 다시 시도해주세요.",
        }

        next_num = await self.repo.get_next_question_number(s_id)
        q_type = q_data.get("question_type", "resume")
        try:
            q_type_enum = QuestionType(q_type)
        except ValueError:
            q_type_enum = QuestionType.RESUME

        new_q = await self.repo.add_question(
            session_id=s_id,
            question_number=next_num,
            question_type=q_type_enum,
            question_text=q_data.get("question_text", ""),
            hint_text=q_data.get("hint_text"),
            points_consumed=settings.INTERVIEW_NEW_QUESTION_POINTS,
        )

        await self.repo.update_session(session, {
            "total_questions": session.total_questions + 1,
            "total_points_spent": session.total_points_spent + settings.INTERVIEW_NEW_QUESTION_POINTS,
        })

        await self.db.commit()
        return _to_question_response(new_q)

    async def complete_session(
        self, user_id: str, project_id: str, session_id: str,
    ) -> SessionSummaryResponse:
        """세션을 종료하고 AI 종합 분석을 생성합니다."""
        u_id = uuid.UUID(user_id)
        s_id = uuid.UUID(session_id)

        session = await self.repo.get_session(s_id, u_id)
        if not session:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

        # 전체 Q&A 수집
        qa_list = await self.repo.get_all_qa_for_session(s_id)
        if not qa_list:
            raise HTTPException(status_code=400, detail="답변이 없어 요약을 생성할 수 없습니다.")

        # AI 종합 분석
        from app.agents.interview_feedback import InterviewFeedbackAgent
        agent = InterviewFeedbackAgent()
        summary = await agent.generate_session_summary(qa_list, db=self.db)

        # 세션 완료 처리
        await self.repo.update_session(session, {
            "status": InterviewSessionStatus.DONE,
            "completed_at": datetime.now(timezone.utc),
        })

        await self.db.commit()

        return SessionSummaryResponse(
            overall_score=summary.get("overall_score", 50),
            strengths=summary.get("strengths", []),
            weaknesses=summary.get("weaknesses", []),
            improvement_tips=summary.get("improvement_tips", []),
            study_plan=summary.get("study_plan", []),
            question_scores=summary.get("question_scores", []),
        )
