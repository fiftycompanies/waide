# 에이전트 모델 라우팅 규칙 (OMC 기반)

## 원칙

OMC(oh-my-claudecode)의 3-티어 라우팅을 Python 에이전트에 적용한다.
비용 최적화와 품질 보장을 동시에 달성하기 위해, 태스크 복잡도에 따라
모델을 자동 선택한다.

```
LOW  (Haiku)  → 단순·반복·파싱·검수 → 비용 최소화
MED  (Sonnet) → 표준 집필·분석·전략 → 균형
HIGH (Opus)   → 심층 전략·보안감사·딥리서치 → 품질 최대화
```

## 에이전트별 기본 티어

| 에이전트 | 기본 티어 | 이유 |
|----------|-----------|------|
| ACCOUNT_MANAGER | LOW | 결제 확인 = 단순 로직 |
| CMO | MED | 표준 전략 = Sonnet |
| COPYWRITER | MED | 블로그 집필 = Sonnet |
| RND | LOW | AEO 시뮬레이션 = Haiku |
| OPS_QUALITY | LOW | 규칙 검수 = Haiku |
| OPS_PUBLISHER | LOW | 발행 포맷팅 = 단순 |
| ANALYST_REPORT | MED | 주간 리포트 = Sonnet |

## 태스크 힌트로 티어 승격

`complete_routed(agent_type, ..., task_hint="경쟁사 분석")`처럼
`task_hint` 키워드를 전달하면 자동으로 HIGH 티어로 승격된다.

### HIGH 트리거 키워드

- CMO: `경쟁사 분석`, `시장 포지셔닝`, `포지셔닝`, `멀티 플랫폼 전략`
- RND: `딥리서치`, `알고리즘 분석`, `시계열 예측`, `팩트 발굴`
- COPYWRITER: `프리미엄 콘텐츠`, `플래그십 아티클`
- QC: `스키마 보안 감사`, `취약점 검사`

### LOW 고정 키워드

- `AEO 시뮬레이션`, `인용 스캔`, `결제 확인`, `발행 처리`, `규칙 기반 검수`

## 코드 패턴

```python
# ✅ 권장 — 자동 라우팅
result = claude_client.complete_routed(
    agent_type="CMO",
    system=system_prompt,
    user=user_prompt,
    task_hint="경쟁사 분석 포함 전략 수립",  # HIGH 승격
)

# ✅ 권장 — 명시적 LOW (단순 작업)
result = claude_client.complete(
    system=system,
    user=user,
    model=claude_client.ModelTier.LOW,
)

# ❌ 비권장 — 하드코딩
result = claude_client.complete(system=s, user=u, model="claude-sonnet-4-6")
```

## 환경변수 오버라이드

```bash
# 전체 에이전트 Haiku로 강제 (비용 테스트)
FORCE_MODEL=claude-haiku-4-5-20251001 python main.py --once

# 전체 에이전트 Opus로 강제 (품질 테스트)
FORCE_MODEL=claude-opus-4-6 python main.py --once
```

## 비용 목표

- 표준 운영: 콘텐츠 1건당 $0.05 이하 (Sonnet 기준)
- AEO 스캔: 키워드 1개당 $0.001 이하 (Haiku)
- CMO 전략 (복잡): 캠페인 1회당 $0.30 이하 (Opus)
