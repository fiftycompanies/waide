# Waide × AEO 통합 마스터 설계서

> 작성일: 2026-03-07
> 목적: Waide 기존 서비스 + AEO 엔진 통합 설계
> 원칙: 수익모델 제외, 기술 난제는 해결방법 설계만 (실행 홀드)

---

## 1. 통합 후 서비스 정의

### 변경 전 (Waide 현재)

```
네이버 분석 → 키워드 추천 → 콘텐츠 생성 → SERP 추적 → 리포트
```

### 변경 후 (Waide + AEO)

```
브랜드 분석 → 프로젝트 자동 생성 → 키워드+질문 확장 → SEO 콘텐츠 + AEO 콘텐츠 생성 → 다채널 배포 → SERP 추적 + AI 답변 추적 → AEO Score → 피드백 루프
```

### 핵심 차이

| 항목 | Before | After |
|------|--------|-------|
| 추적 대상 | 네이버/구글 순위만 | + ChatGPT/Perplexity/Gemini 답변 |
| 콘텐츠 유형 | SEO 블로그 글 | + Q&A/리스트/커뮤니티/FAQ |
| 배포 채널 | 수동 발행 | 티스토리/WordPress/Medium/Reddit 자동 |
| 성과 지표 | SERP 순위 | + AEO Visibility Score |
| 키워드 | 키워드 기반 | + 질문(Question) 기반 |

---

## 2. 서비스 플로우 (통합 버전)

### Phase A: 브랜드 분석 + 프로젝트 생성

```
[랜딩: 네이버 URL 입력]
  │ 무료 마케팅 분석 (기존 Waide 분석 엔진)
  ▼
[분석 결과]
  │ 마케팅 점수 100점
  │ 6영역 진단 (리뷰/키워드/구글/이미지/채널/SEO)
  │ 경쟁사 분석 + 개선 제안
  ▼
[자동 프로젝트 생성]
  │ clients 테이블 INSERT (분석 결과 기반)
  │ brand_persona 자동 생성 (업종/타겟/강점/톤앤매너)
  │ 사용자가 키워드, 강점 등 보완/수정 가능
  │ [저장] 버튼 → 프로젝트 확정
  ▼
[온보딩 완료 → 대시보드 진입]
```

### Phase B: 키워드 + 질문 확장

```
[키워드 관리]
  │
  ├─ AI 키워드 추천 (기존 Waide — 기본 3개)
  ├─ 수동 키워드 추가 + 검색량 조회 (네이버 광고 API)
  ├─ 니치 키워드 발굴 (CMO 에이전트)
  │
  ▼ 각 키워드에서 [질문 자동 확장] ← AEO 신규
  │ 키워드 1개 → 질문 20~30개 자동 생성
  │ 소스: LLM 생성 + Google PAA + 커뮤니티 질문
  │ 예: "가평 글램핑" → "가평에서 커플 글램핑 추천해줘"
  ▼
[활성 키워드+질문 풀]
```

### Phase C: SEO + AEO 콘텐츠 생성

```
[콘텐츠 관리 — 통합 허브]
  │
  ├─ 탭1: 콘텐츠 목록 (상태별 필터)
  │
  ├─ 탭2: 새 콘텐츠 생성
  │   │ 키워드/질문 선택
  │   │ 콘텐츠 유형 선택:
  │   │   ○ SEO 블로그 글 (기존 COPYWRITER)
  │   │   ○ AEO Q&A 글 (질문→답변→상세)  ← 신규
  │   │   ○ AEO 리스트 글 (TOP10/BEST7)   ← 신규
  │   │   ○ 커뮤니티 글 (자연 대화형)      ← 신규
  │   │ Style Transfer 참조 선택
  │   │ [생성 지시] → 에이전트 파이프라인
  │
  └─ 탭3: 작업 현황 (진행 중 Jobs)
```

### Phase D: 다채널 배포

```
[발행하기] 버튼 → 발행 페이지 (3스텝)
  │
  ├─ Step 1: 콘텐츠 확인 + QC 점수 + [원고 복사]
  │
  ├─ Step 2: 발행 채널 선택
  │   │ ○ 수동 발행 (블로그 복사+붙여넣기) — 현재
  │   │ ○ 티스토리 자동 발행 (Tistory API) ← 신규
  │   │ ○ WordPress 자동 발행 (REST API)  ← 신규
  │   │ ○ Medium 자동 발행               ← 신규 (홀드)
  │   │ ○ Reddit 자동 발행               ← 신규 (홀드)
  │
  └─ Step 3: 발행 완료 + URL 입력 → 추적 시작
```

