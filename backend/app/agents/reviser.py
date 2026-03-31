from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings
from app.agents.prompts.reviser_prompts import REVISER_SYSTEM_PROMPT, REVISER_USER_TEMPLATE


class ReviserAgent:
    def __init__(self, model_name: str = "gpt-4o", temperature: float = 0.5):
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=settings.OPENAI_API_KEY
        )
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", REVISER_SYSTEM_PROMPT),
            ("user", REVISER_USER_TEMPLATE)
        ])
        self.chain = self.prompt | self.llm

    async def revise_answer(
        self,
        company_name: str,
        question_text: str,
        char_limit: int,
        original_answer: str,
        user_feedback: str
    ) -> str:
        """기존 답변을 피드백에 맞춰 첨삭합니다."""
        response = await self.chain.ainvoke({
            "company_name": company_name,
            "question_text": question_text,
            "char_limit": char_limit,
            "original_answer": original_answer,
            "user_feedback": user_feedback
        })
        return response.content
