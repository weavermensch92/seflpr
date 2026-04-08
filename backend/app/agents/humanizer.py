from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.agents.prompt_loader import load_prompt
from app.agents.prompts.humanizer_prompts import (
    HUMANIZER_SYSTEM_PROMPT,
    HUMANIZER_DETECT_TEMPLATE,
    HUMANIZER_REWRITE_TEMPLATE,
)


class HumanizerAgent:
    def __init__(self, model_name: str = "gpt-4o", temperature: float = 0.6):
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=settings.OPENAI_API_KEY,
        )

    async def detect(self, answer_text: str, db: Optional[AsyncSession] = None) -> str:
        system = await load_prompt(db, "humanizer_system", HUMANIZER_SYSTEM_PROMPT)
        user_tmpl = await load_prompt(db, "humanizer_detect", HUMANIZER_DETECT_TEMPLATE)
        prompt = ChatPromptTemplate.from_messages([("system", system), ("user", user_tmpl)])
        result = await (prompt | self.llm).ainvoke({"answer_text": answer_text})
        return result.content

    async def rewrite(self, answer_text: str, char_limit: int, db: Optional[AsyncSession] = None) -> str:
        char_limit_min = max(char_limit - 100, 1)
        system = await load_prompt(db, "humanizer_system", HUMANIZER_SYSTEM_PROMPT)
        user_tmpl = await load_prompt(db, "humanizer_rewrite", HUMANIZER_REWRITE_TEMPLATE)
        prompt = ChatPromptTemplate.from_messages([("system", system), ("user", user_tmpl)])
        result = await (prompt | self.llm).ainvoke({
            "answer_text": answer_text,
            "char_limit": char_limit,
            "char_limit_min": char_limit_min,
        })
        return result.content
