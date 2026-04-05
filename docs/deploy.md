# 배포 규칙 (Deploy)

## 인프라 구성

| 서비스 | 플랫폼 | 역할 |
|--------|--------|------|
| Backend (FastAPI) | **Railway** | REST API 서버 |
| PostgreSQL | **Railway** (같은 프로젝트) | 데이터베이스 |
| Frontend (React) | **Vercel** | 정적 웹 호스팅 |

## Railway 백엔드

### URL

- **프로덕션**: `https://seflpr-production.up.railway.app`
- **내부 네트워크**: `seflpr.railway.internal`
- **Health Check**: `GET /health`

### 서비스 설정

| 항목 | 값 |
|------|-----|
| Root Directory | `backend` |
| Build Command | `pip install poetry==1.8.0 && poetry config virtualenvs.create false && poetry install --no-root` |
| Start Command | `sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"` |
| Region | US West (California) |
| Replicas | 1 |

### 환경변수 (필수)

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 내부 URL (`postgres.railway.internal`) |
| `APP_ENV` | `production` |
| `SECRET_KEY` | 랜덤 hex 문자열 |
| `ENCRYPTION_KEY` | 32바이트 hex (64자) |
| `OPENAI_API_KEY` | OpenAI API 키 |
| `ANTHROPIC_API_KEY` | Anthropic API 키 |
| `CORS_ORIGINS` | Vercel 프론트엔드 URL (쉼표 구분) |
| `SUPERADMIN_EMAIL` | 슈퍼어드민 이메일 |
| `SUPERADMIN_PASSWORD` | 슈퍼어드민 비밀번호 |
| `SUPERADMIN_NAME` | 슈퍼어드민 이름 |

### DB 연결 규칙

- **내부 네트워크 사용**: `postgres.railway.internal:5432` (같은 프로젝트 내)
- **SSL 비활성화**: Railway 내부 통신은 SSL 불필요
- **URL 자동 변환**: `postgresql://` → `postgresql+asyncpg://` (코드에서 처리)

## Railway PostgreSQL

| 항목 | 값 |
|------|-----|
| 내부 호스트 | `postgres.railway.internal` |
| 외부 프록시 | `junction.proxy.rlwy.net:58028` |
| DB 이름 | `railway` |
| Volume | `postgres-volume` (영구 저장) |

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
| `VITE_API_URL` | `https://seflpr-production.up.railway.app` |

## 서버 시작 시 자동 실행

1. 필수 폴더 생성 (`uploads`, `keys`, `temp`)
2. DB 테이블 자동 생성 (`Base.metadata.create_all`)
3. Superadmin 계정 시드 (환경변수 설정 시)

## 배포 트리거

- **Railway**: GitHub `main` 브랜치 push 시 자동 배포
- **Vercel**: GitHub `main` 브랜치 push 시 자동 배포

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
AI:       Claude Sonnet 4.6 (Anthropic) + GPT-4o/4o-mini (OpenAI)
Auth:     JWT RS256
배포:     Railway (Backend+DB) + Vercel (Frontend)
```

## 관련 파일

- `backend/Dockerfile` — 백엔드 Docker 이미지
- `frontend/Dockerfile` — 프론트엔드 Docker 이미지
- `docker-compose.yml` — 로컬 개발 환경
- `.env.example` — 환경변수 템플릿
- `backend/app/main.py` — 서버 시작 시 초기화 (lifespan)
