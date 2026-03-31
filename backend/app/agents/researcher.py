import httpx
from bs4 import BeautifulSoup
from typing import dict, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings


class ResearcherAgent:
    def __init__(self, model_name: str = "gpt-4o-mini"):
        self.llm = ChatOpenAI(
            model=model_name,
            api_key=settings.OPENAI_API_KEY
        )

    async def fetch_company_info(self, company_name: str, position: str) -> dict:
        """
        기업과 직무에 대한 정보를 수집합니다. 
        실제 상용 환경에서는 Tavily, SerpApi 등을 사용하지만, 여기서는 기본 크롤링 구조와 AI 분석을 사용합니다.
        """
        # 1. 시뮬레이션된 검색 및 분석 (나중에 실제 도구 연동 가능)
        # 현재는 LLM이 알고 있는 지식을 기반으로 인재상 및 기업 문화를 정리합니다.
        
        prompt = ChatPromptTemplate.from_template("""
        기업 '{company_name}'의 '{position}' 직무에 특화된 정보를 리서치해서 정리해주세요.
        다음 정보를 포함해야 합니다:
        - 기업 개요 및 주요 사업
        - 핵심 가치 및 인재상
        - 최근 주요 뉴스 트렌드 (최근 알려진 큰 이슈 중심)
        - 해당 직무에서 강조하는 역량 키워드 (3~5개)
        
        결과는 반드시 JSON 형식으로만 답변하세요. 
        항목: {{"overview", "core_values", "recent_news", "talent_keywords"}}
        """)
        
        chain = prompt | self.llm
        response = await chain.ainvoke({{"company_name": company_name, "position": position}})
        
        # 간단한 JSON 파싱 (실제로는 PydanticOutputParser 권장)
        import json
        import re
        
        content = response.content
        match = re.search(r"{{.*}}", content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {{"overview": content}}

    async def search_web(self, query: str) -> str:
        """기본적인 웹 검색 크롤링 (Placeholder)"""
        # 실제 구현 시 Google Search 등 연동
        return "검색 결과 요약 (준비 중)"