### Phase E: SEO + AEO 추적

```
[매일 크론 실행]
  │
  ├─ SERP 추적 (기존 Waide)
  │   │ 네이버 순위 (자체 크롤링)
  │   │ 구글 순위 (Serper API)
  │
  ├─ AEO 추적 ← 신규
  │   │ ChatGPT 답변 수집
  │   │ Perplexity 답변 수집
  │   │ Gemini 답변 수집
  │   │ 브랜드 언급 여부 + 위치 추출
  │   │ AEO Visibility Score 계산
  │
  └─ 피드백 루프
      │ AI 미노출 질문 발견
      │ → 경쟁 콘텐츠 패턴 분석
      │ → 콘텐츠 구조 자동 수정 제안
      │ → 재생성 + 재배포
```

### Phase F: 대시보드 + 리포트

```
[대시보드]
  │ SEO KPI (기존): 순위, 키워드 수, 콘텐츠 수
  │ AEO KPI (신규): AI Visibility Score, 언급 횟수, 경쟁 비교
  │ 진화지식 현황: 학습 패턴 수, Style Transfer 레퍼런스
  ▼
[월간 PDF 리포트] (기존 Waide + AEO 추가)
  │ SEO 성과 + AEO 성과 통합
```

---

## 3. IA (정보 구조) — 메뉴 변경

메뉴 구조: "SEO & AEO" 통합, 단계는 탭으로

```
─── SEO & AEO (고객+어드민) ───

📊 대시보드
   └ (탭) 종합 | SEO 성과 | AEO 성과 | 진화지식

🔑 키워드 관리
   └ (탭) 활성 키워드 | AI 추천 | 질문 확장 | 검색량 조회

📝 콘텐츠 관리
   └ (탭) 콘텐츠 목록 | 새 콘텐츠 생성 | 작업 현황

📌 발행 관리
   └ (탭) 발행 대기 | 발행 이력 | 자동 발행 설정

📈 성과 분석
   └ (탭) SERP 순위 | AEO 노출 | 경쟁 분석 | Citation 분석

─── 구분선 ───

─── 내부 관리 (어드민만) ───

🏢 고객 포트폴리오
🏪 브랜드 관리
🔗 온보딩
👤 계정 관리
💰 매출 관리
⚠️ 이탈 관리
📋 영업 CRM
📚 리소스

─── 설정 ───

🤖 에이전트 설정
   └ (탭) 프롬프트 관리 | 진화지식 | 에이전트 상태
⚙️ 시스템 설정
🚨 에러 로그
```

---

## 4. AI 오케스트레이션 — 에이전트 구조

### 변경 전 (Waide 현재)

```
CMO → RND → COPYWRITER → QC → PUBLISHER (직렬)
```

### 변경 후 — 병렬 + 하부 에이전트

```
                    CTO Agent (오케스트레이터)
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   Analysis         Content           Tracking
   Squad            Squad             Squad
   │                │                 │
   ├─ Keyword       ├─ SEO Writer     ├─ SERP Crawler
   │  Agent         │  (기존 COPYWRITER) │  (기존 N_SERP)
   │                │                 │
   ├─ Question      ├─ AEO Writer     ├─ LLM Crawler
   │  Agent         │  (Q&A/리스트)   │  (ChatGPT/Perplexity)
   │                │                 │
   ├─ Competitor    ├─ Community      ├─ Mention Detector
   │  Agent         │  Writer         │  (브랜드 추출)
   │                │                 │
   └─ Gap           ├─ QC Agent       └─ Score Calculator
      Analyzer      │  (기존 QC)          (AEO Score)
                    │
                    └─ Publisher
                       (다채널 배포)
```

### 에이전트 상세 정의

