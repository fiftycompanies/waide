# Tracking Squad — Dev Agent

> 담당: SERP 추적, LLM 답변 수집, 브랜드 언급 감지, AEO Score 계산
> 최종 업데이트: 2026-03-07

---

## 1. 담당 영역

| 에이전트 | 역할 | Phase |
|---------|------|-------|
| SERP Crawler | 네이버(자체 크롤링) + 구글(Serper API) 순위 수집 | 기존 유지 |
| LLM Crawler | ChatGPT/Perplexity/Gemini 답변 수집 | Phase 5 |
| Mention Detector | AI 답변에서 브랜드명 + 위치 추출 | Phase 5 |
| Score Calculator | AEO Visibility Score 계산 | Phase 5 |

---

## 2. 작업 폴더

```
lib/actions/
├── keyword-actions.ts           # 기존 — SERP 관련 액션
├── serp-actions.ts              # 기존 확장 가능
├── llm-crawl-actions.ts         # 신규 — LLM 답변 수집 액션
├── mention-actions.ts           # 신규 — 브랜드 언급 감지 액션
└── aeo-score-actions.ts         # 신규 — AEO Score 계산 액션

lib/
├── serp-collector.ts            # 기존 — 네이버 SERP 수집
├── naver-search-api.ts          # 기존 — 네이버 검색 API
├── google-serp-api.ts           # 기존 — Serper API (구글)
├── google-serp-collector.ts     # 기존 — 구글 SERP 수집
├── llm-crawler.ts               # 신규 — LLM 답변 수집 엔진
├── mention-detector.ts          # 신규 — 브랜드 언급 감지 엔진
└── aeo-score-calculator.ts      # 신규 — AEO Score 계산 엔진

app/api/cron/
├── serp/route.ts                # 기존 — 일일 SERP 수집 크론
└── aeo/route.ts                 # 신규 — 일일 AEO 추적 크론 (Phase 5)

agents/tracking/                 # Python 에이전트 (향후)
├── serp_crawler.py
├── llm_crawler.py
├── mention_detector.py
└── score_calculator.py

prompts/tracking/                # 에이전트 프롬프트 저장
└── (task별 프롬프트 파일)
```

---

## 3. LLM Crawling — 2단계 전략

### Phase 1 (즉시 구현): API 기반

안전하고 안정적. 공식 API만 사용.

| AI | 방법 | 출처 링크 | 비용 |
|----|------|----------|------|
| Perplexity | Perplexity API (`pplx-api`) | ✅ citations 필드 포함 | 유료 (PERPLEXITY_API_KEY) |
| Claude | Anthropic API (자체) | ❌ | 기존 ANTHROPIC_API_KEY |

```typescript
// Perplexity API 호출 예시
async function queryPerplexity(question: string): Promise<LLMAnswer> {
  if (!process.env.PERPLEXITY_API_KEY) {
    console.warn('[LLMCrawler] PERPLEXITY_API_KEY not set — skipping Perplexity');
    return null;
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: question }],
      return_citations: true
    })
  });

  const data = await response.json();
  return {
    platform: 'perplexity',
    question,
    answer: data.choices[0].message.content,
    citations: data.citations ?? [],
    collected_at: new Date().toISOString()
  };
}

// Claude API 호출 (자체 — AEO 시뮬레이션용)
async function queryClaude(question: string): Promise<LLMAnswer> {
  // 기존 ANTHROPIC_API_KEY 사용
  // Claude의 답변에서 우리 브랜드가 언급되는지 시뮬레이션
}
```

### Phase 2 (홀드): Playwright 크롤링

ChatGPT, Gemini 웹 인터페이스 크롤링. 설계만 완료, 실행 홀드.

```
필요 인프라:
- Residential proxy pool (BrightData/Smartproxy)
- playwright-stealth plugin
- Account pool DB (50~100개)
- 계정 aging (3주 활동 후 사용)
- 요청 간격 10~30초 (랜덤)
- 예상 비용: 월 $200~500
```

---

## 4. Mention Detection 방법

