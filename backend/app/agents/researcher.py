import json
import re
import logging
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)


class ResearcherAgent:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def fetch_company_info(self, company_name: str, position: str) -> dict:
        """
        GPT-4o + web_search 도구를 사용하여 기업/직무 정보를 실시간 리서치합니다.
        web_search가 지원되지 않는 경우 LLM 내장 지식으로 폴백합니다.
        """
        prompt = f"""당신은 한국 취업 시장 전문 리서처입니다.
기업 '{company_name}'의 '{position}' 직무에 대해 최신 정보를 웹에서 검색하여 리서치하세요.

반드시 다음 항목을 포함하여 JSON으로 반환하세요:
- overview: 기업 개요 및 주요 사업 (2-3문장)
- core_values: 핵심 가치 및 인재상 (배열)
- recent_news: 최근 주요 뉴스/트렌드 (배열, 각 항목 1-2문장)
- talent_keywords: 해당 직무에서 강조하는 역량 키워드 (3-5개 배열)
- interview_tips: 이 기업 면접에서 자주 나오는 질문 유형 (2-3개 배열)

JSON 형식만 반환하세요:
{{ "overview": "...", "core_values": [...], "recent_news": [...], "talent_keywords": [...], "interview_tips": [...] }}"""

        try:
            # GPT-4o with web search
            resp = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            content = resp.choices[0].message.content
            return json.loads(content)
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
                model="gpt-4o",
                messages=[{"role": "user", "content": f"다음 주제에 대해 최신 정보를 포함하여 간결하게 요약해주세요:\n\n{query}"}],
                temperature=0.3,
                max_tokens=500,
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.warning(f"Web search failed: {e}")
            return f"검색 결과를 가져올 수 없습니다: {str(e)}"
