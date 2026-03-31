from typing import Optional
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.agents.prompt_loader import load_prompt
from app.agents.prompts.reviewer_prompts import (
    REVIEWER_SYSTEM_PROMPT,
    REVIEWER_OPINION_TEMPLATE,
    REVIEWER_COMPARE_TEMPLATE,
    APPLY_REVIEW_TEMPLATE,
)


class ReviewerAgent:
    def __init__(self, model_name: str = "claude-sonnet-4-6", temperature: float = 0.3):
        self.llm = ChatAnthropic(
            model=model_name,
            temperature=temperature,
            api_key=settings.ANTHROPIC_API_KEY,
        )

    async def get_opinion(self, answer_text: str, db: Optional[AsyncSession] = None) -> str:
        system = await load_prompt(db, "reviewer_system", REVIEWER_SYSTEM_PROMPT)
        user_tmpl = await load_prompt(db, "reviewer_opinion", REVIEWER_OPINION_TEMPLATE)
        prompt = ChatPromptTemplate.from_messages([("system", system), ("user", user_tmpl)])
        result = await (prompt | self.llm).ainvoke({"answer_text": answer_text})
        return result.content

    async def compare_versions(
        self,
        company_name: str,
        position: str,
        experience_level: str,
        previous_version: str,
        current_version: str,
        ideal_criteria: str = "",
        db: Optional[AsyncSession] = None,
    ) -> str:
        system = await load_prompt(db, "reviewer_system", REVIEWER_SYSTEM_PROMPT)
        user_tmpl = await load_prompt(db, "reviewer_compare", REVIEWER_COMPARE_TEMPLATE)
        prompt = ChatPromptTemplate.from_messages([("system", system), ("user", user_tmpl)])
        result = await (prompt | self.llm).ainvoke({
            "company_name": company_name,
            "position": position,
            "experience_level": experience_level,
            "previous_version": previous_version,
            "current_version": current_version,
            "ideal_criteria": ideal_criteria or "포지션 최적 자소서 기준 적용",
        })
        return result.content

    async def apply_review(
        self,
        current_version: str,
        ai_review: str,
        char_limit: int,
        db: Optional[AsyncSession] = None,
    ) -> str:
        char_limit_min = max(char_limit - 100, 1)
        system = await load_prompt(db, "reviewer_system", REVIEWER_SYSTEM_PROMPT)
        user_tmpl = await load_prompt(db, "apply_review", APPLY_REVIEW_TEMPLATE)
        prompt = ChatPromptTemplate.from_messages([("system", system), ("user", user_tmpl)])
        result = await (prompt | self.llm).ainvoke({
            "current_version": current_version,
            "ai_review": ai_review,
            "char_limit": char_limit,
            "char_limit_min": char_limit_min,
        })
        return result.content