두 가지 방법 병행 — LLM 추출 우선, 실패 시 문자열 매칭.

### 방법 1: Claude API로 JSON 추출 (우선)

```typescript
async function detectMentionsWithLLM(
  answer: string,
  brandAliases: string[]
): Promise<Mention[]> {
  const prompt = `다음 AI 답변에서 언급된 브랜드/가게/업체명을 모두 추출해주세요.
특히 다음 브랜드의 언급 여부를 확인해주세요: ${brandAliases.join(', ')}

AI 답변:
${answer}

JSON 배열로 출력:
[{
  "name": "브랜드명",
  "is_target_brand": true/false,
  "position": 순서(1부터),
  "context": "언급된 문장",
  "mention_type": "recommendation|comparison|definition|passing"
}]`;

  const result = await callClaude(prompt);
  return JSON.parse(result);
}
```

### 방법 2: 문자열 매칭 Fallback

```typescript
function detectMentionsWithString(
  answer: string,
  brandAliases: string[]
): Mention[] {
  const mentions: Mention[] = [];

  for (const alias of brandAliases) {
    const normalizedAnswer = answer.toLowerCase().replace(/\s+/g, '');
    const normalizedAlias = alias.toLowerCase().replace(/\s+/g, '');

    if (normalizedAnswer.includes(normalizedAlias)) {
      const idx = answer.indexOf(alias);
      const context = answer.substring(
        Math.max(0, idx - 50),
        Math.min(answer.length, idx + alias.length + 50)
      );
      mentions.push({
        name: alias,
        is_target_brand: true,
        position: 0, // 문자열 매칭에서는 순위 추출 어려움
        context,
        mention_type: 'unknown'
      });
    }
  }

  return mentions;
}
```

### 통합 함수

```typescript
async function detectMentions(
  answer: string,
  brandAliases: string[]
): Promise<Mention[]> {
  // 1차: LLM 추출 시도
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      return await detectMentionsWithLLM(answer, brandAliases);
    }
  } catch (e) {
    console.warn('[MentionDetector] LLM extraction failed, falling back to string matching');
  }

  // 2차: 문자열 매칭 fallback
  return detectMentionsWithString(answer, brandAliases);
}
```

---

## 5. AEO Visibility Score 공식

### 5-1. 기본 공식

```
AEO Visibility Score = Σ(mention_weight × position_weight) / total_queries × 100
```

### 5-2. Position Weight (언급 위치 가중치)

| 위치 | 가중치 | 설명 |
|------|--------|------|
| 1위 언급 | 1.0 | 첫 번째로 추천된 브랜드 |
| 2위 언급 | 0.7 | 두 번째 추천 |
| 3위 언급 | 0.4 | 세 번째 추천 |
| 본문 언급 (비순위) | 0.2 | 리스트가 아닌 본문에서 언급 |
| 미언급 | 0 | 언급되지 않음 |

### 5-3. Mention Weight (AI 플랫폼별 가중치)

| AI 플랫폼 | 가중치 | 근거 |
|----------|--------|------|
| ChatGPT | 1.0 | 사용자 수 가장 많음 |
| Perplexity | 0.8 | 출처 링크 포함 — 트래픽 직접 유도 |
| Gemini | 0.7 | 구글 검색 연동 |
| Claude | 0.5 | 상대적으로 적은 사용자 |

### 5-4. 변동성 대응

AI 답변은 같은 질문에도 매번 다름 (40~60% 월간 변동).

```typescript
// 동일 질문 N회 반복 → 평균으로 score 산출
const REPEAT_COUNT = 5; // 기본 5회

async function calculateReliableScore(
  question: string,
  brandAliases: string[],
  platform: 'perplexity' | 'claude'
): Promise<number> {
  const scores: number[] = [];

  for (let i = 0; i < REPEAT_COUNT; i++) {
    const answer = await queryLLM(platform, question);
    const mentions = await detectMentions(answer, brandAliases);
    const targetMention = mentions.find(m => m.is_target_brand);

    if (targetMention) {
      const posWeight = getPositionWeight(targetMention.position);
      scores.push(posWeight);
    } else {
      scores.push(0);
    }

    // Rate limit 대응: 요청 간격 2초
    await sleep(2000);
  }

  // 평균 score 반환
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
```

