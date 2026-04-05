# 인증/계정 규칙 (Auth)

## 회원가입 플로우 (3단계 OTP)

```
① 전화번호 입력 → POST /auth/phone/send-otp
② 인증번호 6자리 입력 → POST /auth/phone/verify-otp
③ 이름/이메일/비밀번호 입력 → POST /auth/register
```

### 가입 요건

| 항목 | 규칙 |
|------|------|
| 이메일 | 고유, 필수, EmailStr 검증 |
| 비밀번호 | bcrypt 해시 저장, 8~128자 |
| 이름 | 필수, 1~100자 |
| 전화번호 | OTP 인증 완료 필수, 고유, `01[0-9]{8,9}` 패턴 |
| 초기 포인트 | **30P 자동 지급** (웰컴 보너스) |
| 무료 Ingest | **3회** (`free_ingests_remaining`) |
| 활성 상태 | `is_active=True` |
| 어드민 여부 | `is_admin=False` |

## SMS OTP (전화번호 인증)

| 항목 | 값 |
|------|-----|
| OTP 길이 | 6자리 숫자 |
| 유효 시간 | 5분 |
| 저장 방식 | 서버 인메모리 (`_otp_store` dict) |
| 인증 제공자 | CoolSMS (미설정 시 서버 로그 출력 — 개발 모드) |

### 관련 환경변수

| 변수 | 설명 |
|------|------|
| `COOLSMS_API_KEY` | CoolSMS API Key |
| `COOLSMS_API_SECRET` | CoolSMS API Secret |
| `COOLSMS_SENDER` | 발신 번호 (예: `01012345678`) |

> 3개 중 하나라도 없으면 개발 모드: OTP가 서버 로그에 출력됨

### OTP 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `POST /api/v1/auth/phone/send-otp` | 전화번호로 OTP 발송 |
| `POST /api/v1/auth/phone/verify-otp` | OTP 검증 → 인증 완료 마킹 |
| `POST /api/v1/auth/register` | phone_number 포함 가입 (인증 완료 여부 검증) |

## JWT 토큰

| 항목 | 값 |
|------|-----|
| 알고리즘 | RS256 (비대칭 키) |
| Private Key | `./keys/private.pem` |
| Public Key | `./keys/public.pem` |
| Access Token 만료 | 30분 |
| Refresh Token 만료 | 7일 (httpOnly Secure 쿠키) |
| Refresh 쿠키 path | `/api/v1/auth/refresh` |
| SameSite | `strict` |

### 토큰 플로우

```
로그인 → Access Token(응답 body) + Refresh Token(httpOnly 쿠키)
Access Token 만료 → POST /auth/refresh → 신규 Access Token
Refresh Token 만료 → 로그인 페이지 리다이렉트
로그아웃 → DELETE Refresh Token 쿠키
```

## 로그인 검증 순서

1. 이메일 존재 여부 확인
2. bcrypt 비밀번호 해시 검증
3. `is_active=True` 확인 (정지 계정: 403 반환)
4. 성공 시 `last_login_at` 타임스탬프 갱신

## 계정 상태

| 상태 | `is_active` | 로그인 | 설명 |
|------|-------------|--------|------|
| 활성 | `True` | 가능 | 정상 |
| 정지 | `False` | 403 차단 | 어드민이 토글 |

## 어드민 계정

### 권한 비교

| 항목 | 일반 유저 | 어드민 |
|------|----------|--------|
| 포인트 잔액 표시 | 실제 잔액 | 9,999,999P (무제한 표시) |
| 포인트 차감 | 적용 | **면제** |
| 무료 Ingest 차감 | 적용 | **면제** |
| 프롬프트 관리 | 불가 | 가능 |
| 유저 포인트 지급 | 불가 | 가능 |
| 유저 계정 정지 | 불가 | 가능 |
| 어드민 계정 정지 | — | **불가** (보호) |

### Superadmin 자동 생성 (서버 시작 시)

```
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=secure_password
SUPERADMIN_NAME=관리자
```

- 3개 모두 설정 시 동작
- 계정 미존재 → 생성 (`point_balance=9999999`, `is_admin=True`)
- 계정 존재 + 어드민 아님 → 어드민 권한 승격
- **절대 코드에 하드코딩 금지**

### 어드민 전용 API

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/v1/admin/users` | 전체 가입자 목록 |
| `POST /api/v1/admin/users/{id}/toggle-active` | 계정 활성화/정지 토글 |
| `POST /api/v1/admin/users/{id}/grant-points` | 포인트 수동 지급 |
| `GET /api/v1/admin/dashboard` | 대시보드 통계 |
| `GET/PUT/POST /api/v1/admin/prompts/*` | 프롬프트 관리 |

## 브라우저 자동완성

| 페이지 | 필드 | autoComplete |
|--------|------|-------------|
| 로그인 | 이메일 | `email` |
| 로그인 | 비밀번호 | `current-password` |
| 회원가입 | 이름 | `name` |
| 회원가입 | 이메일 | `email` |
| 회원가입 | 비밀번호 | `new-password` |

## 관련 파일

**Backend**
- `backend/app/services/auth_service.py` — 가입/로그인/토큰 갱신
- `backend/app/services/sms_service.py` — OTP 생성/발송/검증 (CoolSMS)
- `backend/app/core/security.py` — JWT 생성/검증, bcrypt
- `backend/app/core/dependencies.py` — `get_current_user_id`, `get_current_admin_user_id`
- `backend/app/api/v1/auth.py` — 인증 API 엔드포인트
- `backend/app/api/v1/admin.py` — 어드민 전용 API
- `backend/app/main.py` — Superadmin 시드 (lifespan)

**Frontend**
- `frontend/src/stores/authStore.ts` — 클라이언트 인증 상태 (Zustand + persist)
- `frontend/src/api/auth.ts` — authApi (register, login, sendOtp, verifyOtp)
- `frontend/src/api/client.ts` — Axios 인터셉터 (토큰 자동 갱신)
- `frontend/src/pages/auth/RegisterPage.tsx` — 3단계 OTP 가입 폼
- `frontend/src/components/auth/RequireAuth.tsx` — 인증 필요 라우트 가드
- `frontend/src/components/auth/RequireAdmin.tsx` — 어드민 전용 라우트 가드
