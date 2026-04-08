import json
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings
from app.agents.prompts.gap_prompts import GAP_SYSTEM_PROMPT, GAP_ANALYSIS_TEMPLATE


class GapAnalyzerAgent:
    def __init__(self, model_name: str = "gpt-4o", temperature: float = 0.2):
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=settings.OPENAI_API_KEY,
        )

    async def analyze(
        self,
        company_name: str,
        position: str,
        experience_level: str,
        profiles_text: str,
        company_research: str = "",
    ) -> dict:
        """프로필 갭을 분석하고 JSON으로 반환."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", GAP_SYSTEM_PROMPT),
            ("user", GAP_ANALYSIS_TEMPLATE),
        ])
        chain = prompt | self.llm
        result = await chain.ainvoke({
            "company_name": company_name,
            "position": position,
            "experience_level": experience_level,
            "profiles_text": profiles_text,
            "company_research": company_research or "기업 리서치 미수행",
        })

        raw = result.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {"critical": [], "recommended": [], "nice_to_have": [], "raw": raw}
