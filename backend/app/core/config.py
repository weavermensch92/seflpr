from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "change_this_in_production"
    CORS_ORIGINS: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://selfpr:selfpr_secret@localhost:5432/selfpr"

    @field_validator("DATABASE_URL")
    @classmethod
    def fix_db_url(cls, v: str) -> str:
        """Railway 등 외부 서비스의 postgresql:// URL을 asyncpg용으로 변환."""
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # Redis
    REDIS_URL: str = "redis://:redis_secret@localhost:6379/0"

    # JWT
    JWT_PRIVATE_KEY_PATH: str = "./keys/private.pem"
    JWT_PUBLIC_KEY_PATH: str = "./keys/public.pem"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Encryption
    ENCRYPTION_KEY: str = ""  # 32 bytes hex

    # AI APIs
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Search APIs
    GOOGLE_SEARCH_API_KEY: str = ""
    GOOGLE_SEARCH_ENGINE_ID: str = ""
    NAVER_CLIENT_ID: str = ""
    NAVER_CLIENT_SECRET: str = ""

    # Payment
    TOSS_CLIENT_KEY: str = ""
    TOSS_SECRET_KEY: str = ""

    # Superadmin seed (env only, never hardcoded)
    SUPERADMIN_EMAIL: Optional[str] = None
    SUPERADMIN_PASSWORD: Optional[str] = None
    SUPERADMIN_NAME: Optional[str] = None

    # Business Rules
    PROJECT_PRICE: int = 5000          # 자소서 프로젝트 생성 가격 (원)
    REFILL_PRICE: int = 5000           # 수정 충전 가격 (원)
    INTERVIEW_PRICE: int = 10000       # 면접 연습 세트 가격 (원)
    MAX_QUESTIONS_PER_PROJECT: int = 6 # 자소서 최대 질문 수
    MAX_ANSWER_REVISIONS: int = 5      # 답변 최대 수정 횟수
    MAX_INTERVIEW_QUESTIONS: int = 30  # 면접 예상 질문 최대 수
    COMPANY_CACHE_TTL_DAYS: int = 7    # 기업 리서치 캐시 유지 기간

    @field_validator("CORS_ORIGINS")
    @classmethod
    def parse_cors(cls, v: str) -> list:
        return [origin.strip() for origin in v.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


settings = Settings()
