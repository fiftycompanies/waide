# Analysis Squad — Dev Agent

> 담당: 키워드 엔진, 질문 확장 엔진, 경쟁사 분석, Gap 분석
> 최종 업데이트: 2026-03-07

---

## 1. 담당 영역

| 에이전트 | 역할 | Phase |
|---------|------|-------|
| Keyword Agent | 키워드 발굴 + 검색량 조회 + 니치 키워드 확장 | 기존 확장 |
| Question Agent | 키워드 → 자연어 질문 20~30개 확장 | Phase 1 |
| Competitor Agent | 경쟁 브랜드 분석 + AI 인용 패턴 분석 | Phase 1 |
| Gap Analyzer | AI 미노출 질문 발견 → 콘텐츠 기회 제안 | Phase 1 |

---

## 2. 작업 폴더

```
lib/actions/
├── keyword-actions.ts           # 기존 — 키워드 CRUD, SERP 조회
├── keyword-expansion-actions.ts # 기존 — 니치 키워드 확장, 승인/거절
├── keyword-strategy-actions.ts  # 기존 — CMO 키워드 공략 전략
├── question-actions.ts          # 신규 — Question Engine (질문 확장)
├── competitor-actions.ts        # 신규 — Competitor Agent (경쟁사 분석)
└── gap-analysis-actions.ts      # 신규 — Gap Analyzer (콘텐츠 기회)

lib/
├── naver-suggest-collector.ts   # 기존 — 네이버 자동완성/연관검색어 수집
├── competitor-collector.ts      # 기존 — 네이버 로컬 검색 경쟁사 TOP5
└── question-engine.ts           # 신규 — 질문 확장 핵심 로직

agents/analysis/                 # Python 에이전트 (향후)
├── keyword_agent.py
├── question_agent.py
├── competitor_agent.py
└── gap_analyzer.py

prompts/analysis/                # 에이전트 프롬프트 저장
└── (task별 프롬프트 파일)
```

---

## 3. 기술 규칙

### 3-1. API 키 사용

| API | 환경변수 | 용도 | 없을 때 |
|-----|---------|------|--------|
| 네이버 광고 API | `NAVER_AD_API_KEY`, `NAVER_AD_SECRET_KEY`, `NAVER_AD_CUSTOMER_ID` | 키워드 검색량 조회 | graceful skip — 검색량 0 반환 |
| Claude API | `ANTHROPIC_API_KEY` | 질문 생성, 경쟁사 분석, Gap 분석 | 해당 기능 비활성 + console.warn |
| Serper API | `SERPER_API_KEY` | Google PAA (People Also Ask) 수집 | PAA 소스 skip, LLM+네이버만 사용 |

```typescript
// 예시: API 키 없으면 graceful skip
export async function expandQuestions(keywordId: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[QuestionAgent] ANTHROPIC_API_KEY not set — skipping');
    return { questions: [], source: 'skipped' };
  }
  // ... 로직
}
```

### 3-2. DB 규칙

- `keywords` 테이블 status CHECK: `'active'/'paused'/'archived'/'queued'/'refresh'/'suggested'`
- `keywords` 테이블 priority CHECK: `'critical'/'high'/'medium'/'low'`
- 모든 데이터는 `client_id` FK로 연결
- JSONB 업데이트: SELECT → spread → UPDATE

---

## 4. DB 테이블

### 4-1. 기존 테이블

| 테이블 | 용도 |
|--------|------|
| `keywords` | 키워드 관리 (status, priority, metadata JSONB, source) |
| `keyword_difficulty` | 키워드 난이도 (S/A/B/C) |
| `keyword_visibility` | 키워드별 visibility 점수 |
| `brand_analyses` | 브랜드 분석 결과 (analysis_result JSONB에 keyword_strategy 포함) |

### 4-2. 신규 테이블 (Phase 3에서 생성)

```sql
-- questions: 키워드별 자연어 질문 풀
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  keyword_id UUID NOT NULL REFERENCES keywords(id),
  question TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'ko',        -- 'ko' | 'en'
  source VARCHAR(20) NOT NULL,              -- 'llm' | 'paa' | 'naver_suggest' | 'manual'
  status VARCHAR(20) DEFAULT 'active',      -- 'active' | 'paused' | 'archived'
  metadata JSONB DEFAULT '{}',              -- 검색량, 난이도 등 부가 정보
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_keyword ON questions(keyword_id);
CREATE INDEX idx_questions_client ON questions(client_id);
```

---

## 5. Question Engine 상세 설계

### 5-1. 목표

키워드 1개 → 질문 20~30개 자동 생성

