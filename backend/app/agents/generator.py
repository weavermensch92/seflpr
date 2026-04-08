from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.agents.prompt_loader import load_prompt
from app.agents.prompts.generator_prompts import GENERATOR_SYSTEM_PROMPT, GENERATOR_USER_TEMPLATE


class GeneratorAgent:
    def __init__(self, model_name: str = "gpt-5.4", temperature: float = 0.7):
        self.model_name = model_name
        self.temperature = temperature

    def _get_llm(self):
        return ChatOpenAI(
            model=self.model_name,
            temperature=self.temperature,
            api_key=settings.OPENAI_API_KEY,
        )

    async def generate_draft(
        self,
        company_name: str,
        position: str,
        question_number: int,
        question_text: str,
        char_limit: int,
        profiles_text: str,
        experience_level: str = "신입",
        company_research: str = "",
        tone: str = "정중한 존댓말",
        focus_keywords: str = "",
        db: Optional[AsyncSession] = None,
    ) -> str:
        system = await load_prompt(db, "generator_system", GENERATOR_SYSTEM_PROMPT)
        user_tmpl = await load_prompt(db, "generator_user", GENERATOR_USER_TEMPLATE)

        char_limit_min = max(char_limit - 100, 1)
        prompt = ChatPromptTemplate.from_messages([
            ("system", system),
            ("user", user_tmpl),
        ])
        chain = prompt | self._get_llm()
        result = await chain.ainvoke({
            "company_name": company_name,
            "position": position,
            "experience_level": experience_level,
            "question_number": question_number,
            "question_text": question_text,
            "char_limit": char_limit,
            "char_limit_min": char_limit_min,
            "profiles_text": profiles_text,
            "company_research": company_research or "기업 리서치 미수행",
            "focus_keywords": focus_keywords or "없음",
            "tone": tone,
        })
        return result.content
