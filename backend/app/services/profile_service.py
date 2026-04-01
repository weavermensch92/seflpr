import json
import uuid
from datetime import date
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.profile_repo import ProfileRepository
from app.schemas.profile import (
    ProfileCreate, ProfileUpdate, ProfileResponse,
    FreeTextParseRequest, FreeTextParseResponse, ParsedProfileItem, BulkConfirmRequest,
)
from app.models.profile import ProfileSource


def _parse_date(date_str: Optional[str]) -> Optional[date]:
    """YYYY-MM 또는 YYYY-MM-DD 형식의 문자열을 date 객체로 변환."""
    if not date_str or not isinstance(date_str, str):
        return None
    try:
        parts = date_str.split("-")
        year = int(parts[0])
        month = int(parts[1]) if len(parts) > 1 else 1
        day = int(parts[2]) if len(parts) > 2 else 1
        return date(year, month, day)
    except (ValueError, IndexError):
        return None


def _to_response(profile) -> ProfileResponse:
    return ProfileResponse(
        id=str(profile.id),
        profile_type=profile.profile_type,
        title=profile.title,
        organization=profile.organization,
        role=profile.role,
        description=getattr(profile, "_description_plain", None),
        start_date=profile.start_date,
        end_date=profile.end_date,
        tags=profile.tags,
        metadata=profile.metadata_,
        is_ai_memory=profile.is_ai_memory,
        ai_interpreted_content=getattr(profile, "_ai_interpreted_content_plain", None),
        sort_order=profile.sort_order,
        source=profile.source,
    )