### 5-5. 비용 최적화

```
전체 질문 풀에서 주간 샘플링:
- 중요 키워드 (critical/high): 매일 추적
- 일반 키워드 (medium/low): 주간 추적
- 전체 풀의 30%를 매일 로테이션

예상 API 호출량 (키워드 50개, 질문 1,000개 기준):
- 매일: 300개 질문 × 5회 반복 × 2 플랫폼 = 3,000 API 호출
- Perplexity: ~1,500 호출/일 (비용 확인 필요)
- Claude: ~1,500 호출/일 (Haiku 4.5 — 저렴)
```

---

## 6. DB 테이블 (Phase 5에서 생성)

```sql
-- llm_answers: AI 답변 수집 결과
CREATE TABLE IF NOT EXISTS llm_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  question_id UUID REFERENCES questions(id),
  question_text TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL,            -- 'chatgpt' | 'perplexity' | 'gemini' | 'claude'
  answer_text TEXT NOT NULL,
  citations JSONB DEFAULT '[]',             -- [{url, title}]
  raw_response JSONB DEFAULT '{}',
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- mentions: 브랜드 언급 감지 결과
CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  llm_answer_id UUID NOT NULL REFERENCES llm_answers(id),
  brand_name TEXT NOT NULL,
  is_target_brand BOOLEAN DEFAULT false,
  position INTEGER,                          -- 추천 순위 (1위, 2위, ...)
  mention_type VARCHAR(20),                  -- 'recommendation' | 'comparison' | 'definition' | 'passing'
  context TEXT,                              -- 언급된 문장
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- aeo_scores: AEO Visibility Score 집계
CREATE TABLE IF NOT EXISTS aeo_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  score_date DATE NOT NULL,
  overall_score DECIMAL(5,2) DEFAULT 0,
  chatgpt_score DECIMAL(5,2) DEFAULT 0,
  perplexity_score DECIMAL(5,2) DEFAULT 0,
  gemini_score DECIMAL(5,2) DEFAULT 0,
  claude_score DECIMAL(5,2) DEFAULT 0,
  total_queries INTEGER DEFAULT 0,
  mentioned_queries INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, score_date)
);

CREATE INDEX idx_llm_answers_client ON llm_answers(client_id);
CREATE INDEX idx_llm_answers_question ON llm_answers(question_id);
CREATE INDEX idx_mentions_client ON mentions(client_id);
CREATE INDEX idx_mentions_answer ON mentions(llm_answer_id);
CREATE INDEX idx_aeo_scores_client_date ON aeo_scores(client_id, score_date);
```

---

## 7. 크론 잡

### 기존 크론

| 크론 | 경로 | 주기 |
|------|------|------|
| SERP 수집 | `/api/cron/serp` | 매일 |
| 검색량 수집 | `/api/cron/search-volume` | 분기별/수동 |
| 월간 리포트 | `/api/cron/monthly-report` | 매월 1일 |

### 신규 크론 (Phase 5)

| 크론 | 경로 | 주기 | 내용 |
|------|------|------|------|
| AEO 추적 | `/api/cron/aeo` | 매일 | LLM 답변 수집 → 브랜드 추출 → AEO Score 계산 |

```typescript
// /api/cron/aeo/route.ts 구조 (Phase 5에서 구현)
export async function GET(req: Request) {
  // 1. CRON_SECRET 인증
  // 2. 활성 클라이언트 조회
  // 3. 각 클라이언트별:
  //    a. 오늘 추적 대상 질문 선정 (샘플링)
  //    b. LLM Crawler: Perplexity + Claude 답변 수집
  //    c. Mention Detector: 브랜드 추출
  //    d. Score Calculator: AEO Score 계산
  // 4. 결과 DB 저장
  // 5. 슬랙 알림 (변동 ±20% 이상 시)
}
```