| 에이전트 | 소속 | 역할 | 기존/신규 |
|---------|------|------|----------|
| CTO Agent | - | 전체 오케스트레이션, 작업 분배, 리뷰 | 신규 |
| Keyword Agent | Analysis | 키워드 발굴 + 검색량 조회 | 기존 확장 |
| Question Agent | Analysis | 키워드→질문 확장 (PAA+LLM+커뮤니티) | 신규 |
| Competitor Agent | Analysis | 경쟁 브랜드 분석, AI 인용 패턴 분석 | 신규 |
| Gap Analyzer | Analysis | AI 미노출 질문 발견 → 콘텐츠 기회 | 신규 |
| SEO Writer | Content | SEO 블로그 글 (Style Transfer 포함) | 기존 (COPYWRITER) |
| AEO Writer | Content | Q&A 글, 리스트 글, FAQ 글 | 신규 |
| Community Writer | Content | 커뮤니티 자연 대화형 글 | 신규 (홀드) |
| QC Agent | Content | 품질 검수 (SEO+AEO 기준) | 기존 확장 |
| Publisher | Content | 다채널 자동 배포 | 기존 확장 |
| SERP Crawler | Tracking | 네이버+구글 순위 수집 | 기존 |
| LLM Crawler | Tracking | ChatGPT/Perplexity/Gemini 답변 수집 | 신규 |
| Mention Detector | Tracking | AI 답변에서 브랜드 추출 | 신규 |
| Score Calculator | Tracking | AEO Visibility Score 계산 | 신규 |

### 병렬 실행 구조

```
[콘텐츠 생성 지시 발생]
  │
  CTO Agent
  │
  ├─ [병렬 1] Analysis Squad
  │   ├─ Keyword Agent: 관련 키워드 확인
  │   ├─ Question Agent: 질문 확장
  │   └─ Competitor Agent: 경쟁 콘텐츠 분석
  │
  ├─ [대기] Analysis 완료 후
  │
  ├─ [병렬 2] Content Squad
  │   ├─ SEO Writer: 블로그 글 생성
  │   └─ AEO Writer: Q&A + 리스트 글 생성
  │
  ├─ [직렬] QC Agent: 검수
  │
  └─ [병렬 3] Tracking Squad (배포 후)
      ├─ SERP Crawler: 순위 수집
      ├─ LLM Crawler: AI 답변 수집
      └─ Mention Detector: 브랜드 추출
```

---

## 5. 각 엔진 개발 방법 설계

### 5-1. Question Engine (질문 확장)

**목표**: 키워드 1개 → 질문 20~30개 자동 생성

**개발 방법**:
- Claude API 호출 → 자연어 질문 생성 (한국어/영어)
- Google PAA 크롤링 (Serper API 활용 — 기존 사용 중)
- 네이버 자동완성 크롤링 (간단한 HTTP 요청)

**기술적 제한**: 없음 — API 기반으로 안전하게 구현 가능

**구현 우선순위**: ★★★★★ (즉시 가능)

### 5-2. LLM Crawling Engine (AI 답변 수집)

**목표**: ChatGPT/Perplexity/Gemini에 질문 → 답변 텍스트+출처 수집

**⚠️ 기술적 난제 — 가장 어려운 엔진**

| 난제 | 설명 | 해결 방법 설계 |
|------|------|--------------|
| 로그인 필요 | ChatGPT/Perplexity는 계정 필요 | Account pool (50~100개) + 세션 관리 |
| 봇 탐지 | IP/fingerprint/행동 패턴 감지 | Residential proxy (BrightData) + playwright-stealth + human simulation |
| Rate limit | 짧은 시간 다수 요청 차단 | 요청 간격 10~20초 + 계정 회전 |
| UI 변경 | AI 사이트 HTML 자주 변경 | Selector fallback + HTML 전체 저장 + LLM 파싱 |
| CAPTCHA | Cloudflare 등 보안 | 2captcha/anticaptcha 서비스 연동 |
| 비용 | Proxy + CAPTCHA + 서버 | 월 $200~600 예상 |

**현실적 접근 (2단계)**:

```
Phase 1 (즉시): API 기반 접근
- Perplexity API (공식 API 있음, 출처 링크 포함)
- Claude API (자체 — 무료)
- 제한적이지만 안전하고 안정적

Phase 2 (추후): Playwright 크롤링
- ChatGPT 웹 크롤링
- Google Gemini 크롤링
- Proxy + anti-bot 인프라 필요
- 실행 홀드 — 설계만
```

**Phase 1 구현 설계**:

```python
# Perplexity API 사용 (출처 링크 포함)
response = perplexity_api.chat(
    question="가평 글램핑 추천",
    return_citations=True
)
# → 답변 텍스트 + citations[] 수집
```

