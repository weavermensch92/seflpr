import uuid
from typing import Optional, Sequence
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.project import Project, ProjectAnswer, ProjectStatus, AnswerStatus
from app.repositories.project_repo import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectListResponse, ProjectResponse


class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProjectRepository(db)

    async def create_project(self, user_id: str, req: ProjectCreate) -> ProjectResponse:
        from app.services.point_service import PointService
        u_id = uuid.UUID(user_id)
        
        # 1. 포인트 차감 (30P)
        point_service = PointService(self.db)
        await point_service.deduct_points(
            user_id=u_id,
            amount=30,
            reason="project_create"
        )
        
        # 2. 프로젝트 생성
        project = Project(
            user_id=u_id,
            company_name=req.company_name,
            position=req.position,
            title=req.title,
            status=ProjectStatus.RESEARCHING,  # 바로 리서치 시작 단계로 설정
            generation_config=req.generation_config
        )
        
        new_project = await self.repo.create_project(project)
        
        # 3. 추가 정보: 포인트 트랜잭션에 reference_id 업데이트 (필요 시)
        # 4. 질문 목록 초기화
        answers = []
        for q_req in req.questions:
            answer = ProjectAnswer(
                project_id=new_project.id,
                question_number=q_req.question_number,
                question_text=q_req.question_text,
                char_limit=q_req.char_limit,
                status=AnswerStatus.PENDING
            )
            answers.append(answer)
        
        if answers:
            await self.repo.create_answers(answers)

        # 5. DB 커밋 (서비스 레이어에서 flush만 했으므로 여기서 최종 반영)
        await self.db.commit()
        
        # 프로젝트 정보 재조회 (질문 포함)
        return await self.get_project(str(new_project.id), user_id)

    async def list_projects(self, user_id: str) -> list[ProjectListResponse]:
        u_id = uuid.UUID(user_id)
        projects = await self.repo.list_projects(u_id)
        
        return [
            ProjectListResponse(
                id=p.id,
                company_name=p.company_name,
                position=p.position,
                title=p.title,
                status=p.status,
                created_at=p.created_at,
                updated_at=p.updated_at,
                answer_count=len(p.answers)
            )
            for p in projects
        ]

    async def get_project(self, project_id: str, user_id: str) -> ProjectResponse:
        p_id = uuid.UUID(project_id)
        u_id = uuid.UUID(user_id)
        
        project = await self.repo.get_project(p_id, u_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="프로젝트를 찾을 수 없습니다."
            )
            
        return ProjectResponse.model_validate(project)

    async def update_project(
        self,
        project_id: str,
        user_id: str,
        req: ProjectUpdate
    ) -> ProjectResponse:
        p_id = uuid.UUID(project_id)
        u_id = uuid.UUID(user_id)
        
        update_data = req.model_dump(exclude_unset=True)
        project = await self.repo.update_project(p_id, u_id, update_data)
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="프로젝트를 찾을 수 없습니다."
            )
            
        return ProjectResponse.model_validate(project)

    async def delete_project(self, project_id: str, user_id: str) -> bool:
        p_id = uuid.UUID(project_id)
        u_id = uuid.UUID(user_id)
        
        success = await self.repo.delete_project(p_id, u_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="프로젝트를 찾을 수 없습니다."
            )
        return True

    async def generate_answer(self, user_id: str, project_id: str, answer_id: str) -> ProjectResponse:
        """AI 에이전트를 활용하여 답변 초안을 생성합니다."""
        from app.agents.generator import GeneratorAgent
        from app.repositories.profile_repo import ProfileRepository
        
        p_id = uuid.UUID(project_id)
        u_id = uuid.UUID(user_id)
        a_id = uuid.UUID(answer_id)
        
        # 1. 데이터 조회
        project = await self.repo.get_project(p_id, u_id)
        answer = await self.repo.get_answer(a_id)
        if not project or not answer or answer.project_id != p_id:
            raise HTTPException(status_code=404, detail="관련 정보를 찾을 수 없습니다.")
            
        # 2. 관련 프로필 데이터 로드
        profile_repo = ProfileRepository(self.db)
        profiles = await profile_repo.list_by_user(u_id)
        
        profiles_text = "\n\n".join([
            f"[{p.profile_type}] {p.title}\n" + 
            (p.ai_interpreted_content if p.is_ai_memory and p.ai_interpreted_content else p.description)
            for p in profiles
        ])
        
        # 3. AI 에이전트 실행
        agent = GeneratorAgent()
        tone = project.generation_config.get("tone", "정중한 존댓말") if project.generation_config else "정중한 존댓말"
        focus = project.generation_config.get("focus_keywords", "") if project.generation_config else ""
        
        draft = await agent.generate_draft(
            company_name=project.company_name,
            position=project.position,
            question_number=answer.question_number,
            question_text=answer.question_text,
            char_limit=answer.char_limit or 500,
            profiles_text=profiles_text,
            tone=tone,
            focus_keywords=focus
        )
        
        # 4. 결과 저장
        await self.repo.update_answer(a_id, {
            "answer_text": draft,
            "status": AnswerStatus.DONE
        })
        
        return await self.get_project(project_id, user_id)

    async def revise_answer(self, user_id: str, project_id: str, answer_id: str, feedback: str) -> ProjectResponse:
        """사용자 피드백을 바탕으로 자소서를 첨삭합니다."""
        from app.agents.reviser import ReviserAgent
        
        p_id = uuid.UUID(project_id)
        u_id = uuid.UUID(user_id)
        a_id = uuid.UUID(answer_id)
        
        # 1. 데이터 조회
        project = await self.repo.get_project(p_id, u_id)
        answer = await self.repo.get_answer(a_id)
        if not project or not answer or answer.project_id != p_id:
            raise HTTPException(status_code=404, detail="관련 정보를 찾을 수 없습니다.")
        
        if not answer.answer_text:
            raise HTTPException(status_code=400, detail="첨삭할 기존 답변이 없습니다. 먼저 생성해주세요.")
            
        # 2. AI 에이전트 실행
        agent = ReviserAgent()
        revised = await agent.revise_answer(
            company_name=project.company_name,
            question_text=answer.question_text,
            char_limit=answer.char_limit or 500,
            original_answer=answer.answer_text,
            user_feedback=feedback
        )
        
        # 3. 결과 저장 (수정 횟수 차감 등 로직은 추후 고도화 가능)
        await self.repo.update_answer(a_id, {
            "answer_text": revised,
            "revisions_remaining": max(0, answer.revisions_remaining - 1)
        })
        
        return await self.get_project(project_id, user_id)

    async def save_user_edit(self, user_id: str, project_id: str, answer_id: str, edited_text: str) -> ProjectResponse:
        """유저 직접 수정 저장 + 버전 이력 기록."""
        from app.models.project import RevisionType

        p_id, u_id, a_id = uuid.UUID(project_id), uuid.UUID(user_id), uuid.UUID(answer_id)
        project = await self.repo.get_project(p_id, u_id)
        answer = await self.repo.get_answer(a_id)
        if not project or not answer or answer.project_id != p_id:
            raise HTTPException(status_code=404, detail="관련 정보를 찾을 수 없습니다.")

        previous = answer.answer_text
        await self.repo.save_revision(
            answer_id=a_id,
            previous_text=previous,
            new_text=edited_text,
            revision_type=RevisionType.USER_EDIT,
        )
        await self.repo.update_answer(a_id, {"answer_text": edited_text})
        return await self.get_project(project_id, user_id)

    async def ai_review(self, user_id: str, project_id: str, answer_id: str, current_text: str) -> dict:
        """현재 텍스트에 대한 AI 검토 의견 반환."""
        from app.agents.reviewer import ReviewerAgent

        p_id, u_id, a_id = uuid.UUID(project_id), uuid.UUID(user_id), uuid.UUID(answer_id)
        project = await self.repo.get_project(p_id, u_id)
        answer = await self.repo.get_answer(a_id)
        if not project or not answer or answer.project_id != p_id:
            raise HTTPException(status_code=404, detail="관련 정보를 찾을 수 없습니다.")

        agent = ReviewerAgent()
        experience_level = "신입"
        if project.generation_config:
            yrs = project.generation_config.get("experience_years", 0)
            experience_level = f"{yrs}년차" if yrs else "신입"

        # 작성 의견
        opinion = await agent.get_opinion(current_text)

        # 이전 버전이 있으면 비교 평가
        compare = None
        versions = await self.repo.get_versions(a_id)
        if versions and answer.answer_text and answer.answer_text != current_text:
            compare = await agent.compare_versions(
                company_name=project.company_name,
                position=project.position,
                experience_level=experience_level,
                previous_version=answer.answer_text,
                current_version=current_text,
            )

        return {"opinion": opinion, "compare": compare}

    async def apply_review(
        self, user_id: str, project_id: str, answer_id: str, current_text: str, ai_review: str
    ) -> ProjectResponse:
        """AI 검토 의견을 반영하여 새 버전 생성 및 저장."""
        from app.agents.reviewer import ReviewerAgent
        from app.models.project import RevisionType

        p_id, u_id, a_id = uuid.UUID(project_id), uuid.UUID(user_id), uuid.UUID(answer_id)
        project = await self.repo.get_project(p_id, u_id)
        answer = await self.repo.get_answer(a_id)
        if not project or not answer or answer.project_id != p_id:
            raise HTTPException(status_code=404, detail="관련 정보를 찾을 수 없습니다.")

        agent = ReviewerAgent()
        new_text = await agent.apply_review(
            current_version=current_text,
            ai_review=ai_review,
            char_limit=answer.char_limit or 500,
        )

        await self.repo.save_revision(
            answer_id=a_id,
            previous_text=current_text,
            new_text=new_text,
            revision_type=RevisionType.AI_REVIEW_APPLIED,
            ai_review_text=ai_review,
        )
        await self.repo.update_answer(a_id, {"answer_text": new_text})
        return await self.get_project(project_id, user_id)

    async def get_versions(self, user_id: str, project_id: str, answer_id: str) -> list:
        """답변 버전 이력 반환."""
        p_id, u_id, a_id = uuid.UUID(project_id), uuid.UUID(user_id), uuid.UUID(answer_id)
        project = await self.repo.get_project(p_id, u_id)
        answer = await self.repo.get_answer(a_id)
        if not project or not answer or answer.project_id != p_id:
            raise HTTPException(status_code=404, detail="관련 정보를 찾을 수 없습니다.")
        return await self.repo.get_versions(a_id)

    async def humanize_detect(self, user_id: str, project_id: str, answer_id: str, current_text: str) -> dict:
        """AI 냄새 패턴 감지."""
        from app.agents.humanizer import HumanizerAgent

        p_id, u_id, a_id = uuid.UUID(project_id), uuid.UUID(user_id), uuid.UUID(answer_id)
        project = await self.repo.get_project(p_id, u_id)
        answer = await self.repo.get_answer(a_id)
        if not project or not answer or answer.project_id != p_id:
            raise HTTPException(status_code=404, detail="관련 정보를 찾을 수 없습니다.")

        agent = HumanizerAgent()
        diagnosis = await agent.detect(current_text)

        # AI 강도 파싱
        ai_level = "보통"
        lower = diagnosis.lower()
        if "높음" in lower:
            ai_level = "높음"
        elif "낮음" in lower:
            ai_level = "낮음"

        return {"diagnosis": diagnosis, "ai_level": ai_level}

    async def humanize_rewrite(self, user_id: str, project_id: str, answer_id: str, current_text: str) -> dict:
        """AI 어투 제거 후 인간적 문체로 재작성 + 버전 저장."""
        from app.agents.humanizer import HumanizerAgent
        from app.models.project import RevisionType

        p_id, u_id, a_id = uuid.UUID(project_id), uuid.UUID(user_id), uuid.UUID(answer_id)
        project = await self.repo.get_project(p_id, u_id)
        answer = await self.repo.get_answer(a_id)
        if not project or not answer or answer.project_id != p_id:
            raise HTTPException(status_code=404, detail="관련 정보를 찾을 수 없습니다.")

        agent = HumanizerAgent()
        rewritten = await agent.rewrite(
            answer_text=current_text,
            char_limit=answer.char_limit or 500,
        )

        # 버전 저장
        await self.repo.save_revision(
            answer_id=a_id,
            previous_text=answer.answer_text,
            new_text=rewritten,
            revision_type=RevisionType.AI_REVISED,
            revision_request="AI 어투 제거 — 인간화",
        )
        await self.repo.update_answer(a_id, {"answer_text": rewritten})
        return {"rewritten_text": rewritten}

    async def gap_analysis(self, user_id: str, project_id: str) -> dict:
        """프로필 갭 분석 실행."""
        from app.agents.gap_analyzer import GapAnalyzerAgent
        from app.repositories.profile_repo import ProfileRepository
        from app.repositories.company_repo import CompanyRepository

        p_id, u_id = uuid.UUID(project_id), uuid.UUID(user_id)
        project = await self.repo.get_project(p_id, u_id)
        if not project:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

        profile_repo = ProfileRepository(self.db)
        profiles = await profile_repo.list_profiles(u_id)
        profiles_text = "\n\n".join([
            f"[{p.profile_type}] {p.title}\n{getattr(p, '_description_plain', '') or ''}"
            for p in profiles
        ])

        company_research = ""
        if project.company_cache_id:
            company_repo = CompanyRepository(self.db)
            cache = await company_repo.get_cache_by_id(project.company_cache_id)
            if cache:
                company_research = str(cache.research_data or "")

        experience_level = "신입"
        if project.generation_config:
            yrs = project.generation_config.get("experience_years", 0)
            experience_level = f"{yrs}년차" if yrs else "신입"

        agent = GapAnalyzerAgent()
        return await agent.analyze(
            company_name=project.company_name,
            position=project.position,
            experience_level=experience_level,
            profiles_text=profiles_text,
            company_research=company_research,
        )

    async def research_company(self, user_id: str, project_id: str) -> ProjectResponse:
        """기업과 직무에 대한 정보를 리서치하고 캐시를 업데이트합니다."""
        from app.agents.researcher import ResearcherAgent
        from app.repositories.company_repo import CompanyRepository
        
        p_id = uuid.UUID(project_id)
        u_id = uuid.UUID(user_id)
        
        # 1. 프로젝트 조회
        project = await self.repo.get_project(p_id, u_id)
        if not project:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
        
        # 2. 리서치 실행
        agent = ResearcherAgent()
        research_data = await agent.fetch_company_info(project.company_name, project.position)
        
        # 3. 캐시 저장 
        company_repo = CompanyRepository(self.db)
        cache = await company_repo.get_cache(project.company_name, project.position)
        
        if cache:
            await company_repo.update_cache(cache.id, research_data)
        else:
            cache = await company_repo.create_cache(project.company_name, project.position, research_data)
            
        # 4. 프로젝트에 캐시 아이디 연결 및 상태 업데이트
        await self.repo.update_project(p_id, u_id, {
            "company_cache_id": cache.id,
            "status": ProjectStatus.RESEARCHING
        })
        
        return await self.get_project(project_id, user_id)
