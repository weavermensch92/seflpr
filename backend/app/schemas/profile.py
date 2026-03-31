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