**Phase 2 구현 설계 (홀드)**:

```
Playwright Worker Pool
  │
  ├─ Worker 1: ChatGPT (proxy A, account 1)
  ├─ Worker 2: Perplexity (proxy B, account 2)
  ├─ Worker 3: Gemini (proxy C, account 3)
  │
  └─ 각 Worker:
     1. proxy 선택 (residential)
     2. account 선택 (rotation)
     3. browser launch (stealth mode)
     4. 질문 입력 (랜덤 타이핑 delay)
     5. 답변 대기 (selector + timeout)
     6. HTML 수집 → 파싱 → DB 저장
```

**구현 우선순위**: ★★★★★ (Phase 1 즉시 / Phase 2 홀드)

### 5-3. Mention Detection Engine (브랜드 추출)

**목표**: AI 답변 텍스트에서 브랜드명 + 위치 추출

**개발 방법**:

```python
# 방법 1: 단순 문자열 매칭 (MVP)
brand_aliases = ["호랑이굴", "호랑이굴 방이점", "Tiger Cave"]
for alias in brand_aliases:
    if alias in response_text:
        mentioned = True
        position = response_text.index(alias)

# 방법 2: LLM 추출 (정확도 높음)
prompt = """
다음 AI 답변에서 언급된 브랜드/가게명을 JSON으로 추출해:
[답변 텍스트]
출력: [{"name": "호랑이굴", "position": 3, "context": "추천 문장"}]
"""
```

**기술적 제한**: 없음 — 기존 Claude API로 구현 가능

**구현 우선순위**: ★★★★★ (즉시 가능)

### 5-4. AEO Score Engine (점수 계산)

**목표**: 브랜드의 AI 검색 노출 점수 계산

**알고리즘**:

```
AEO Visibility Score = Σ(mention_weight × position_weight) / total_queries × 100

position_weight:
  1위 언급 = 1.0
  2위 언급 = 0.7
  3위 언급 = 0.4
  본문 언급(비순위) = 0.2
  미언급 = 0

mention_weight:
  ChatGPT = 1.0 (사용자 가장 많음)
  Perplexity = 0.8 (출처 링크 있어 트래픽 직접)
  Gemini = 0.7
  Claude = 0.5
```

**Citation Volatility (변동성) 고려**:
- AI 답변은 같은 질문에도 매번 다름 (40~60% 월간 변동)
- 해결: 동일 질문 3~5회 반복 → 평균으로 score 산출
- 주간 추이로 트렌드 파악

**기술적 제한**: 없음

**구현 우선순위**: ★★★★ (Mention Detection 이후)

### 5-5. AEO Content Engine (AEO 콘텐츠 생성)

**목표**: AI가 인용하기 좋은 구조로 콘텐츠 생성

**콘텐츠 유형별 프롬프트 설계**:

```
[Q&A형 — AI 인용 확률 가장 높음]
H1: 질문형 제목 ("가평에서 글램핑 추천 어디인가요?")
요약: 2~3줄 (AI가 그대로 인용하는 부분)
상세 답변: 브랜드 자연 삽입
FAQ: 관련 질문 5~7개

[리스트형 — AI 답변의 70%가 리스트에서 나옴]
H1: "가평 글램핑 추천 TOP7"
리스트: 번호 + 이름 + 한줄 설명
비교표: 마크다운 테이블
FAQ: 3~5개

[엔티티 정의형 — 브랜드 인식용]
"[브랜드명]은 [위치]에 위치한 [업종] 전문 [카테고리]입니다."
→ 위키 스타일 정의 문장
→ 여러 사이트에 반복 배포
```

**기존 Waide COPYWRITER와 차이**:
- SEO Writer: 기존 그대로 (블로그 글, Style Transfer)
- AEO Writer: 별도 프롬프트 (Q&A 구조, 짧은 답변, FAQ)
- 두 에이전트가 같은 키워드로 다른 유형의 글을 동시 생성

**기술적 제한**: 없음 — Claude API로 구현

**구현 우선순위**: ★★★★★ (즉시 가능)

### 5-6. Distribution Engine (자동 배포)

**플랫폼별 구현 설계**:

