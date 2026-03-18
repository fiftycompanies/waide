# Phase Contracts Index

> 각 계약서에 상세 기획서(`/docs/phases/phase-N-detail.md`)가 부록으로 통합되었습니다.

> WIDEWILD 인테리어 홈페이지 서비스 프로젝트 — Phase별 계약서 목록

| Phase | 제목 | 기간 | 상태 | 계약서 |
|-------|------|------|------|--------|
| 1 | DB 스키마 확장 | 1일 | ⬜ 대기 | [phase-1-contract.md](./phase-1-contract.md) |
| 2 | 어드민 UI | 3일 | ⬜ 대기 | [phase-2-contract.md](./phase-2-contract.md) |
| 3 | 자동 키워드 생성 | 1일 | ⬜ 대기 | [phase-3-contract.md](./phase-3-contract.md) |
| 4 | 홈페이지 템플릿 A — 모던 미니멀 | 5일 | ⬜ 대기 | [phase-4-contract.md](./phase-4-contract.md) |
| 5 | 빌드/배포 파이프라인 | 2일 | ⬜ 대기 | [phase-5-contract.md](./phase-5-contract.md) |
| 6 | 블로그 대량발행 연동 | 2일 | ⬜ 대기 | [phase-6-contract.md](./phase-6-contract.md) |
| 7 | 템플릿 B, C | 3일 | ⬜ 대기 | [phase-7-contract.md](./phase-7-contract.md) |
| 8 | 모니터링 & 리포트 | 2일 | ⬜ 대기 | [phase-8-contract.md](./phase-8-contract.md) |

**전체 예상 기간**: 19일

---

## Phase 의존성 그래프

```
Phase 1 (DB 스키마)
  ├──▶ Phase 2 (어드민 UI)
  │      └──▶ Phase 3 (자동 키워드)
  │              └──▶ Phase 4 (템플릿 A)
  │                      ├──▶ Phase 5 (빌드/배포)
  │                      │      ├──▶ Phase 6 (블로그 연동)
  │                      │      │      └──▶ Phase 8 (모니터링)
  │                      │      └──▶ Phase 7 (템플릿 B, C)
  │                      └──────────────────────────────────
```

## 상태 범례

| 아이콘 | 상태 | 설명 |
|--------|------|------|
| ⬜ | 대기 | 아직 시작하지 않음 |
| 🔄 | 진행중 | 현재 작업 중 |
| ✅ | 완료 | 모든 인수 기준 충족, 테스트 통과 |
| ❌ | 블로킹 | 선행 조건 미충족 또는 이슈 발생 |

## 핵심 원칙

1. **기존 테이블 최소 변경**: 기존 waide-mkt 테이블은 최대한 변경하지 않고, 신규 5개 테이블로 확장
2. **기존 파이프라인 재사용**: 블로그 발행/추적은 100% 기존 waide-mkt 파이프라인 활용
3. **Phase 순차 실행**: 선행 Phase 완료 후 다음 Phase 시작 (의존성 준수)
4. **계약 기반 완료**: 각 Phase의 인수 기준과 테스트를 모두 통과해야 완료 선언