### 5-2. 소스 3가지

| 소스 | 방법 | 예상 질문 수 | API |
|------|------|------------|-----|
| LLM 생성 | Claude API로 자연어 질문 생성 (한국어/영어) | 15~20개 | ANTHROPIC_API_KEY |
| Google PAA | Serper API의 `peopleAlsoAsk` 필드 활용 | 4~8개 | SERPER_API_KEY |
| 네이버 자동완성 | 기존 `naver-suggest-collector.ts` 재사용 | 5~10개 | 없음 (무료) |

### 5-3. LLM 질문 생성 프롬프트 구조

```
[시스템 프롬프트]
당신은 한국 로컬 비즈니스 마케팅 전문가입니다.
주어진 키워드에 대해 실제 소비자가 AI 챗봇(ChatGPT, Perplexity 등)에
물어볼 법한 자연어 질문을 생성합니다.

[사용자 프롬프트]
키워드: {{keyword}}
업종: {{business_type}}
지역: {{location}}

다음 유형별로 질문을 생성해주세요:
1. 추천 질문 (5개): "~에서 추천할 만한 곳?"
2. 비교 질문 (5개): "A와 B 중 어디가 좋아?"
3. 정보 질문 (5개): "~ 가격은?", "~ 영업시간은?"
4. 경험 질문 (3개): "~ 가본 사람?", "~ 후기 어때?"
5. 상황 질문 (2개): "데이트할 때 ~ 어디?", "가족 모임에 ~"

JSON 배열로 출력:
[{"question": "...", "type": "recommendation|comparison|info|experience|situation"}]
```

### 5-4. Google PAA 수집

```typescript
// Serper API의 peopleAlsoAsk 필드 활용
const response = await fetch('https://google.serper.dev/search', {
  method: 'POST',
  headers: {
    'X-API-KEY': process.env.SERPER_API_KEY!,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    q: keyword,
    gl: 'kr',
    hl: 'ko'
  })
});
const data = await response.json();
const paaQuestions = data.peopleAlsoAsk?.map((p: any) => p.question) ?? [];
```

### 5-5. 네이버 자동완성 수집

기존 `lib/naver-suggest-collector.ts`의 `collectNaverSuggestions()` 재사용.
자동완성 결과 중 질문형 패턴 필터링 (`~인가요`, `~할까요`, `~어때요`, `~추천`).

### 5-6. 중복 제거 및 저장

```typescript
// 3개 소스 병합 → 유사도 기반 중복 제거 → DB 저장
async function expandAndSaveQuestions(keywordId: string, clientId: string) {
  const [llmQuestions, paaQuestions, naverQuestions] = await Promise.allSettled([
    generateLLMQuestions(keyword),
    collectPAAQuestions(keyword),
    collectNaverSuggestQuestions(keyword)
  ]);

  // 합산 → 중복 제거 (정규화 후 비교)
  const unique = deduplicateQuestions(allQuestions);

  // DB batch insert
  await supabase.from('questions').insert(
    unique.map(q => ({
      client_id: clientId,
      keyword_id: keywordId,
      question: q.question,
      language: q.language || 'ko',
      source: q.source
    }))
  );
}
```

---

## 6. Competitor Agent 설계

### 6-1. 기존 인프라 활용

- `lib/competitor-collector.ts`: 네이버 로컬 검색 API 경쟁사 TOP5 수집 (이미 구현)
- `lib/analysis-agent-chain.ts`: RND 경쟁사 분석 에이전트 (이미 구현)

### 6-2. AEO 확장 — AI 인용 패턴 분석

Phase 5 이후, LLM Crawler 데이터를 기반으로:
- 경쟁 브랜드가 AI 답변에 얼마나 자주 언급되는지 추적
- 어떤 콘텐츠 구조가 AI에 인용되는지 패턴 분석
- Gap Analyzer에 데이터 제공

---

## 7. Gap Analyzer 설계

### 7-1. 입력

- `questions` 테이블: 키워드별 질문 목록
- `llm_answers` 테이블 (Phase 5): AI 답변 수집 결과
- `mentions` 테이블 (Phase 5): 브랜드 언급 여부

### 7-2. 출력

- AI 미노출 질문 목록 (우리 브랜드가 언급되지 않는 질문)
- 콘텐츠 기회 제안 (어떤 유형의 글을 작성하면 노출 가능성 높은지)
- 우선순위 순 정렬 (검색량 × 경쟁도 기반)

### 7-3. 실행 시점

- Tracking Squad의 LLM Crawler + Mention Detector 실행 후
- 주간 배치 또는 수동 트리거
