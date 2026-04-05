# Database 규칙

## 연결 설정

| 항목 | 값 |
|------|-----|
| DBMS | PostgreSQL 15 |
| 드라이버 | asyncpg (비동기) |
| URL 패턴 | `postgresql+asyncpg://user:password@host:5432/database` |
| 자동 변환 | `postgresql://` → `postgresql+asyncpg://` (Railway/Render 호환) |

## 커넥션 풀

| 항목 | 값 |
|------|-----|
| Pool Size | 10 |
| Max Overflow | 20 |
| Pool Pre-ping | 활성화 (연결 유효성 사전 검증) |
| Statement Cache | 0 (비활성화, PgBouncer/Supabase 호환) |

## SSL

- **프로덕션**: `ssl=False` (클라우드 제공자가 전송 레이어에서 관리)
- **개발**: 기본값 사용

## 세션 관리

- 모든 DB 접근은 `AsyncSession` 컨텍스트 매니저로 래핑
- 예외 발생 시 자동 rollback
- `expire_on_commit=False` (커밋 후에도 객체 유지)

## 암호화

| 항목 | 값 |
|------|-----|
| 알고리즘 | AES-256-GCM |
| 키 크기 | 32 bytes (hex 인코딩, 64자) |
| Nonce | 12 bytes (암호화마다 랜덤 생성) |
| 저장 형식 | Base64(nonce + ciphertext) |

### 암호화 키 규칙

- **프로덕션**: `ENCRYPTION_KEY` 환경변수 필수 — 없으면 RuntimeError
- **개발**: 프로세스 수명 동안 동일한 랜덤 키 사용 (재시작 시 기존 암호화 데이터 복호화 불가)
- **절대 코드에 하드코딩 금지**

### 암호화 대상 필드

| 모델 | 필드 |
|------|------|
| PersonalProfile | `description_encrypted` |
| PersonalProfile | `ai_interpreted_content_encrypted` |

## 마이그레이션

- **도구**: Alembic
- **서버 시작 시**: `Base.metadata.create_all` 자동 실행 (테이블 없으면 생성, 있으면 유지)
- **마이그레이션 파일 위치**: `backend/alembic/versions/`

### 마이그레이션 이력

| Revision | 파일명 | 내용 |
|----------|--------|------|
| `8be067d81750` | initial | users, projects, profiles, company_cache, interview_sessions |
| `e1224ca3b9ed` | add_revision_type_and_ai_review | answer_revisions, ai_review 필드 |
| `17cbce905d8c` | add_prompt_configs | prompt_configs 테이블 |
| `f18f84939a98` | add_point_balance_and_transactions | users.point_balance, point_transactions |
| `a3b5c7d9e1f2` | add_ingest_and_dashboard_fields | users.free_ingests_remaining, profiles.enrichment_status |
| `b1c2d3e4f5a6` | add_phone_number | users.phone_number (unique) |

## 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `users` | 사용자 (포인트 잔액, 전화번호 포함) |
| `personal_profiles` | 프로필 항목 (일부 AES-256-GCM 암호화) |
| `projects` | 자소서 프로젝트 |
| `project_answers` | 프로젝트별 질문-답변 |
| `answer_revisions` | 답변 수정 이력 |
| `interview_sessions` | 면접 연습 세션 |
| `interview_questions` | 면접 질문 |
| `interview_answers` | 면접 답변 + AI 피드백 |
| `payments` | 결제 내역 (PG사 응답 JSONB) |
| `point_transactions` | 포인트 거래 원장 |
| `company_position_cache` | 기업 리서치 캐시 (7일 TTL) |
| `prompt_configs` | 어드민 프롬프트 동적 관리 |

## User 테이블 컬럼

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `id` | UUID | uuid4() | PK |
| `email` | VARCHAR(255) | — | unique, indexed |
| `password_hash` | VARCHAR(255) | — | bcrypt |
| `full_name` | VARCHAR(100) | — | |
| `phone_number` | VARCHAR(20) | NULL | unique, OTP 인증 완료 후 저장 |
| `is_active` | BOOLEAN | True | False = 계정 정지 |
| `is_admin` | BOOLEAN | False | |
| `point_balance` | INTEGER | 0 | |
| `free_ingests_remaining` | INTEGER | 3 | 무료 프로필 ingest 잔여 횟수 |
| `created_at` | TIMESTAMPTZ | now() | |
| `updated_at` | TIMESTAMPTZ | now() | onupdate |
| `last_login_at` | TIMESTAMPTZ | NULL | |

## 관련 파일

- `backend/app/core/database.py` — 엔진, 세션 팩토리
- `backend/app/core/encryption.py` — AES-256-GCM 암복호화
- `backend/app/core/config.py` — DATABASE_URL, ENCRYPTION_KEY
- `backend/alembic/` — 마이그레이션 스크립트
- `backend/app/models/` — SQLAlchemy ORM 모델
