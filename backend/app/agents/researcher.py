import json
import logging
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.agents.prompt_loader import load_prompt

logger = logging.getLogger(__name__)

RESEARCHER_SYSTEM_DEFAULT = """당신은 한국 취업 시장 전문 리서처입니다.
기업과 직무에 대한 최신 정보를 수집하여 취업 준비생에게 도움이 되는 리서치를 제공합니다.
정확하고 구체적인 정보를 JSON 형식으로 정리하세요."""

RESEARCHER_USER_DEFAULT = """기업 '{company_name}'의 '{position}' 직무에 대해 최신 정보를 포함하여 리서치하세요.

반드시 다음 항목을 포함하여 JSON으로 반환하세요:
- overview: 기업 개요 및 주요 사업 (2-3문장)
- core_values: 핵심 가치 및 인재상 (배열)
- recent_news: 최근 주요 뉴스/트렌드 (배열, 각 항목 1-2문장)
- talent_keywords: 해당 직무에서 강조하는 역량 키워드 (3-5개 배열)
- interview_tips: 이 기업 면접에서 자주 나오는 질문 유형 (2-3개 배열)

JSON 형식만 반환하세요:
{{ "overview": "...", "core_values": [...], "recent_news": [...], "talent_keywords": [...], "interview_tips": [...] }}"""


class ResearcherAgent:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def fetch_company_info(
        self, company_name: str, position: str, db: AsyncSession | None = None,
    ) -> dict:
        """어드민 프롬프트를 로드하여 기업/직무 정보를 리서치합니다."""
        system = await load_prompt(db, "researcher_system", RESEARCHER_SYSTEM_DEFAULT)
        user_tmpl = await load_prompt(db, "researcher_user", RESEARCHER_USER_DEFAULT)

        user_prompt = user_tmpl.replace("{company_name}", company_name).replace("{position}", position)

        try:
            resp = await self.client.chat.completions.create(
                model="gpt-5.4",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            return json.loads(resp.choices[0].message.content)
        except Exception as e:
            logger.warning(f"Company research failed, using fallback: {e}")
            return await self._fallback_research(company_name, position)

    async def _fallback_research(self, company_name: str, position: str) -> dict:
        """GPT-4o-mini 내장 지식 기반 폴백."""
        try:
            resp = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": f"""기업 '{company_name}'의 '{position}' 직무에 대해 알고 있는 정보를 JSON으로 정리하세요.
항목: overview, core_values(배열), recent_news(배열), talent_keywords(배열), interview_tips(배열)
JSON만 반환하세요."""}],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            return json.loads(resp.choices[0].message.content)
        except Exception as e:
            logger.error(f"Fallback research also failed: {e}")
            return {
                "overview": f"{company_name} - {position} 직무 정보를 가져올 수 없습니다.",
                "core_values": [],
                "recent_news": [],
                "talent_keywords": [],
                "interview_tips": [],
            }

    async def search_web(self, query: str) -> str:
        """GPT를 활용한 웹 검색 대체."""
        try:
            resp = await self.client.chat.completions.create(
                model="gpt-5.4",
                messages=[{"role": "user", "content": f"다음 주제에 대해 최신 정보를 포함하여 간결하게 요약해주세요:\n\n{query}"}],
                temperature=0.3,
                max_tokens=500,
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.warning(f"Web search failed: {e}")
            return f"검색 결과를 가져올 수 없습니다: {str(e)}"