class ProfileService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProfileRepository(db)

    async def list_profiles(self, user_id: str) -> list[ProfileResponse]:
        profiles = await self.repo.list_by_user(user_id)
        return [_to_response(p) for p in profiles]

    async def get_profile(self, profile_id: str, user_id: str) -> ProfileResponse:
        p = await self.repo.get(profile_id, user_id)
        if not p:
            raise HTTPException(status_code=404, detail="프로필을 찾을 수 없습니다.")
        return _to_response(p)

    async def create_profile(self, user_id: str, data: ProfileCreate) -> ProfileResponse:
        raw = data.model_dump(by_alias=False)
        raw["metadata_"] = raw.pop("metadata_", None)
        p = await self.repo.create(user_id, raw)
        return _to_response(p)

    async def update_profile(self, profile_id: str, user_id: str, data: ProfileUpdate) -> ProfileResponse:
        p = await self.repo.get(profile_id, user_id)
        if not p:
            raise HTTPException(status_code=404, detail="프로필을 찾을 수 없습니다.")
        raw = {k: v for k, v in data.model_dump(by_alias=False, exclude_none=True).items()}
        if "metadata_" in raw:
            raw["metadata_"] = raw.pop("metadata_")
        updated = await self.repo.update(p, raw)
        return _to_response(updated)

    async def delete_profile(self, profile_id: str, user_id: str) -> None:
        p = await self.repo.get(profile_id, user_id)
        if not p:
            raise HTTPException(status_code=404, detail="프로필을 찾을 수 없습니다.")
        await self.repo.delete(p)

    async def parse_free_text(self, user_id: str, req: FreeTextParseRequest) -> FreeTextParseResponse:
        """자유 텍스트를 GPT-4o-mini로 파싱하여 프로필 항목 목록 반환."""
        from app.models.user import User
        from sqlalchemy import select
        
        u_id = uuid.UUID(user_id)
        query = select(User.point_balance).where(User.id == u_id)
        result = await self.db.execute(query)
        balance = result.scalar_one_or_none()
        
        if balance is None or balance <= 0:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="AI 자동 분류는 포인트 충전 후 사용 가능합니다."
            )

        from app.core.config import settings

        if not settings.OPENAI_API_KEY:
            # API 키 없을 때 목업 응답
            return FreeTextParseResponse(items=[
                ParsedProfileItem(
                    profile_type="free_text",
                    title="자유 텍스트 입력",
                    description=req.text,
                )
            ])

        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        prompt = f"""아래 텍스트에서 이력/경력 관련 정보를 추출하여 JSON 객체로 반환하세요.
반드시 "items"라는 키 아래에 배열을 담아서 반환해야 합니다.

각 항목은 다음 필드를 포함합니다:
- profile_type: education|work_experience|project|certification|skill|activity|award|strength|weakness|motivation|free_text
- title: 항목 제목 (필수)
- organization: 학교/회사/단체명
- role: 역할/직책
- description: 상세 내용
- start_date: YYYY-MM 형식
- end_date: YYYY-MM 형식
- tags: 관련 키워드 배열
- metadata: 추가 정보 (education이면 {{"major": "...", "gpa": "...", "gpa_scale": "..."}}, project면 {{"tech_stack": "...", "team_size": "...", "outcome": "..."}})

텍스트:
{req.text}

JSON 형식의 객체만 반환하세요.
{{ "items": [{{...}}, {{...}}] }}
"""

        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        raw = resp.choices[0].message.content
        data = json.loads(raw)
        items_raw = data.get("items", [])
        
        # 낱개 항목으로 변환
        items = [ParsedProfileItem(**item) for item in items_raw]
        return FreeTextParseResponse(items=items)

    async def parse_url(self, user_id: str, url: str) -> FreeTextParseResponse:
        """외부 URL의 텍스트를 추출하여 AI로 파싱."""
        import httpx
        from bs4 import BeautifulSoup

        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                })
                
                if resp.status_code in (401, 403):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="해당 링크에 대한 접근 권한이 없어 내용을 가져올 수 없습니다."
                    )
                resp.raise_for_status()
                
                soup = BeautifulSoup(resp.text, "html.parser")
                # 스크립트, 스타일 제거
                for s in soup(["script", "style"]):
                    s.decompose()
                
                text = soup.get_text(separator="\n", strip=True)
                # 너무 긴 경우 절약
                text = text[:8000]
                
                return await self.parse_free_text(user_id, FreeTextParseRequest(text=text))
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="접근 권한이 없어서 내용을 반영할 수 없습니다."
                )
            raise HTTPException(status_code=e.response.status_code, detail=f"페이지를 불러오지 못했습니다: {e.response.reason_phrase}")
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            raise HTTPException(status_code=500, detail=f"링크 분석 중 오류 발생: {str(e)}")

    async def bulk_confirm(self, user_id: str, req: BulkConfirmRequest) -> list[ProfileResponse]:
        """파싱 결과를 확인 후 일괄 저장."""
        items_raw = []
        for item in req.items:
            # item은 ProfileCreate 객체임
            raw = item.model_dump(by_alias=False)
            raw["metadata_"] = raw.pop("metadata_", None)
            
            if isinstance(raw.get("start_date"), str):
                raw["start_date"] = _parse_date(raw["start_date"])
            if isinstance(raw.get("end_date"), str):
                raw["end_date"] = _parse_date(raw["end_date"])
                
            items_raw.append(raw)
        
        profiles = await self.repo.bulk_create(user_id, items_raw)
        return [_to_response(p) for p in profiles]

    async def interpret_file_to_memory(self, user_id: str, filename: str, text: str) -> ProfileResponse:
        """파일 텍스트를 AI가 자소서용 전략 메모리로 해석하여 즉시 저장합니다."""
        from app.models.user import User
        from sqlalchemy import select
        
        u_id = uuid.UUID(user_id)
        
        # 1. 포인트 체크 (30P 차감 또는 어드민 무제한)
        from app.services.point_service import PointService
        point_service = PointService(self.db)
        await point_service.deduct_points(
            user_id=u_id,
            amount=30,
            reason=f"AI Experience Interpretation: {filename}"
        )

        from app.core.config import settings
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        # 2. AI 해석 프롬프트
        # 자소서 작성에 최적화된 형식으로 텍스트를 재구성
        prompt = f"""당신은 전문 취업 컨설턴트입니다. 아래 텍스트는 사용자가 업로드한 파일(포트폴리오, 프로젝트, 경력기술서 등)의 내용입니다.
이 내용을 바탕으로 나중에 '자기소개서 작성 프롬프트'에서 AI가 참조할 수 있는 '핵심 경험 메모리'로 변환하세요.

변환 지침:
1. 단순 텍스트 추출이 아니라, "무엇을 했고(Action)", "어떤 성과를 냈으며(Result)", "이를 통해 어떤 역량을 증명(Competency)"할 수 있는지 중심으로 재구성하세요.
2. STAR 기법(Situation, Task, Action, Result)으로 정리할 수 있다면 그렇게 하세요.
3. 수치화된 성과가 있다면 반드시 포함하세요.
4. 이 내용을 자소서의 '지원동기', '성장과정', '프로젝트 성과' 중 어디에 쓰면 좋을지도 짧게 제안하세요.

입력 텍스트:
{text[:10000]}  # 컨텍스트 제한 고려

반환 형식:
반드시 다음 JSON 구조로 응답하세요:
{{
  "title": "경험의 대표 제목",
  "organization": "관련 조직명",
  "role": "수행 직무/역할",
  "interpreted_content": "AI가 재구성한 자소서용 핵심 메모리 내용 전체",
  "tags": ["키워드1", "키워드2"],
  "profile_type": "project|work_experience|activity 중 가장 적절한 것"
}}
"""
        resp = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        
        interpreted = json.loads(resp.choices[0].message.content)
        
        # 3. DB 저장
        profile_data = {
            "profile_type": interpreted.get("profile_type", "project"),
            "title": interpreted.get("title", f"AI 해석: {filename}"),
            "organization": interpreted.get("organization"),
            "role": interpreted.get("role"),
            "description": text[:2000],  # 원본 텍스트 일부 보존
            "is_ai_memory": True,
            "ai_interpreted_content": interpreted.get("interpreted_content"),
            "tags": interpreted.get("tags", []),
            "source": ProfileSource.FILE_UPLOAD
        }
        
        p = await self.repo.create(user_id, profile_data)
        return _to_response(p)
