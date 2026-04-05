# 배포 규칙 (Deploy)

## 인프라 구성

| 서비스 | 플랫폼 | 역할 |
|--------|--------|------|
| Backend (FastAPI) | **Render** | REST API 서버 |
| PostgreSQL | **Render** (같은 프로젝트) | 데이터베이스 |
| Frontend (React) | **Vercel** | 정적 웹 호스팅 |

> ⚠️ 이전에 Railway를 사용했으나 **Render로 이전됨**

## Render 백엔드

### URL

- **프로덕션**: `https://seflpr-api.onrender.com`
- **Health Check**: `GET /health`

### 서비스 설정

| 항목 | 값 |
|------|-----|
| Root Directory | `backend` |
| Build Command | `pip install poetry==1.8.0 && poetry config virtualenvs.create false && poetry install --no-root` |
| Start Command | `export PYTHONPATH=$PYTHONPATH:. && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| WEB_CONCURRENCY | 1 (Render 자동 설정) |
| Region | — |

### 환경변수 (필수)

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | `postgresql+asyncpg://...` (Render PostgreSQL 내부 URL) |
| `APP_ENV` | `production` |
| `SECRET_KEY` | 랜덤 hex 문자열 |
| `ENCRYPTION_KEY` | 32바이트 hex (64자) — 없으면 RuntimeError |
| `OPENAI_API_KEY` | OpenAI API 키 |
| `ANTHROPIC_API_KEY` | Anthropic API 키 |
| `CORS_ORIGINS` | Vercel 프론트엔드 URL (쉼표 구분) |
| `SUPERADMIN_EMAIL` | 슈퍼어드민 이메일 |
| `SUPERADMIN_PASSWORD` | 슈퍼어드민 비밀번호 |
| `SUPERADMIN_NAME` | 슈퍼어드민 이름 |

### 환경변수 (선택)

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `COOLSMS_API_KEY` | CoolSMS API Key | — (미설정 시 개발 모드) |
| `COOLSMS_API_SECRET` | CoolSMS API Secret | — |
| `COOLSMS_SENDER` | SMS 발신 번호 | — |
| `TOSS_CLIENT_KEY` | 토스페이먼츠 Client Key | — |
| `TOSS_SECRET_KEY` | 토스페이먼츠 Secret Key | — |
| `GOOGLE_SEARCH_API_KEY` | Google Search API | — |
| `GOOGLE_SEARCH_ENGINE_ID` | Google CSE ID | — |
| `NAVER_CLIENT_ID` | 네이버 API Client ID | — |
| `NAVER_CLIENT_SECRET` | 네이버 API Secret | — |
| `REDIS_URL` | Redis 연결 URL | `redis://localhost:6379` |

## Render PostgreSQL

| 항목 | 값 |
|------|-----|
| 내부 연결 | Render 대시보드에서 Internal Database URL 확인 |
| SSL | 클라우드 내부 처리 (`ssl=False`) |

## Vercel 프론트엔드

### URL

- **프로덕션**: `https://seflpr-ao64.vercel.app`

### 빌드 설정

| 항목 | 값 |
|------|-----|
| Framework | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` (`tsc -b && vite build`) |
| Output Directory | `dist` |

### 환경변수

| 변수 | 값 |
|------|-----|
| `VITE_API_URL` | `https://seflpr-api.onrender.com` |

## 서버 시작 시 자동 실행 (lifespan)

순서대로 실행:

1. 필수 폴더 생성 (`uploads`, `keys`, `temp`)
2. DB 테이블 자동 생성 (`Base.metadata.create_all`)
3. Superadmin 계정 시드 (환경변수 설정 시)

> Alembic 자동 마이그레이션은 비활성화 상태 — 수동 실행 또는 수동 apply 필요

## 배포 트리거

- **Render**: GitHub `main` 브랜치 push 시 자동 배포
- **Vercel**: GitHub `main` 브랜치 push 시 자동 배포

## 브랜치 규칙

- **모든 커밋은 `main` 브랜치에 직접** 푸시
- feature 브랜치 별도 생성 금지
- 작업 전 `git pull origin main` 확인

## Docker (로컬 개발)

```bash
docker-compose up -d
```

| 서비스 | 포트 |
|--------|------|
| PostgreSQL | 5432 |
| Backend | 8000 |
| Frontend | 3000 |

## 기술 스택 요약

```
Backend:  FastAPI (Python 3.11) + PostgreSQL 15 + Redis
Frontend: React 19 + TypeScript + Vite + TailwindCSS + shadcn/ui
AI:       Claude Sonnet 4.6 (Anthropic) + GPT-4o / 4o-mini (OpenAI)
Auth:     JWT RS256 + CoolSMS OTP
Payment:  토스페이먼츠 (예정)
Deploy:   Render (Backend + DB) + Vercel (Frontend)
```

## Render 배포 시 주의사항

- Render 무료 플랜은 15분 비활성 시 **슬립 모드** 진입 → 첫 요청 응답 지연 (~30초)
- `DATABASE_URL`은 반드시 `postgresql+asyncpg://` 프리픽스 사용 (코드에서 자동 변환하지만 명시적으로 지정 권장)
- `ENCRYPTION_KEY` 없으면 서버 시작 실패 — 반드시 설정

## 관련 파일

- `backend/Dockerfile` — 백엔드 Docker 이미지
- `frontend/Dockerfile` — 프론트엔드 Docker 이미지
- `docker-compose.yml` — 로컬 개발 환경
- `backend/app/main.py` — 서버 시작 시 초기화 (lifespan)
- `backend/app/core/config.py` — 환경변수 설정
