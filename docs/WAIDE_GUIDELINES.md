# Waide 개발 지침

---

## 절대 규칙

1. 라이브 운영 중. 기존 코드 삭제/변경 금지. 추가만.
2. `createAdminClient` / `rawFetch` 패턴 사용
3. JSONB 업데이트: SELECT → spread → UPDATE 순서
4. 없는 테이블 참조 금지. 코드 수정 전 반드시 READ 먼저.
5. 빌드 에러 0개 확인 후 커밋

---

## 세션 종료 시 필수

1. `docs/WAIDE_CONTEXT.md` 변경사항 반영 업데이트
2. `docs/WAIDE_ISSUES.md` 해결된 이슈 체크, 신규 이슈 추가
3. git commit 후 요약 보고

---

## 역할 분담

| 역할 | 담당 |
|------|------|
| Claude Chat | 기획/설계/프롬프트 작성 |
| Claude Code | 코딩/파일수정/빌드/배포 |
