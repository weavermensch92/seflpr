import json
import logging
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.agents.prompt_loader import load_prompt
from app.agents.prompts.interview_prompts import (
    INTERVIEW_FEEDBACK_SYSTEM,
    INTERVIEW_FEEDBACK_USER,
    INTERVIEW_SUMMARY_USER,
)

logger = logging.getLogger(__name__)


class InterviewFeedbackAgent:
    def __init__(self, model_name: str = "gpt-5.4", temperature: float = 0.3):
        self.model_name = model_name
        self.temperature = temperature

    def _get_llm(self):
        return ChatOpenAI(
            model=self.model_name,
            api_key=settings.OPENAI_API_KEY,
            temperature=self.temperature,
        )

    async def generate_feedback(
        self,
        question_text: str,
        question_type: str,
        answer_text: str,
        cover_letter: str = "",
        db: AsyncSession | None = None,
    ) -> dict:
        """답변에 대한 AI 피드백을 생성합니다."""
        system = await load_prompt(db, "interview_feedback_system", INTERVIEW_FEEDBACK_SYSTEM)
        user_tmpl = await load_prompt(db, "interview_feedback_user", INTERVIEW_FEEDBACK_USER)

        prompt = ChatPromptTemplate.from_messages([
            ("system", system),
            ("user", user_tmpl),
        ])
        chain = prompt | self._get_llm()

        try:
            result = await chain.ainvoke({
                "question_text": question_text,
                "question_type": question_type,
                "answer_text": answer_text[:3000],
                "cover_letter": cover_letter[:4000],
            })
            return json.loads(result.content)
        except Exception as e:
            logger.error(f"Interview feedback generation failed: {e}")
            return {
                "feedback": "피드백 생성에 실패했습니다. 다시 시도해주세요.",
                "strengths": [],
                "weaknesses": [],
                "study_recommendations": [],
            }

    async def generate_session_summary(
        self,
        qa_list: list[dict],
        db: AsyncSession | None = None,
    ) -> dict:
        """세션 전체 Q&A를 종합 분석합니다."""
        system = await load_prompt(db, "interview_feedback_system", INTERVIEW_FEEDBACK_SYSTEM)
        user_tmpl = await load_prompt(db, "interview_summary_user", INTERVIEW_SUMMARY_USER)

        # Q&A 포맷팅
        qa_text = ""
        for qa in qa_list:
            qa_text += f"\n### Q{qa['question_number']}. [{qa['question_type']}] {qa['question_text']}\n"
            qa_text += f"**답변:** {qa['answer_text']}\n"
            if qa.get('ai_feedback'):
                qa_text += f"**이전 피드백:** {qa['ai_feedback']}\n"

        prompt = ChatPromptTemplate.from_messages([
            ("system", system),
            ("user", user_tmpl),
        ])
        chain = prompt | self._get_llm()

        try:
            result = await chain.ainvoke({"all_qa": qa_text[:8000]})
            return json.loads(result.content)
        except Exception as e:
            logger.error(f"Session summary generation failed: {e}")
            return {
                "overall_score": 50,
                "strengths": ["분석 중 오류가 발생했습니다."],
                "weaknesses": [],
                "improvement_tips": ["다시 시도해주세요."],
                "study_plan": [],
                "question_scores": [],
            }
