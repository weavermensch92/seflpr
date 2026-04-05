from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import date
from app.models.profile import ProfileType, ProfileSource
import uuid


class ProfileCreate(BaseModel):
    profile_type: ProfileType
    title: str = Field(min_length=1, max_length=255)
    organization: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None  # 평문 → 서비스에서 암호화
    start_date: Optional[date | str] = None
    end_date: Optional[date | str] = None
    tags: Optional[list[str]] = None
    metadata_: Optional[dict[str, Any]] = Field(default=None, alias="metadata")
    is_ai_memory: bool = False
    ai_interpreted_content: Optional[str] = None
    sort_order: int = 0
    source: ProfileSource = ProfileSource.MANUAL

    model_config = {"populate_by_name": True}


class ProfileUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    organization: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date | str] = None
    end_date: Optional[date | str] = None
    tags: Optional[list[str]] = None
    metadata_: Optional[dict[str, Any]] = Field(default=None, alias="metadata")
    is_ai_memory: Optional[bool] = None
    ai_interpreted_content: Optional[str] = None
    sort_order: Optional[int] = None

    model_config = {"populate_by_name": True}


class ProfileResponse(BaseModel):
    id: str
    profile_type: ProfileType
    title: str
    organization: Optional[str]
    role: Optional[str]
    description: Optional[str]  # 복호화된 평문
    start_date: Optional[date]
    end_date: Optional[date]
    tags: Optional[list[str]]
    metadata: Optional[dict[str, Any]]
    is_ai_memory: bool
    ai_interpreted_content: Optional[str]
    enrichment_status: str = "none"
    ai_summary_json: Optional[dict[str, Any]] = None
    sort_order: int
    source: ProfileSource

    model_config = {"from_attributes": True}


class FreeTextParseRequest(BaseModel):
    text: str = Field(min_length=10, max_length=10000)


class LinkParseRequest(BaseModel):
    url: str = Field(min_length=5, max_length=1000)


class ParsedProfileItem(BaseModel):
    profile_type: ProfileType
    title: str
    organization: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    tags: Optional[list[str]] = None
    metadata: Optional[dict[str, Any]] = None


class FreeTextParseResponse(BaseModel):
    items: list[ParsedProfileItem]


class BulkConfirmRequest(BaseModel):
    items: list[ProfileCreate]


# ─── Unified Ingest ───────────────────────────────────────

class TimelineEntry(BaseModel):
    title: str
    organization: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    profile_type: str

class AISummary(BaseModel):
    key_strengths: list[str] = []
    experience_timeline: list[TimelineEntry] = []
    skill_tags: list[str] = []
    suggested_uses: list[str] = []  # e.g. "지원동기에 활용 가능"

class IngestResponse(BaseModel):
    profiles: list[ProfileResponse]
    ai_summary: Optional[AISummary] = None
    enrichment_status: str = "complete"  # "complete" | "pending"


# ─── Dashboard ────────────────────────────────────────────

class TagCount(BaseModel):
    tag: str
    count: int

class DashboardResponse(BaseModel):
    total_profiles: int
    type_counts: dict[str, int]
    completeness_score: int  # 0-100
    timeline: list[TimelineEntry]
    skill_tags: list[TagCount]
    ai_strength_summary: Optional[str] = None
    top_tags: list[TagCount] = []
