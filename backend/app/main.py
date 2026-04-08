import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from contextlib import asynccontextmanager
from pathlib import Path
from app.core.config import settings
from app.api.v1.router import router as v1_router

# 필수 폴더 생성 자동화 (Lifespan 설정)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 필요한 폴더들 리스트
    required_dirs = ["uploads", "keys", "temp"]
    for dir_name in required_dirs:
        Path(dir_name).mkdir(parents=True, exist_ok=True)

    # 서버 시작 시 DB 테이블 자동 생성 + 누락 컬럼 추가
    try:
        from app.core.database import engine, Base
        from sqlalchemy import text, inspect as sa_inspect
        import app.models  # noqa: F401

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

            # 누락된 컬럼 자동 추가 (create_all은 기존 테이블에 컬럼을 추가하지 않음)
            missing_columns = [
                ("users", "phone_number", "VARCHAR(20) UNIQUE"),
                ("users", "free_ingests_remaining", "INTEGER NOT NULL DEFAULT 3"),
                ("personal_profiles", "enrichment_status", "VARCHAR(20) NOT NULL DEFAULT 'none'"),
                ("personal_profiles", "ai_summary_json", "JSONB"),
            ]
            for table, column, col_type in missing_columns:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type}"
                    ))
                except Exception:
                    pass  # 이미 존재하면 무시

        logging.getLogger("app").info("Database tables created/verified successfully.")
    except Exception as e:
        logging.getLogger("app").warning(f"Database table creation skipped: {e}")

    # Superadmin 자동 생성
    try:
        if settings.SUPERADMIN_EMAIL and settings.SUPERADMIN_PASSWORD and settings.SUPERADMIN_NAME:
            from sqlalchemy import select
            from app.core.database import AsyncSessionLocal
            from app.core.security import hash_password
            from app.models.user import User

            async with AsyncSessionLocal() as db:
                result = await db.execute(select(User).where(User.email == settings.SUPERADMIN_EMAIL))
                existing = result.scalar_one_or_none()

                if not existing:
                    admin = User(
                        email=settings.SUPERADMIN_EMAIL,
                        password_hash=hash_password(settings.SUPERADMIN_PASSWORD),
                        full_name=settings.SUPERADMIN_NAME,
                        is_active=True,
                        is_admin=True,
                        point_balance=9999999,
                    )
                    db.add(admin)
                    await db.commit()
                    logging.getLogger("app").info(f"Superadmin created: {settings.SUPERADMIN_EMAIL}")
                elif not existing.is_admin:
                    existing.is_admin = True
                    existing.point_balance = 9999999
                    await db.commit()
                    logging.getLogger("app").info(f"Superadmin promoted: {settings.SUPERADMIN_EMAIL}")
    except Exception as e:
        logging.getLogger("app").warning(f"Superadmin seed skipped: {e}")

    yield

# Rate Limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="SelfPR API",
    description="자기소개서 AI Agent 서비스",
    version="0.1.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)

# Trailing slash 문제 해결 (v1_router에도 적용)
v1_router.redirect_slashes = True

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(v1_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok", "env": settings.APP_ENV}


# 로깅 설정
logger = logging.getLogger("app")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # 에러 내용을 서버 로그에 상세히 기록 (가장 중요!)
    logger.error(f"Internal Server Error: {exc}", exc_info=True)
    
    if settings.is_production:
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
        # CORS 헤더 수동 추가 (미들웨어가 익셉션 핸들러의 응답은 건너뛰는 경우가 있음)
        origin = request.headers.get("Origin")
        if origin and origin in settings.CORS_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
    raise exc
