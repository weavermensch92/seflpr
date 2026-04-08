import json
import logging
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.agents.prompt_loader import load_prompt
from app.agents.prompts.interview_prompts import (
    INTERVIEW_GENERATOR_SYSTEM,
    INTERVIEW_GENERATOR_USER,
    INTERVIEW_FOLLOW_UP_USER,
)

logger = logging.getLogger(__name__)


class InterviewGeneratorAgent:
    def __init__(self, model_name: str = "gpt-5.4", temperature: float = 0.5):
        self.model_name = model_name
        self.temperature = temperature

    def _get_llm(self):
        return ChatOpenAI(
            model=self.model_name,
            api_key=settings.OPENAI_API_KEY,
            temperature=self.temperature,
        )

    async def generate_questions(
        self,
        company_name: str,
        position: str,
        cover_letter: str,
        company_research: str = "",
        num_questions: int = 5,
        db: AsyncSession | None = None,
    ) -> list[dict]:
        """초기 면접 질문을 생성합니다."""
        system = await load_prompt(db, "interview_generator_system", INTERVIEW_GENERATOR_SYSTEM)
        user_tmpl = await load_prompt(db, "interview_generator_user", INTERVIEW_GENERATOR_USER)

        prompt = ChatPromptTemplate.from_messages([
            ("system", system),
            ("user", user_tmpl),
        ])
        chain = prompt | self._get_llm()

        try:
            result = await chain.ainvoke({
                "company_name": company_name,
                "position": position,
                "cover_letter": cover_letter[:6000],
                "company_research": company_research[:3000],
                "num_questions": num_questions,
            })
            data = json.loads(result.content)
            return data.get("questions", [])
        except Exception as e:
            logger.error(f"Interview question generation failed: {e}")
            # 폴백: 기본 질문 5개
            return [
                {"question_type": "resume", "question_text": "자기소개서에서 가장 자신 있는 경험을 구체적으로 설명해주세요.", "hint_text": "STAR 기법으로 답변하세요."},
                {"question_type": "resume", "question_text": "해당 경험에서 가장 어려웠던 점과 어떻게 극복했는지 알려주세요.", "hint_text": "문제 인식 → 해결 과정 → 결과 순서로 답하세요."},
                {"question_type": "values", "question_text": f"{company_name}에 지원하게 된 동기는 무엇인가요?", "hint_text": "기업의 가치관과 본인의 목표를 연결하세요."},
                {"question_type": "technical", "question_text": f"{position} 직무에서 가장 중요한 역량은 무엇이라고 생각하나요?", "hint_text": "구체적인 경험과 함께 설명하세요."},
                {"question_type": "situational", "question_text": "팀 내 의견 충돌이 발생했을 때 어떻게 대처하시겠습니까?", "hint_text": "실제 경험이 있다면 그 사례를 활용하세요."},
            ]

    async def generate_follow_up(
        self,
        original_question: str,
        user_answer: str,
        cover_letter: str,
        db: AsyncSession | None = None,
    ) -> dict:
        """꼬리 질문 1개를 생성합니다."""
        system = await load_prompt(db, "interview_generator_system", INTERVIEW_GENERATOR_SYSTEM)
        user_tmpl = await load_prompt(db, "interview_follow_up_user", INTERVIEW_FOLLOW_UP_USER)

        prompt = ChatPromptTemplate.from_messages([
            ("system", system),
            ("user", user_tmpl),
        ])
        chain = prompt | self._get_llm()

        try:
            result = await chain.ainvoke({
                "original_question": original_question,
                "user_answer": user_answer[:3000],
                "cover_letter": cover_letter[:4000],
            })
            return json.loads(result.content)
        except Exception as e:
            logger.error(f"Follow-up generation failed: {e}")
            return {
                "question_type": "resume",
                "question_text": "방금 답변에서 언급한 부분을 좀 더 구체적으로 설명해주실 수 있나요?",
                "hint_text": "수치나 구체적인 사례를 포함해서 답변하세요.",
            }
