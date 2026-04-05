# AI 시스템 규칙 (AI_system)

## 모델 구성

| 용도 | 제공자 | 모델 | 비고 |
|------|--------|------|------|
| 자소서 생성/검토/인간화/갭분석 | Anthropic | **Claude Sonnet 4.6** | 주력 모델 |
| 기업 리서치 | OpenAI | **GPT-4o** | 폴백: GPT-4o-mini |
| 텍스트 파싱/분류/매칭 | OpenAI | **GPT-4o-mini** | 경량, 저비용 |
| 프로필 심층 분석 | OpenAI | **GPT-4o** | STAR 기법 변환 |
| 강점 요약 | OpenAI | **GPT-4o-mini** | 대시보드용 |
| 자소서 첨삭 | OpenAI | **GPT-4o-mini** | 유저 피드백 반영 |

## AI 에이전트 목록

### 1. GeneratorAgent — 자소서 생성

| 항목 | 값 |
|------|-----|
| 모델 | Claude Sonnet 4.6 |
| Temperature | 0.7 (균형적 창의성) |
| 입력 | 기업명, 포지션, 질문, 프로필, 기업리서치, AI 경험 메모리 |
| 출력 | STAR 기법 기반 자소서 초안 |
| 파일 | `backend/app/agents/generator.py` |

### 2. ReviewerAgent — AI 검토

| 항목 | 값 |
|------|-----|
| 모델 | Claude Sonnet 4.6 |
| Temperature | 0.3 (일관된 피드백) |
| 기능 | 의견 제시, 버전 비교, 검토 반영 |
| 파일 | `backend/app/agents/reviewer.py` |

### 3. HumanizerAgent — AI 어투 제거

| 항목 | 값 |
|------|-----|
| 모델 | Claude Sonnet 4.6 |
| Temperature | 0.6 (자연스러운 문체) |
| 기능 | AI 어투 감지, 인간적 문체로 재작성 |
| 파일 | `backend/app/agents/humanizer.py` |

### 4. ResearcherAgent — 기업 리서치

| 항목 | 값 |
|------|-----|
| 모델 | GPT-4o (주) / GPT-4o-mini (폴백) |
| Temperature | 0.3 |
| 출력 | overview, core_values, recent_news, talent_keywords, interview_tips |
| 캐시 | 7일 TTL (`company_position_cache` 테이블) |
| 파일 | `backend/app/agents/researcher.py` |

### 5. GapAnalyzerAgent — 갭 분석

| 항목 | 값 |
|------|-----|
| 모델 | Claude Sonnet 4.6 |
| Temperature | 0.2 (정확한 분석) |
| 출력 | critical / recommended / nice_to_have 갭 항목 |
| 파일 | `backend/app/agents/gap_analyzer.py` |

### 6. ReviserAgent — 자소서 첨삭

| 항목 | 값 |
|------|-----|
| 모델 | GPT-4o-mini |
| 기능 | 유저 피드백 반영 재작성 |
| 파일 | `backend/app/agents/reviser.py` |

## Temperature 가이드

| 범위 | 용도 | 에이전트 |
|------|------|---------|
| 0.2 | 사실 기반 분석 | GapAnalyzer |
| 0.3 | 일관된 평가 | Reviewer, Researcher |
| 0.6 | 자연스러운 문체 | Humanizer |
| 0.7 | 창의적 작문 | Generator |

## 프로필 AI 파이프라인

### Ingest (통합 업로드)

```
텍스트 추출 (무료)
  ↓
GPT-4o-mini 자동 분류 (5P 또는 무료 3회)
  ↓ 즉시 저장
[Optional] GPT-4o 심층 분석 (15P)
  - STAR 기법 변환
  - 자소서 활용 섹션 제안
  - 핵심 역량 추출
```

### AI 경험 해석 (Memory)

- **모델**: GPT-4o
- **비용**: 30P
- **출력**: STAR 기법 전략 메모리 (AES-256-GCM 암호화 저장)
- **용도**: GeneratorAgent 입력 컨텍스트로 활용

### 대시보드 강점 요약

- **모델**: GPT-4o-mini
- **조건**: 프로필 3개 이상 등록 시
- **비용**: 0P (플랫폼 부담)
- **출력**: 핵심 강점 3가지