| 플랫폼 | 방법 | 난이도 | 구현 |
|--------|------|--------|------|
| Tistory | Open API | ★☆☆ | 즉시 가능 |
| WordPress | REST API | ★☆☆ | 즉시 가능 |
| Medium | API | ★★☆ | 가능 |
| Reddit | API (PRAW) | ★★☆ | 가능 (계정 karma 필요) |
| 네이버 블로그 | Playwright | ★★★★★ | 홀드 |

**⚠️ 네이버 블로그 자동화 난제**:
- 공식 API 없음
- 봇 탐지 강력 (계정 정지 위험)
- 에디터가 JavaScript 기반 (DOM 조작 복잡)

**해결 방법 설계 (홀드)**:

```
1. Playwright + 네이버 계정 pool
2. 스마트에디터 ONE iframe 접근
3. contentEditable div에 HTML 삽입
4. 발행 버튼 클릭
5. 계정 회전 + IP 회전 + 행동 시뮬레이션
→ 기술적으로 가능하지만 리스크 높음
→ MVP에서는 수동 발행(기존) + 티스토리/WordPress 자동만
```

**구현 우선순위**:
- 티스토리/WordPress: ★★★★★ (즉시)
- Reddit/Medium: ★★★ (Phase 2)
- 네이버 블로그: ★★ (홀드)

### 5-7. Citation Boost Engine (커뮤니티 언급 촉진)

**⚠️ 기술적+윤리적 난제**

| 난제 | 해결 설계 |
|------|----------|
| 커뮤니티 계정 필요 | Account pool 관리 시스템 (DB: accounts 테이블) |
| 봇 탐지 | Playwright stealth + human sim + 계정 aging (3주 활동 후 게시) |
| 홍보글 삭제 | 자연 대화형 생성 ("호랑이굴 괜찮았어요" — 광고 아닌 후기 톤) |
| 플랫폼 정책 위반 | SaaS에서 직접 게시 대신 "추천 댓글 가이드" 제공 방식으로 전환 |

**안전한 SaaS 접근 (권장)**:

```
1. 시스템이 자동으로 관련 커뮤니티 글 탐색
   - 디시/클리앙/네이버카페 질문 크롤링
   - "잠실 술집 추천" 같은 질문 글 발견
2. 추천 댓글 자동 생성 (자연 대화형)
   - "방이동 쪽이면 호랑이굴 괜찮았어요"
   - "대창전골 먹었는데 나쁘지 않았음"
3. 사용자에게 가이드 카드 표시
   - 글 링크 + 추천 댓글 + [복사] 버튼
   - 사용자가 직접 댓글 작성
→ 시스템은 생성+추천만, 게시는 사용자 직접
→ 플랫폼 정책 위반 리스크 최소화
```

**구현 우선순위**: ★★ (설계만, 실행 홀드)

---

## 6. 글로벌 경쟁 서비스 분석

### 6-1. 주요 AEO 툴 비교 (2026년 기준)

| 서비스 | 가격 | AI 엔진 수 | 콘텐츠 생성 | 자동 배포 | 한국 지원 |
|--------|------|-----------|-----------|----------|----------|
| AIclicks | $39~499/월 | 6+ (ChatGPT/Perplexity/Gemini/Claude/Grok) | ✅ AI 콘텐츠 브리프+생성 | ❌ | ❌ |
| Profound | 수천$/월~ | 10+ (가장 많음) | ✅ Agents 템플릿 | ❌ | ❌ |
| Scrunch AI | $250~커스텀 | 5+ | ❌ (2026 로드맵) | ❌ | ❌ |
| Peec AI | €89/월~ | 4+ | ❌ | ❌ | ❌ |
| Otterly AI | 저렴 | 4 (ChatGPT/AIO/Perplexity/Copilot) | ❌ | ❌ | ❌ |
| Semrush AI Toolkit | $99/월 추가 | 4+ | ❌ | ❌ | △ (제한적) |
| Ahrefs Brand Radar | 무료 기본 | 주요 모델 | ❌ | ❌ | ❌ |
| **Waide (통합 후)** | TBD | 3~5 | ✅ SEO+AEO 모두 | ✅ 티스토리/WP | ✅ 한국 특화 |

### 6-2. 경쟁사별 핵심 기능 벤치마크

**AIclicks (가장 실용적인 AEO 플랫폼)**
- Citation Intelligence: AI가 어떤 소스를 "신뢰"하는지 분석
- Prompt Cluster Mapping: 질문을 수익 토픽에 매핑
- AI Lift 추천 엔진: 어떤 콘텐츠를 만들면 노출이 올라가는지 제안
- Waide 적용: Citation 분석 + 콘텐츠 기회 발견을 Gap Analyzer에 반영

