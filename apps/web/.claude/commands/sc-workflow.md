# /sc:workflow — CMO 캠페인 워크플로우 생성

SuperClaude `workflow` 커맨드를 AI 마케터 CMO 파이프라인에 매핑한다.
클라이언트 ID와 요구사항을 받아 완전한 캠페인 실행 계획을 생성한다.

## 사용법

```
/sc:workflow [client_id] [캠페인 요구사항]
/sc:workflow --strategy agile --depth deep
```

## 워크플로우 5단계

**Phase 1 — 시장 분석 (Product Strategist)**
- 클라이언트의 현재 키워드 포트폴리오 분석
- STP(Segmentation/Targeting/Positioning) 프레임워크 적용
- 경쟁사 빈틈 파악 (competition=LOW & monthly_search 상위)

**Phase 2 — 콘텐츠 로드맵 (Writing Plans)**
- 단기(2주): 블루오션 키워드 → 빠른 상위노출 확보
- 중기(1-2개월): 경쟁 키워드 → E-E-A-T 강화 병행
- 우선순위: priority_score × blog_score × (1 - competition_score)

**Phase 3 — 에이전트 태스크 분배**
- CMO → COPYWRITER 작업 지시서 생성
- RND → 경쟁사 URL 수집 + 시맨틱 키워드 확장 의뢰
- OPS_QUALITY → 검수 기준 사전 공유

**Phase 4 — 실행 (Execute)**
- Job 큐에 CAMPAIGN_PLAN 등록
- `python main.py --agents CMO --once`로 즉시 실행 가능

**Phase 5 — 검증 (Validate)**
- OPS_QUALITY 자동 검수 대기
- `/ops/jobs` 대시보드에서 실시간 모니터링

## 구현 예시

```bash
# 에이전트 직접 실행
cd agents/
python -c "
from core.db_client import DBClient
db = DBClient()
db.create_job({
    'job_type': 'CAMPAIGN_PLAN',
    'assigned_agent': 'CMO',
    'title': '[캠페인] {client_name} 월간 전략',
    'input_payload': {'client_id': '{client_id}'}
})
"
```

## 출력 형식

워크플로우 계획서 (Markdown):
- 전략 요약
- 키워드별 콘텐츠 배정표
- 에이전트 실행 순서
- 예상 성과 지표 (KPI)

> **참고**: 이 커맨드는 계획서만 생성한다. 실제 에이전트 실행은 `python main.py`로 수행.
