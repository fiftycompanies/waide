# Waide 배포 가이드

> 최종 업데이트: 2026-02-26

## 1. 환경변수 (Vercel Dashboard → Settings → Environment Variables)

| 변수명 | 설명 | 필수 |
|--------|------|:----:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon 키 | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabase Service Role 키 (서버 액션용) | ✅ |
| `DATABASE_URL` | PostgreSQL 연결 URL (Prisma generate용) | ✅ |
| `DIRECT_URL` | PostgreSQL 직접 연결 URL | ✅ |
| `ANTHROPIC_API_KEY` | Claude API 키 (분석/이미지) | ✅ |
| `NAVER_CLIENT_ID` | 네이버 검색 API Client ID | ✅ |
| `NAVER_CLIENT_SECRET` | 네이버 검색 API Client Secret | ✅ |
| `NAVER_AD_API_KEY` | 네이버 검색광고 API License | ⬡ |
| `NAVER_AD_SECRET_KEY` | 네이버 검색광고 API Secret | ⬡ |
| `NAVER_AD_CUSTOMER_ID` | 네이버 검색광고 고객 ID | ⬡ |
| `ADMIN_SESSION_SECRET` | 어드민 세션 HMAC 시크릿 (미설정 시 기본값 사용) | ⬡ |
| `CRON_SECRET` | Vercel Cron 인증 시크릿 | ⬡ |
| `SLACK_BOT_TOKEN` | Slack Bot API 토큰 | ⬡ |
| `SLACK_WEBHOOK_URL` | Slack Webhook URL | ⬡ |
| `SLACK_ALERTS_CHANNEL` | Slack 알림 채널 (기본: #alerts) | ⬡ |
| `NEXT_PUBLIC_APP_URL` | 서비스 공개 URL (예: https://waide.co.kr) | ⬡ |
| `OPENAI_API_KEY` | OpenAI API 키 (미사용 시 생략 가능) | ⬡ |

> ✅ 필수 / ⬡ 선택 (해당 기능 사용 시 필요)

## 2. Vercel 프로젝트 설정

| 항목 | 값 |
|------|-----|
| Framework | Next.js |
| Root Directory | `.` (git 루트 = apps/web) |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Node.js Version | 20.x |
| Region | icn1 (서울) |

## 3. 배포 명령어

```bash
# apps/web 디렉토리에서 실행
cd apps/web
npx vercel

# 프로덕션 배포
npx vercel --prod
```

## 4. 크론잡

| 경로 | 스케줄 | 설명 |
|------|--------|------|
| `/api/cron/serp` | 매일 03:00 UTC | SERP 순위 수집 |
| `/api/cron/search-volume` | 매월 1일 04:00 UTC | 검색량 수집 |
| `/api/cron/grading` | 매주 월 05:00 UTC | 계정 등급/난이도 산출 |

> Vercel Cron은 Pro 플랜 이상에서 사용 가능. Hobby 플랜은 1일 1회 제한.

## 5. 배포 후 체크리스트

- [ ] 랜딩페이지 (`/`) 정상 표시
- [ ] 로그인 (`/login`) → admin / admin1234
- [ ] 대시보드 (`/dashboard`) 접속
- [ ] 분석 실행 (`/` → URL 입력) — ANTHROPIC_API_KEY 필요
- [ ] Slack 알림 동작 — SLACK_BOT_TOKEN 필요
- [ ] 크론잡 수동 트리거 (`/ops/scheduler`)

## 6. 도메인 연결 (선택)

Vercel Dashboard → Settings → Domains에서 커스텀 도메인 추가:
1. `waide.co.kr` 추가
2. DNS에 CNAME 레코드 설정: `cname.vercel-dns.com`
3. `NEXT_PUBLIC_APP_URL` 환경변수를 `https://waide.co.kr`로 설정