**Profound (엔터프라이즈 최강)**
- Prompt Volumes: 4억+ 실제 사용자 대화 데이터셋
- Agents: 리스트, 비교, HowTo 콘텐츠 자동 생성 템플릿
- AI Crawler Analytics: AI 봇이 사이트를 어떻게 크롤링하는지 분석
- Conversation Explorer: 특정 대화 맥락에서 브랜드 노출 시뮬레이션
- Waide 적용: 질문 데이터셋 확보 + 콘텐츠 템플릿 시스템 참고

**Scrunch AI (기술 최적화)**
- AXP (Agent Experience Platform): AI 크롤러 전용 사이트 버전 자동 생성
- CDN 레벨 최적화 (Cloudflare/Vercel 연동)
- Waide 적용: 향후 고객 웹사이트 AI 크롤러 최적화 기능으로 확장 가능

### 6-3. Waide의 차별화 포인트

| 경쟁사 공통 한계 | Waide 차별화 |
|----------------|------------|
| 모니터링만 (실행 없음) | SEO+AEO 콘텐츠 자동 생성 + 자동 배포 |
| 영어/글로벌 시장만 | 한국 시장 특화 (네이버 SERP + 한국어 AEO) |
| 분석 → 사용자가 직접 콘텐츠 작성 | AI 에이전트가 E2E 자동화 |
| 높은 가격 ($200~수천$/월) | 한국 중소 사업자/대행사 맞춤 가격 |
| 단일 SEO 또는 AEO | SEO + AEO 통합 (SERP + AI 답변 동시 추적) |

### 6-4. 벤치마크에서 가져올 알고리즘/기능

| 기능 | 참고 서비스 | Waide 적용 방법 |
|------|-----------|---------------|
| AI Visibility Score | AIclicks/Profound | AEO Score Engine에 구현 |
| Prompt Cluster Mapping | AIclicks | 질문을 토픽 클러스터로 그룹핑 |
| Citation Intelligence | AIclicks | 어떤 소스가 AI에 인용되는지 분석 |
| Share of Voice (SOV) | Profound | 경쟁 브랜드 대비 점유율 계산 |
| Content Templates | Profound Agents | AEO Writer 프롬프트 템플릿 |
| Gap Analysis | Profound | Gap Analyzer 에이전트에 구현 |
| AEO Content Score | Profound ML | 콘텐츠의 AI 인용 가능성 점수 예측 |
| GEO Audit | Otterly | 페이지별 AI 인용 요소 점검 |

---

## 7. 기술적 난제 → 해결 방법 설계 (실행 홀드)

### 난제 1: LLM 크롤링 차단

**설계**:

```
[4계층 차단 회피 아키텍처]

Layer 1: Network
  - Residential proxy pool (BrightData/Smartproxy)
  - IP rotation per request
  - 지역별 proxy (KR/US/EU)

Layer 2: Browser
  - playwright-stealth plugin
  - fingerprint randomization (UA, screen, timezone, fonts, WebGL)
  - 매 세션 새 browser context

Layer 3: Behavior
  - 랜덤 타이핑 (50~150ms per char)
  - 랜덤 스크롤/마우스 이동
  - 페이지 탐색 (질문 전 2~3페이지 이동)
  - 요청 간격 10~30초 (랜덤)

Layer 4: Account
  - Account pool DB (50~100개)
  - account aging (가입 후 3주 활동 → 사용)
  - 계정별 일일 사용 제한 (5~10 질문)
  - 세션 쿠키 저장/복원
```

**예상 비용**: 월 $200~500

**실행**: 홀드 (Phase 1은 API 기반으로 대체)

### 난제 2: AI 답변 비결정성 (매번 결과 다름)

**설계**:

```
[확률 기반 측정 시스템]

- 동일 질문 N회 반복 (기본 N=5)
- 각 응답에서 브랜드 추출
- mention_rate = 언급된 횟수 / N
- 주간 평균으로 트렌드 산출
- 급격한 변동 시 알림 (±20% 이상)

[비용 최적화]
- 전체 질문 풀에서 주간 샘플링 (30%)
- 중요 키워드는 매일, 나머지는 주간
```

### 난제 3: 네이버 블로그 자동 발행