## 프롬프트 관리 (동적 시스템)

### 우선순위

```
1. DB (prompt_configs 테이블) — 어드민이 수정한 값
2. 코드 기본값 (backend/app/agents/prompts/) — 하드코딩
```

어드민이 DB에서 수정하면 코드 배포 없이 즉시 적용.

### 프롬프트 키 목록

| 키 | 카테고리 | 용도 |
|----|---------|------|
| `generator_system` | generator | 자소서 생성 시스템 프롬프트 |
| `generator_user` | generator | 자소서 생성 유저 템플릿 |
| `reviewer_system` | reviewer | 검토 시스템 프롬프트 |
| `reviewer_opinion` | reviewer | 의견 생성 템플릿 |
| `reviewer_compare` | reviewer | 버전 비교 템플릿 |
| `apply_review` | reviewer | 검토 반영 템플릿 |
| `gap_system` | gap | 갭 분석 시스템 프롬프트 |
| `gap_analysis` | gap | 갭 분석 유저 템플릿 |
| `humanizer_system` | humanizer | 인간화 시스템 프롬프트 |
| `humanizer_detect` | humanizer | AI 어투 감지 템플릿 |
| `humanizer_rewrite` | humanizer | 인간화 재작성 템플릿 |

### 어드민 프롬프트 API

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/v1/admin/prompts` | 전체 프롬프트 목록 |
| `GET /api/v1/admin/prompts/{key}` | 특정 프롬프트 조회 |
| `PUT /api/v1/admin/prompts/{key}` | 프롬프트 수정 |
| `POST /api/v1/admin/prompts/{key}/reset` | 코드 기본값으로 초기화 |

## 자소서 생성 전체 플로우

```
POST /projects/{id}/generate
  │
  ├─ 1. 기업 리서치 (GPT-4o) → DB 캐시 저장 (7일)
  │
  ├─ 2. 프로필 + 리서치 매칭 (GPT-4o-mini)
  │
  ├─ 3. 자소서 초안 생성 (Claude Sonnet 4.6)
  │
  │ [유저 선택]
  ├─ 4. AI 검토 의견 (Claude Sonnet 4.6)       /answers/*/review
  ├─ 5. 검토 반영 재작성 (Claude Sonnet 4.6)   /answers/*/apply-review
  ├─ 6. AI 어투 감지 → 인간화 (Claude Sonnet 4.6)  /answers/*/humanize
  └─ 7. 갭 분석 (Claude Sonnet 4.6)             /projects/{id}/gap
```

## 면접 AI (예정)

### 질문 생성 전략

| 유형 | 비율 | 소스 |
|------|------|------|
| RESUME (자소서 기반) | 2/5 | 자소서 스냅샷 |
| VALUES (가치관) | 1/5 | 기업 리서치 |
| TECHNICAL (기술) | 1/5 | 포지션 기반 |
| SITUATIONAL (상황) | 1/5 | 시나리오 기반 |

### 규칙

- 세션 시작 시 자소서 스냅샷 고정 (이후 수정 무관)
- 꼬리 질문: 질문당 최대 **5개**
- 세션당 최대 질문: **30개**

## API 키 관리

| 키 | 환경변수 | 필수 여부 |
|----|---------|----------|
| Anthropic | `ANTHROPIC_API_KEY` | 필수 |
| OpenAI | `OPENAI_API_KEY` | 필수 |

- **절대 코드에 하드코딩 금지**
- **환경변수로만 관리**
- 미설정 시 서비스 오류 (목업 응답 없음)

## 관련 파일

- `backend/app/agents/generator.py` — 자소서 생성
- `backend/app/agents/reviewer.py` — AI 검토
- `backend/app/agents/humanizer.py` — AI 어투 제거
- `backend/app/agents/researcher.py` — 기업 리서치
- `backend/app/agents/gap_analyzer.py` — 갭 분석
- `backend/app/agents/reviser.py` — 자소서 첨삭
- `backend/app/agents/prompt_loader.py` — 동적 프롬프트 로더 (DB 우선)
- `backend/app/agents/prompts/` — 코드 기본값 프롬프트
- `backend/app/services/profile_service.py` — 프로필 AI 파이프라인
