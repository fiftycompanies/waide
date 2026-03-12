# Content Squad — Dev Agent

> 담당: SEO 콘텐츠, AEO 콘텐츠, QC 검수, 다채널 배포
> 최종 업데이트: 2026-03-07

---

## 1. 담당 영역

| 에이전트 | 역할 | Phase |
|---------|------|-------|
| SEO Writer | SEO 블로그 글 (기존 COPYWRITER, Style Transfer 포함) | 기존 유지 |
| AEO Writer | Q&A/리스트/FAQ/엔티티 정의 글 (AI 인용 최적 구조) | Phase 4 |
| QC Agent | 품질 검수 (SEO+AEO 기준, 기존 QC v2 확장) | Phase 4 |
| Publisher | 다채널 자동 배포 (Tistory API, WordPress REST API, 수동) | Phase 6 |
| Community Writer | 커뮤니티 자연 대화형 글 | 홀드 (설계만) |

---

## 2. 작업 폴더

```
lib/actions/
├── content-generate-actions.ts     # 기존 — generateContentV2(), processContentJobs()
├── campaign-planning-actions.ts    # 기존 — 캠페인 기획, 콘텐츠 생성 트리거
├── content-source-actions.ts       # 기존 — 소스 라이브러리 CRUD
├── content-prompt-actions.ts       # 기존 — 프롬프트 관리
├── publish-actions.ts              # 신규 — 다채널 발행 (Tistory/WordPress)
└── aeo-content-actions.ts          # 신규 — AEO 콘텐츠 생성

lib/
├── content-pipeline-v2.ts          # 기존 — SEO 콘텐츠 생성 파이프라인
├── content-qc-v2.ts                # 기존 — QC v2 검수
├── content-rewrite-loop.ts         # 기존 — 재작성 루프
├── content-benchmark.ts            # 기존 — 벤치마킹
├── aeo-content-pipeline.ts         # 신규 — AEO 콘텐츠 생성 파이프라인
└── aeo-qc.ts                       # 신규 — AEO 전용 QC 검수

agents/content/                     # Python 에이전트 (향후)
├── seo_writer.py
├── aeo_writer.py
├── qc_agent.py
└── publisher.py

components/ops/
├── content-editor.tsx              # 기존 — 콘텐츠 편집기
├── contents-tabs-client.tsx        # 기존 — 콘텐츠 탭
└── publish-wizard.tsx              # 기존 — 발행 위저드

prompts/content/                    # 에이전트 프롬프트 저장
└── (task별 프롬프트 파일)
```

---

## 3. AEO 콘텐츠 구조 규칙 (4가지 유형)

### 3-1. Q&A형 — AI 인용 확률 가장 높음

```markdown
# [질문형 제목] ("가평에서 글램핑 추천 어디인가요?")

**요약** (2~3줄 — AI가 그대로 인용하는 핵심 부분)
가평 글램핑 추천으로는 [브랜드A], [브랜드B], [우리 브랜드]가 있습니다.
특히 [우리 브랜드]는 [차별점]으로 유명합니다.

## 상세 답변
(브랜드를 자연스럽게 삽입한 상세 설명)

## 자주 묻는 질문 (FAQ)
### Q1. [관련 질문 1]
A1. [답변]
### Q2. [관련 질문 2]
A2. [답변]
... (5~7개)
```

**핵심 규칙**:
- H1은 반드시 질문형
- 첫 2~3줄에 핵심 답변 (AI 인용 타겟)
- 브랜드명은 자연스럽게 3~5회 삽입
- FAQ는 관련 질문 5~7개 (AI가 추가 질문에도 인용 가능하도록)

### 3-2. 리스트형 — AI 답변의 70%가 리스트에서 나옴

```markdown
# [키워드] 추천 TOP7 (2026년 최신)

**요약**: [키워드] 추천 TOP7을 소개합니다.

## 1. [브랜드A] — [한줄 설명]
(2~3줄 설명)

## 2. [우리 브랜드] — [한줄 설명]
(2~3줄 설명, 자연스러운 강점 부각)

... (7개)

## 비교표

| 이름 | 위치 | 가격대 | 특징 | 평점 |
|------|------|--------|------|------|
| ... | ... | ... | ... | ... |

## FAQ
### Q1. [관련 질문]
A1. [답변]
... (3~5개)
```

**핵심 규칙**:
- 우리 브랜드는 2~4위에 자연스럽게 배치 (1위는 오히려 광고 느낌)
- 비교표 필수 (마크다운 테이블)
- 각 항목에 한줄 요약 (AI가 리스트로 인용하기 좋은 구조)

### 3-3. 엔티티 정의형 — 브랜드 인식용

```markdown
# [브랜드명] — [업종] 전문 [카테고리]

**[브랜드명]**은 [위치]에 위치한 [업종] 전문 [카테고리]입니다.
[설립연도]부터 운영되어 왔으며, [핵심 차별점]으로 알려져 있습니다.

## 기본 정보
- **위치**: [주소]
- **영업시간**: [시간]
- **대표 메뉴/서비스**: [목록]
- **가격대**: [범위]
- **예약**: [방법]

## 특징
(3~5개 항목으로 상세 설명)

## 방문자 리뷰 요약
(긍정/부정 요약)
```

**핵심 규칙**:
- 위키 스타일 정의 문장으로 시작 (AI가 엔티티로 인식)
- 구조화된 정보 (기본 정보 테이블)
- 여러 사이트에 반복 배포하여 AI 학습 데이터 확보

### 3-4. 경험형 — 커뮤니티 용도