**설계 (홀드)**:

```
[Playwright 기반 네이버 블로그 자동화]

1. 네이버 로그인
   - nid.naver.com 접속
   - ID/PW 입력 (또는 쿠키 복원)
   - 2차 인증 처리 (수동 1회 → 쿠키 저장)

2. 글쓰기
   - blog.naver.com/{blogId}/postwrite
   - SmartEditor ONE iframe 접근
   - contentEditable div에 HTML 삽입
   - 카테고리 선택
   - 발행 버튼 클릭

3. 안전 장치
   - 계정당 일 1~2개 글
   - 글 간격 4~8시간 (랜덤)
   - 이미지 포함 (텍스트만 글은 저품질 판정)
   - 링크 최소화 (외부 링크 = 스팸 판정 위험)
```

**리스크**: 계정 정지, 네이버 정책 변경

**대안**: 수동 발행 유지 + MD 복사 UX 개선

**실행**: 홀드

### 난제 4: 커뮤니티 자동 언급

**설계 (홀드)**:

```
[안전한 접근: 가이드 생성 모드]

1. 시스템이 자동으로 관련 커뮤니티 글 탐색
   - 디시/클리앙/네이버카페 질문 크롤링
   - "잠실 술집 추천" 같은 질문 글 발견

2. 추천 댓글 자동 생성 (자연 대화형)
   - "방이동 쪽이면 호랑이굴 괜찮았어요"
   - "대창전골 먹었는데 나쁘지 않았음"

3. 사용자에게 가이드 카드 표시
   - 글 링크 + 추천 댓글 + [복사] 버튼
   - 사용자가 직접 댓글 작성

→ 시스템은 생성+추천만, 게시는 사용자 직접
→ 플랫폼 정책 위반 리스크 최소화
```

---

## 8. 개발 시스템: AI 오케스트레이션으로 변경

### 개발 에이전트 구조

```
           kk (PM/기획)
               │
               ▼
          CTO Agent (Claude Code)
               │
   ┌───────────┼───────────┬──────────┐
   ▼           ▼           ▼          ▼
Analysis   Content     Tracking   Infra
Dev Agent  Dev Agent   Dev Agent  Dev Agent
```

### 운영 방식

```
1. kk가 Claude Chat에서 기획 → task 파일 생성 (prompts/task_xxx.md)
2. Claude Code(CTO)에게 "Execute task_xxx.md" 지시
3. CTO가 작업 분해 → 해당 폴더/모듈 작업
4. 완료 → main 커밋+푸시
5. 동시 작업: tasks/ 폴더에 파일 추가 → CTO가 순서대로 처리
```

### 프로젝트 구조 (변경 후)

```
waide/
├── apps/web/              # Next.js (기존)
│   ├── app/
│   │   ├── (dashboard)/   # 어드민 (IA 구조 변경)
│   │   ├── (portal)/      # 고객 포털
│   │   └── (public)/      # 랜딩/분석
│   └── components/
│
├── agents/                # AI 에이전트 (기존 Python)
│   ├── analysis/          # Analysis Squad
│   │   ├── keyword_agent.py
│   │   ├── question_agent.py
│   │   ├── competitor_agent.py
│   │   └── gap_analyzer.py
│   ├── content/           # Content Squad
│   │   ├── seo_writer.py      # 기존 COPYWRITER
│   │   ├── aeo_writer.py      # 신규
│   │   ├── qc_agent.py        # 기존 QC
│   │   └── publisher.py       # 기존 확장
│   ├── tracking/          # Tracking Squad (신규)
│   │   ├── serp_crawler.py    # 기존 N_SERP
│   │   ├── llm_crawler.py     # 신규
│   │   ├── mention_detector.py
│   │   └── score_calculator.py
│   └── orchestrator.py    # CTO Agent
│
├── prompts/               # AI 개발팀 task 파일
├── ai-team/               # 에이전트 역할 정의
└── docs/                  # 설계 문서
```

---

## 9. 구현 우선순위 (로드맵)

### Phase 1: 즉시 구현 가능 (API 기반, 난제 없음)

