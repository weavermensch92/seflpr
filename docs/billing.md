# 결제/포인트 규칙 (Billing)

## 포인트 환율

| 항목 | 값 |
|------|-----|
| 충전 단위 | **100P / 10,000원** |
| 1P | **100원** |
| 결제 수단 | 토스페이먼츠 (예정) |

## 서비스별 비용

| 서비스 | 포인트 | 원화 환산 | 설정 위치 |
|--------|--------|----------|----------|
| 자소서 프로젝트 생성 | **30P** | 3,000원 | `PROJECT_PRICE` |
| 면접 연습 세션 시작 | **60P** | 6,000원 | `INTERVIEW_PRICE` |
| 면접 신규 질문 | **3P** | 300원 | 모델 상수 |
| 면접 꼬리 질문 | **1P** (질문당 최대 5개) | 100원 | 모델 상수 |
| 프로필 AI 분류 (Ingest) | **5P** 또는 무료 3회 | 500원 | — |
| 프로필 심층 분석 (Enrichment) | **15P** | 1,500원 | — |
| AI 경험 해석 (Memory) | **30P** | 3,000원 | — |

## 무료 혜택

| 항목 | 값 | 시점 |
|------|-----|------|
| 가입 웰컴 보너스 | **30P** | 회원가입 직후 자동 지급 |
| 무료 프로필 Ingest | **3회** | 가입 시 `free_ingests_remaining=3` |

## 포인트 차감 규칙

1. **선차감**: 서비스 실행 **전에** 포인트 차감
2. **잔액 부족 시**: HTTP 402 (Payment Required) 반환
3. **어드민 면제**: `is_admin=True` 계정은 차감 없이 무제한 이용
4. **동시성 제어**: `SELECT ... FOR UPDATE` 락으로 race condition 방지

## 포인트 트랜잭션 유형

| 유형 (`PointTransactionType`) | 설명 |
|------|------|
| `CHARGE` | 결제를 통한 충전 |
| `CONSUME` | 서비스 이용 차감 |
| `REFUND` | 환불 |
| `ADMIN_GRANT` | 어드민 수동 지급 |

### 트랜잭션 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `amount` | INTEGER | 변동량 (충전: +, 차감: -) |
| `balance_after` | INTEGER | 변동 후 잔액 |
| `reason` | VARCHAR | 사유 (예: `project_create`, `profile_ingest`, `신규 가입 웰컴 포인트`) |
| `reference_id` | UUID | 관련 리소스 ID (프로젝트, 세션 등) |
| `payment_id` | UUID | 연결된 결제 ID (충전 시) |

## 어드민 포인트 지급

```http
POST /api/v1/admin/users/{user_id}/grant-points
Content-Type: application/json

{
  "amount": 100,
  "reason": "admin_grant"
}
```

- `ADMIN_GRANT` 타입으로 PointTransaction 생성
- 즉시 `users.point_balance` 반영

## AI 원가 분석

### 자소서 1건당 (~$0.13)

| 단계 | 모델 | 비용 |
|------|------|------|
| 기업 리서치 | GPT-4o-mini | ~$0.003 |
| 기업 분석 | Claude Sonnet 4.6 | ~$0.05 |
| 프로필 매칭 | GPT-4o-mini | ~$0.003 |
| 자소서 작성 (6문항) | Claude Sonnet 4.6 | ~$0.07 |
| **합계** | | **~$0.13 (약 180원)** |

**마진: 3,000원 - 180원 = 2,820원/건 (94%)**

### 면접 세션당 (~$0.68, 20문답 기준)

| 항목 | 비용 |
|------|------|
| 시스템 프롬프트 + 첫 질문 | ~$0.03 |
| 답변 피드백 × 20 | ~$0.40 |
| 신규 질문 × 10 | ~$0.15 |
| 꼬리 질문 × 10 | ~$0.10 |
| **합계** | **~$0.68 (약 940원)** |

**마진: 6,000원 - 940원 = 5,060원/세션 (84%)**

### 기업 리서치 캐시 효과

- 동일 기업+포지션 2번째 요청부터 캐시 재활용 → AI 비용 0
- 캐시 TTL: **7일** (`COMPANY_CACHE_TTL_DAYS`)

## 결제 모델 (토스페이먼츠, 예정)

| 필드 | 설명 |
|------|------|
| `Payment.order_id` | 고유 주문 ID (unique) |
| `Payment.payment_key` | 토스 결제 키 |
| `Payment.pg_response` | PG 응답 전문 (JSONB) |
| `Payment.status` | `pending` → `completed` / `failed` / `cancelled` / `refunded` |

### 결제 플로우 (예정)

```
유저 충전 요청
  → 토스 위젯 렌더링 (TOSS_CLIENT_KEY)
  → 결제 완료 콜백
  → 서버에서 토스 API로 결제 승인 확인 (TOSS_SECRET_KEY)
  → Payment.status = completed
  → PointTransaction(CHARGE) 생성
  → users.point_balance 증가
```

### 환경변수

| 변수 | 설명 |
|------|------|
| `TOSS_CLIENT_KEY` | 토스페이먼츠 클라이언트 키 (프론트엔드 위젯) |
| `TOSS_SECRET_KEY` | 토스페이먼츠 시크릿 키 (서버 결제 승인) |

## 관련 파일

- `backend/app/services/point_service.py` — 포인트 차감/충전/조회
- `backend/app/models/payment.py` — Payment, PointTransaction 모델
- `backend/app/api/v1/points.py` — 포인트 잔액/이력 API
- `backend/app/api/v1/admin.py` — 어드민 포인트 지급
- `backend/app/core/config.py` — 가격 설정 (PROJECT_PRICE 등)
