# 인증/계정 규칙 (Auth)

## 회원가입

| 항목 | 규칙 |
|------|------|
| 이메일 | 고유, 필수 |
| 비밀번호 | bcrypt 해시 저장 |
| 이름 | 필수, 최대 100자 |
| 초기 포인트 | **30P 자동 지급** (웰컴 보너스) |
| 무료 Ingest | **3회** (`free_ingests_remaining`) |
| 활성 상태 | `is_active=True` |
| 어드민 여부 | `is_admin=False` |

## JWT 토큰

| 항목 | 값 |
|------|-----|
| 알고리즘 | RS256 (비대칭 키) |
| Private Key | `./keys/private.pem` |
| Public Key | `./keys/public.pem` |
| Access Token 만료 | 30분 |
| Refresh Token 만료 | 7일 |

### 토큰 플로우

1. 로그인 성공 → Access Token + Refresh Token(httpOnly 쿠키) 발급
2. Access Token 만료 → 프론트엔드가 `/auth/refresh`로 자동 갱신
3. Refresh Token 만료 → 로그인 페이지로 리다이렉트

## 로그인 검증

1. 이메일 존재 여부 확인
2. 비밀번호 해시 검증
3. `is_active=True` 확인 (비활성 계정 차단)
4. 성공 시 `last_login_at` 타임스탬프 갱신

## 어드민 계정

### 권한

| 항목 | 일반 유저 | 어드민 |
|------|----------|--------|
| 포인트 잔액 표시 | 실제 잔액 | 9,999,999P |
| 포인트 차감 | 적용 | **면제** |
| 무료 Ingest 차감 | 적용 | **면제** |
| 프로필 심층 분석 비용 | 15P | **무료** |
| 프롬프트 관리 | 불가 | 가능 |
| 유저 포인트 지급 | 불가 | 가능 |

### Superadmin 자동 생성

서버 시작 시 환경변수 기반으로 자동 생성:

```
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=secure_password
SUPERADMIN_NAME=관리자
```

- 3개 모두 설정되어야 동작
- 이미 존재하면 어드민 권한 부여만
- **절대 코드에 하드코딩 금지**

## 브라우저 자동완성

| 페이지 | 필드 | autoComplete |
|--------|------|-------------|
| 로그인 | 이메일 | `email` |
| 로그인 | 비밀번호 | `current-password` |
| 회원가입 | 이름 | `name` |
| 회원가입 | 이메일 | `email` |
| 회원가입 | 비밀번호 | `new-password` |

## 관련 파일

- `backend/app/services/auth_service.py` — 가입/로그인/토큰 갱신
- `backend/app/core/security.py` — JWT 생성/검증, 비밀번호 해싱
- `backend/app/core/dependencies.py` — 인증 미들웨어
- `backend/app/api/v1/auth.py` — 인증 API 엔드포인트
- `backend/app/main.py` — Superadmin 시드 (lifespan)
- `frontend/src/stores/authStore.ts` — 클라이언트 인증 상태
- `frontend/src/api/client.ts` — 토큰 자동 갱신 인터셉터