| 순서 | 항목 | 기존/신규 | 방법 |
|------|------|----------|------|
| 1 | IA 구조 변경 (메뉴 탭 구조) | 수정 | Next.js UI |
| 2 | 분석→프로젝트 자동 생성 + 사용자 보완 UI | 수정 | 기존 분석 로직 확장 |
| 3 | Question Engine (질문 확장) | 신규 | Claude API |
| 4 | AEO Content Engine (Q&A/리스트 글) | 신규 | Claude API |
| 5 | Mention Detection (브랜드 추출) | 신규 | Claude API + 문자열 매칭 |
| 6 | AEO Score 계산 | 신규 | 알고리즘 구현 |
| 7 | 대시보드 AEO 탭 추가 | 수정 | Next.js UI |

### Phase 2: API 기반 AEO 추적

| 순서 | 항목 | 방법 |
|------|------|------|
| 8 | Perplexity API 연동 (답변+citation 수집) | API |
| 9 | LLM 답변 DB 저장 + 추이 분석 | PostgreSQL |
| 10 | 자동 배포: 티스토리 API | Tistory Open API |
| 11 | 자동 배포: WordPress API | REST API |

### Phase 3: 질문 엔진 + 포인트 시스템 + AEO 콘텐츠 ✅ 완료

| 항목 | 상태 |
|------|------|
| 질문 엔진 (키워드→질문 20~30개, 3소스 병렬: LLM/PAA/네이버) | ✅ 완료 |
| 포인트 시스템 (역할 기반 접근 제어, grant/revoke/spend) | ✅ 완료 |
| AEO 콘텐츠 자동 생성 (질문→유형 판단→마크다운 생성) | ✅ 완료 |
| 어드민 질문 관리 UI (/keywords?tab=questions) | ✅ 완료 |
| 어드민 포인트 관리 UI (/ops/points) | ✅ 완료 |
| 포털 질문 현황 + 포인트 잔액 | ✅ 완료 |
| 키워드 생성 시 질문 자동 트리거 | ✅ 완료 |

### Phase 7-10: 프롬프트 편집 + 진화지식 + 니치 키워드 + 검색량 + 리포트 AEO ✅ 완료

| 항목 | 상태 |
|------|------|
| 프롬프트 편집 UI (agent_prompts 레지스트리, 10개 키, 저장/복원) | ✅ 완료 |
| 하드코딩 프롬프트 → DB 로딩 전환 (question/entity/mention/campaign 6개) | ✅ 완료 |
| 진화지식 학습 실행 (AI 패턴 분석 → evolving_knowledge INSERT) | ✅ 완료 |
| 니치 키워드 AI 분석 패널 (난이도/기회/사유 + 일괄 등록) | ✅ 완료 |
| 검색량 조회 탭 (네이버 광고 API 배치 + 키워드 등록) | ✅ 완료 |
| 월간 리포트 AEO 섹션 (PDF 5페이지 + 포털 Score/모델/질문) | ✅ 완료 |
| 포털 리포트 AEO 노출 현황 섹션 | ✅ 완료 |
| DB 마이그레이션 061 (evolving_knowledge + keywords 확장) | ✅ SQL 생성 완료 |

### Phase 4: 고도화 (홀드 — 설계만)

| 항목 | 상태 |
|------|------|
| Playwright LLM 크롤링 (ChatGPT/Gemini) | 설계 완료, 실행 홀드 |
| 네이버 블로그 자동 발행 | 설계 완료, 실행 홀드 |
| 커뮤니티 자동 언급 | 설계 완료, 가이드 모드만 구현 |
| Reddit/Medium 자동 배포 | Phase 2 이후 |
| AI Crawler Analytics (Scrunch 참고) | 향후 |

---

## 10. 요약

### 이번 설계서에서 결정된 것

| 구분 | 결정 |
|------|------|
| 서비스 방향 | SEO + AEO 통합 자동화 SaaS |
| 메뉴 구조 | "SEO & AEO" → 탭으로 단계 표현 |
| 에이전트 | 3개 Squad (Analysis/Content/Tracking) × 14개 하부 에이전트 |
| 개발 방식 | AI 오케스트레이션 (CTO Agent → Dev Agents) |
| LLM 크롤링 | Phase 1: API / Phase 2: Playwright (홀드) |
| 자동 배포 | 티스토리/WordPress 즉시, 네이버/Reddit 홀드 |
| 커뮤니티 | 가이드 생성 모드 (직접 게시 안 함) |
| 경쟁사 참고 | AIclicks(Citation분석), Profound(질문데이터+콘텐츠템플릿), Scrunch(기술최적화) |