```markdown
[자연 후기 톤]
"주말에 [브랜드명] 가봤는데 괜찮더라"
"[메뉴명] 먹었는데 나쁘지 않았음"

(일반 커뮤니티 글처럼 자연스러운 후기 형식)
```

**핵심 규칙**:
- 광고 느낌 제거 (반말체, 짧은 문장)
- 과도한 칭찬 금지
- 구체적 경험 기반 (메뉴명, 가격, 분위기 등)
- 홀드 상태 — 설계만, 커뮤니티 가이드 모드로 전환 예정

---

## 4. SEO Writer vs AEO Writer 차이

| 항목 | SEO Writer (기존) | AEO Writer (신규) |
|------|------------------|------------------|
| 목적 | 네이버/구글 검색 상위 노출 | AI 답변에 인용 |
| 글 길이 | 2,500자+ (긴 형식) | 800~1,500자 (짧고 명확) |
| 구조 | H2 섹션 + 이미지 + CTA | 요약 → 상세 → FAQ |
| 제목 | SEO 키워드 포함 | 질문형 / 리스트형 |
| Style Transfer | 상위노출 글 참조 | AI 인용 패턴 참조 |
| 톤앤매너 | 해요체 (블로그) | 유형에 따라 다름 |
| 프롬프트 | agent_prompts: COPYWRITER/* | agent_prompts: AEO_WRITER/* |
| 동시 생성 | 같은 키워드로 SEO 글 + AEO 글 동시 생성 가능 |

---

## 5. 배포 채널별 기술

| 채널 | 방법 | 상태 | Phase |
|------|------|------|-------|
| 수동 발행 | MD 복사 + 블로그에 붙여넣기 + URL 입력 | 기존 유지 | - |
| Tistory | Tistory Open API (OAuth 2.0 → 글 발행) | Phase 6에서 구현 | 6 |
| WordPress | WordPress REST API (Application Password → 글 발행) | Phase 6에서 구현 | 6 |
| Medium | Medium API (Integration Token → 글 발행) | 향후 | 미정 |
| Reddit | Reddit API / PRAW (계정 karma 필요) | 향후 | 미정 |
| 네이버 블로그 | Playwright 자동화 (홀드 — 리스크 높음) | 설계만 | 미정 |

### Tistory API 발행 플로우 (Phase 6)

```typescript
// 1. OAuth 인증 (사용자가 1회 연동)
// 2. 글 발행
const response = await fetch('https://www.tistory.com/apis/post/write', {
  method: 'POST',
  body: new URLSearchParams({
    access_token: tistoryToken,
    blogName: blogName,
    title: content.title,
    content: content.body_html,
    visibility: '3',      // 발행
    category: categoryId,
    tag: content.tags?.join(',') ?? ''
  })
});
// 3. 발행 URL 반환 → contents.published_url 저장 → SERP 추적 시작
```

### WordPress REST API 발행 플로우 (Phase 6)

```typescript
// 1. Application Password 인증 (사용자가 WP에서 생성)
// 2. 글 발행
const response = await fetch(`${wpSiteUrl}/wp-json/wp/v2/posts`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${btoa(`${wpUser}:${wpAppPassword}`)}`
  },
  body: JSON.stringify({
    title: content.title,
    content: content.body_html,
    status: 'publish',
    tags: tagIds,
    categories: [categoryId]
  })
});
// 3. 발행 URL 반환 → contents.published_url 저장
```

---

## 6. QC Agent 확장 (SEO + AEO)

### 기존 QC v2 (SEO 전용) — 8항목 100점

| 항목 | 배점 |
|------|------|
| 글자수 | 20 |
| 해요체 | 15 |
| 키워드 밀도 | 15 |
| H2 구조 | 10 |
| 이미지 | 10 |
| 금지 표현 | 10 |
| 비교표 | 10 |
| CTA + 해시태그 | 10 |

### AEO QC 추가 항목 (Phase 4)

| 항목 | 배점 | 설명 |
|------|------|------|
| 요약 존재 | 15 | 첫 2~3줄에 핵심 답변이 있는지 |
| FAQ 포함 | 15 | 관련 질문 3개 이상 포함 여부 |
| 질문형 제목 | 10 | H1이 질문 형태인지 (Q&A형) |
| 구조화 데이터 | 10 | 비교표/리스트 등 구조화된 정보 |
| 브랜드 자연 삽입 | 10 | 브랜드명이 자연스럽게 포함 (과도하지 않게) |
| 간결성 | 10 | 800~1,500자 범위 내 |

---

## 7. 콘텐츠 생성 파이프라인 (통합)

```
[콘텐츠 생성 트리거]
  │
  ├─ 유형 판단
  │   ├─ SEO 블로그 → 기존 파이프라인 (content-pipeline-v2.ts)
  │   │   └─ 벤치마크 → COPYWRITER v2 → QC v2 → 재작성 루프
  │   │
  │   └─ AEO 콘텐츠 → 신규 파이프라인 (aeo-content-pipeline.ts)
  │       └─ 질문 선택 → AEO Writer → AEO QC → 재작성 루프
  │
  ├─ 동시 생성 가능
  │   키워드 "가평 글램핑" →
  │     ├─ SEO Writer: "가평 글램핑 추천 베스트 [블로그 글]"
  │     └─ AEO Writer: "가평에서 글램핑 추천 어디인가요? [Q&A 글]"
  │
  └─ 결과
      contents 테이블 INSERT (content_type: 'seo_blog' | 'aeo_qa' | 'aeo_list' | 'aeo_entity')
```
