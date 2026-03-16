# Claude Code 마스터 프롬프트 — Waide 대시보드 리디자인

## 세션 시작 시 필수 지시

```
⚠️ 현재 라이브 서비스 운영 중. 기존 코드 변경/삭제로 인한 오류 절대 금지. 새 기능은 기존 코드에 영향 없이 추가만.

세션 시작 시 반드시:
1. docs/WAIDE_CONTEXT.md 읽기
2. docs/WAIDE_ISSUES.md 읽기  
3. docs/WAIDE_GUIDELINES.md 읽기
4. Phase 파일 읽기 (아래 지정)
```

---

## Phase 1 실행 프롬프트

```
세션 시작 후 docs/ 폴더를 읽어줘.

그 다음 Phase 1을 진행해줘.
Phase 1 파일 위치: [phase1-db-schema.md 내용을 여기에 붙여넣기]

Phase 1 작업 순서:
1. 먼저 현재 Supabase 마이그레이션 파일들을 읽어서 실제 테이블/컬럼 구조를 파악해
2. 파악한 실제 구조를 바탕으로 Phase 1 스펙을 현실에 맞게 조정해
3. supabase/migrations/064_dashboard_additions.sql 파일 생성
4. 파일 생성 후 supabase db push 실행
5. 적용 확인 후 완료 조건 체크리스트 보고
6. tsc --noEmit 실행하여 기존 코드 영향 없음 확인
7. git add + git commit (메시지: "feat: Phase 1 - DB schema additions for dashboard")
8. docs/WAIDE_ISSUES.md 업데이트

완료 조건이 모두 통과하면 "Phase 1 완료" 보고 후 멈춰줘. Phase 2는 별도로 지시할게.
```

---

## Phase 2 실행 프롬프트

```
Phase 2를 진행해줘.
Phase 2 파일: [phase2-vps-crawler.md 내용을 여기에 붙여넣기]

작업 순서:
1. VPS 크롤러 현재 코드 확인 (ssh 또는 파일 직접 확인)
2. 2-A: bookmarkCount GraphQL 필드 존재 여부 먼저 확인
   - 없으면 2-A 보류하고 bookmark_count: null 항상 반환
3. 2-B: mention_count 계산 로직 추가
4. 2-C: place_rank 수집 로직 추가
5. VPS 서비스 재시작 + 헬스체크
6. 기존 엔드포인트 정상 동작 확인
7. git commit (VPS 코드 변경사항)
8. 완료 조건 체크리스트 보고

완료 후 "Phase 2 완료" 보고 후 멈춰줘.
```

---

## Phase 3 실행 프롬프트

```
Phase 3을 진행해줘.
Phase 3 파일: [phase3-batch-update.md 내용을 여기에 붙여넣기]

작업 순서:
1. 기존 배치 크론 코드 위치와 구조 파악
2. 3-A: place_stats_history 저장 로직 추가
3. 3-B: keyword_visibility 신규 필드 저장 로직 추가
4. 3-C: TypeScript 타입 정의 업데이트
5. tsc --noEmit 확인
6. 배치 엔드포인트 수동 테스트
7. git commit + git push
8. Vercel 배포 확인
9. 완료 조건 체크리스트 보고

완료 후 "Phase 3 완료" 보고 후 멈춰줘.
```

---

## Phase 4 실행 프롬프트

```
Phase 4를 진행해줘.
Phase 4 파일: [phase4-dashboard-ui.md 내용을 여기에 붙여넣기]

목업 파일 참고: dashboard-mockup-v2.html (이미 확인한 상태)

작업 순서:
1. 현재 apps/web/app/portal/dashboard/page.tsx 구조 파악
2. recharts 설치 여부 확인, 없으면 cd apps/web && npm install recharts
3. 신규 컴포넌트 파일들 생성 (PlaceRankCard, StatCard, KeywordFilter, ExposureTable, MiniLineChart, ThirtyDayModal)
4. page.tsx에 데이터 페칭 추가 (기존 코드 위에 추가, 삭제 금지)
5. 신규 섹션을 기존 콘텐츠 위에 배치
6. 블로그 발행 버튼 헤더 추가
7. tsc --noEmit 확인
8. git commit + git push
9. Vercel 빌드 확인
10. 완료 조건 체크리스트 보고

중간에 막히거나 기존 코드와 충돌 시 즉시 멈추고 보고할 것.
완료 후 "Phase 4 완료" 보고 후 멈춰줘.
```

---

## Phase 5 실행 프롬프트

```
Phase 5를 진행해줘.
Phase 5 파일: [phase5-keyword-management.md 내용을 여기에 붙여넣기]

작업 순서:
1. 기존 키워드 관련 페이지/컴포넌트 파악
2. /portal/keywords 페이지 신규 생성 또는 기존 확장
3. Server Actions 구현 (setPrimaryKeyword, addKeyword, deactivateKeyword)
4. 대시보드 "+ 키워드 관리" 링크 연결
5. tsc --noEmit 확인
6. git commit + git push
7. Vercel 빌드 확인
8. 완료 조건 체크리스트 보고
9. docs/WAIDE_CONTEXT.md, docs/WAIDE_ISSUES.md 최종 업데이트

모든 Phase 완료 후 최종 체크리스트 전체 보고.
```

---

## 공통 규칙 (매 Phase 적용)

```
- createAdminClient 사용 (createClient 사용 금지)
- rawFetch 패턴 사용 (VPS 호출 시)
- JSONB 조회 시 SELECT→spread 패턴
- 존재하지 않는 테이블 참조 금지 (먼저 확인)
- 기존 코드 삭제/변경 금지 (추가만)
- DB 제약 조건 확인 후 코드 작성
- tsc --noEmit 통과 후 commit
- 충돌 발생 시 즉시 멈추고 보고
- 각 Phase 완료 후 docs/ 업데이트
```
