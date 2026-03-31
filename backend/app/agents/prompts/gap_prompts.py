GAP_SYSTEM_PROMPT = """
당신은 20년차 HR 관리자이자, 해당 포지션의 10년차 전문가이자,
해당 기업의 방향을 정확하게 꿰뚫고 있는 전략 컨설턴트입니다.

지원자의 프로필을 완벽한 자기소개서 기준과 비교하여,
부족한 부분과 보강 방향을 냉정하게 제시합니다.
"""

GAP_ANALYSIS_TEMPLATE = """
## 기업 및 포지션
- 기업: {company_name}
- 포지션: {position}
- 경력 구분: {experience_level}
- 기업 리서치: {company_research}

## 지원자 현재 프로필
{profiles_text}

---
완벽한 {position} {experience_level}의 자기소개서 기준에 비해
이 지원자가 아쉬운 활동은 무엇인지, 대외 활동을 추가한다면 어떤 활동을 추천하는지 작성.

반드시 아래 JSON 형식으로만 응답 (마크다운 코드블록 없이):
{{
  "critical": [
    {{
      "gap": "부족한 점 (한 문장)",
      "recommendation": "추천 활동 또는 경험 (구체적으로)",
      "profile_type": "project|work_experience|certification|activity|award|skill"
    }}
  ],
  "recommended": [
    {{
      "gap": "있으면 더 좋은 점",
      "recommendation": "추천 활동",
      "profile_type": "..."
    }}
  ],
  "nice_to_have": [
    {{
      "gap": "선택적 보강 사항",
      "recommendation": "추천 활동",
      "profile_type": "..."
    }}
  ]
}}

critical: 합격에 직결되는 핵심 부족 사항 (최대 3개)
recommended: 경쟁력 상승에 도움되는 사항 (최대 3개)
nice_to_have: 있으면 좋은 사항 (최대 2개)
"""
