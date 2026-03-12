# Tasks — 작업 큐 운영 가이드

> AI 오케스트레이션 기반 개발 워크플로우

---

## 사용법

1. **PM이 task 파일 생성**: `tasks/task_NNN_제목.md` 형식으로 작성
2. **Claude Code에 지시**: "pending task 실행해" 또는 특정 task 지정
3. **CTO Agent가 실행**: 파일 내 지시사항 순서대로 코드 작성 + 빌드 검증
4. **완료 후 기록**: task 파일에 결과 기록 + CLAUDE.md 업데이트 + 커밋+푸시

---

## 파일 네이밍

```
tasks/task_NNN_제목.md

예시:
tasks/task_001_ia_restructure.md
tasks/task_002_question_engine.md
tasks/task_003_aeo_content_types.md
```

- NNN: 3자리 순번 (001, 002, ...)
- 제목: 영문 snake_case (간결하게)

---

## 상태 관리

| 상태 | 의미 |
|------|------|
| `status: pending` | 아직 시작하지 않은 작업 |
| `status: in_progress` | 현재 진행 중인 작업 |
| `status: done` | 완료된 작업 |

상태 변경은 task 파일의 `status:` 라인을 직접 수정.

---

## 우선순위

| 우선순위 | 설명 |
|---------|------|
| `priority: high` | 즉시 처리. 다른 작업보다 먼저. |
| `priority: medium` | high 완료 후 처리 |
| `priority: low` | medium 완료 후 처리 |

동일 priority 내에서는 파일 번호(task_NNN) 순서로 처리.

---

## 동시 작업 규칙

| 규칙 | 설명 |
|------|------|
| 다른 Squad 작업 | 동시 진행 가능 (예: Analysis + Content 동시) |
| 같은 Squad 작업 | 순서대로 처리 (의존성 있을 수 있음) |
| Infra 작업 | DB 마이그레이션은 다른 작업보다 먼저 실행 |

---

## 완료 시 체크리스트

- [ ] 코드 작성 완료
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run build` 통과
- [ ] task 파일 상단 `status: done` 으로 변경
- [ ] task 파일 하단 "결과" 섹션에 신규/수정 파일 기록
- [ ] CLAUDE.md 업데이트 (신규 기능/테이블/API 반영)
- [ ] 커밋 + 푸시

---

## Task 작성 팁

- **목표**: 이 task가 완료되면 뭐가 달라지는지 1~2줄로 명확히
- **작업 내용**: 구체적인 스텝 (모호한 지시 금지)
- **기술 결정**: 미리 결정된 기술 선택은 반드시 기재 (나중에 혼동 방지)
- **DB 변경**: 마이그레이션이 필요하면 테이블/컬럼을 명시
- **제약 조건**: 반드시 지켜야 할 규칙 (기존 코드 호환 등)
- **완료 기준**: 체크리스트로 완료 여부 명확히

---

## 템플릿

`tasks/_template.md` 파일을 복사하여 새 task 파일을 생성하세요.

```bash
cp tasks/_template.md tasks/task_NNN_제목.md
```
