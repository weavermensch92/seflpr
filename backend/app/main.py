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

    # 서버 시작 시 DB 마이그레이션 자동 실행 (async 환경 대응)
    try:
        from sqlalchemy import pool
        from sqlalchemy.engine import Connection
        from sqlalchemy.ext.asyncio import async_engine_from_config
        from alembic.config import Config
        from alembic import context as alembic_context, command
        from app.core.database import Base
        import app.models  # noqa: F401

        alembic_cfg = Config("alembic.ini")
        configuration = alembic_cfg.get_section(alembic_cfg.config_ini_section, {})
        configuration["sqlalchemy.url"] = settings.DATABASE_URL

        connectable = async_engine_from_config(
            configuration, prefix="sqlalchemy.", poolclass=pool.NullPool,
        )

        def do_run_migrations(connection: Connection) -> None:
            alembic_context.configure(
                connection=connection,
                target_metadata=Base.metadata,
                compare_type=True,
            )
            with alembic_context.begin_transaction():
                alembic_context.run_migrations()

        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)
        await connectable.dispose()

        logging.getLogger("app").info("Alembic migration completed successfully.")
    except Exception as e:
        logging.getLogger("app").warning(f"Alembic migration skipped: {e}")

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
