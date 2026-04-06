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

    # SMS (CoolSMS) — 설정되지 않으면 개발 모드(로그 출력)
    COOLSMS_API_KEY: Optional[str] = None
    COOLSMS_API_SECRET: Optional[str] = None
    COOLSMS_SENDER: Optional[str] = None   # 발신 번호 (예: 01012345678)

    # Superadmin seed (env only, never hardcoded)
    SUPERADMIN_EMAIL: Optional[str] = None
    SUPERADMIN_PASSWORD: Optional[str] = None
    SUPERADMIN_NAME: Optional[str] = None

    # Business Rules (포인트 단위, 1P = 100원)
    WELCOME_POINTS: int = 15                # 신규 가입 웰컴 포인트
    PROJECT_COST_POINTS: int = 30           # 자소서 프로젝트 생성 (30P = 3,000원)
    INTERVIEW_SESSION_COST_POINTS: int = 60 # 면접 세션 시작 (60P = 6,000원)
    INTERVIEW_NEW_QUESTION_POINTS: int = 3  # 면접 신규 질문 (3P = 300원)
    INTERVIEW_FOLLOW_UP_POINTS: int = 1     # 면접 꼬리 질문 (1P = 100원)
    INGEST_COST_POINTS: int = 5             # 프로필 AI 분류 (5P = 500원)
    ENRICHMENT_COST_POINTS: int = 15        # 프로필 심층 분석 (15P = 1,500원)
    MEMORY_COST_POINTS: int = 30            # AI 경험 해석 (30P = 3,000원)
    FREE_INGESTS_PER_USER: int = 3          # 무료 Ingest 횟수
    MAX_FOLLOW_UPS_PER_QUESTION: int = 5    # 꼬리 질문 최대 개수
    MAX_QUESTIONS_PER_PROJECT: int = 6      # 자소서 최대 질문 수
    MAX_INTERVIEW_QUESTIONS: int = 30       # 면접 세션당 최대 질문 수
    COMPANY_CACHE_TTL_DAYS: int = 7         # 기업 리서치 캐시 유지 기간

    @field_validator("CORS_ORIGINS")
    @classmethod
    def parse_cors(cls, v: str) -> list:
        return [origin.strip() for origin in v.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


settings = Settings()
