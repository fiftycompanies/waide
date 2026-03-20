# Homepage Pipeline Multi-URL Verification Report

> 생성일: 2026-03-20 05:41:07
> 테스트 URL: 3개
> 브랜드: 에버유의원 (의원)

---

## 1. 결과 요약

| # | URL | 업종 | 소요시간 | HTML | 품질 PASS | 품질 FAIL | 결과 |
|---|-----|------|---------|------|----------|----------|------|
| A | https://www.banobagi.com | 성형외과 | 87.3초 | 20KB | 15 | 0 | ✅ PASS |
| B | https://www.glamping.co.kr | 글램핑 | 0.4초 | 0KB | 0 | 0 | ❌ FAIL (에러) |
| C | https://www.naver.com | 포털 | 244.7초 | 74KB | 14 | 1 | ✅ PASS |

---

## 2. 단계별 상세

### [A] https://www.banobagi.com

| 단계 | 성공 | 소요시간 | 상세 |
|------|------|---------|------|
| 스크린샷 캡처 | ✅ | 14.0초 | top: 31KB, crops: 5개 |
| 디자인 토큰 | ✅ | 3.4초 | primary=#2c2c2c, bg=#9e9088 |
| HTML 생성 | ✅ | 69.9초 | 19KB |
| 브랜드 주입 | ✅ | 0.0초 | 최종 20KB |

**품질 검증:**

| 항목 | 결과 | 상세 |
|------|------|------|
| 크롭 캡처 1개 이상 | ✅ | 5개 크롭 |
| Tailwind CDN 포함 | ✅ |  |
| tailwind.config 포함 | ✅ |  |
| Tailwind 클래스 5개+ | ✅ | 9/9개 |
| 브랜드명 포함 | ✅ |  |
| 전화번호 포함 | ✅ |  |
| 주소 포함 | ✅ |  |
| 서비스 3개+ 포함 | ✅ | 5/5개 |
| Unsplash 이미지 3개+ | ✅ | 10개 |
| 레퍼런스 원본 URL 없음 | ✅ |  |
| {{}} 미교체 0건 | ✅ | 모두 교체됨 |
| body 내 <head> 없음 | ✅ |  |
| <style> 최소화 | ✅ | 총 1개, 비폰트 0개 |
| 폼 라벨 서비스명 없음 | ✅ |  |
| Nav flex 컨테이너 존재 | ✅ |  |

---

### [B] https://www.glamping.co.kr

**에러**: page.goto: net::ERR_CONNECTION_REFUSED at https://www.glamping.co.kr/
Call log:
[2m  - navigating to "https://www.glamping.co.kr/", waiting until "load"[22m


| 단계 | 성공 | 소요시간 | 상세 |
|------|------|---------|------|
| 스크린샷 캡처 | ❌ | 0.4초 | page.goto: net::ERR_CONNECTION_REFUSED at https://www.glamping.co.kr/
Call log:
[2m  - navigating to "https://www.glamping.co.kr/", waiting until "load"[22m
 |

---

### [C] https://www.naver.com

| 단계 | 성공 | 소요시간 | 상세 |
|------|------|---------|------|
| 스크린샷 캡처 | ✅ | 46.6초 | top: 269KB, crops: 5개 |
| 디자인 토큰 | ✅ | 3.6초 | primary=#03C75A, bg=#FFFFFF |
| HTML 생성 | ✅ | 194.4초 | 66KB |
| 브랜드 주입 | ✅ | 0.1초 | 최종 74KB |

**품질 검증:**

| 항목 | 결과 | 상세 |
|------|------|------|
| 크롭 캡처 1개 이상 | ✅ | 5개 크롭 |
| Tailwind CDN 포함 | ✅ |  |
| tailwind.config 포함 | ✅ |  |
| Tailwind 클래스 5개+ | ✅ | 9/9개 |
| 브랜드명 포함 | ✅ |  |
| 전화번호 포함 | ✅ |  |
| 주소 포함 | ✅ |  |
| 서비스 3개+ 포함 | ✅ | 5/5개 |
| Unsplash 이미지 3개+ | ✅ | 94개 |
| 레퍼런스 원본 URL 없음 | ✅ |  |
| {{}} 미교체 0건 | ❌ | 미교체: {{ITEM_TITLE_11}}, {{ITEM_TITLE_12}}, {{ITEM_TITLE_13}}, {{ITEM_TITLE_14}}, {{ITEM_TITLE_15}} |
| body 내 <head> 없음 | ✅ |  |
| <style> 최소화 | ✅ | 총 1개, 비폰트 0개 |
| 폼 라벨 서비스명 없음 | ✅ |  |
| Nav flex 컨테이너 존재 | ✅ |  |

---

## 3. 취약점 분석

### 3-1. 봇 차단 / 크롤링 실패

- 봇 차단 없음

### 3-2. 레퍼런스 텍스트 유출

- 유출 없음

### 3-3. Nav 감지 견고성

- 모든 URL에서 Nav flex 컨테이너 정상 생성

### 3-4. 플레이스홀더 미교체

- **https://www.naver.com**: 미교체: {{ITEM_TITLE_11}}, {{ITEM_TITLE_12}}, {{ITEM_TITLE_13}}, {{ITEM_TITLE_14}}, {{ITEM_TITLE_15}}

---

## 4. 종합 평가

- **통과율**: 2/3 (67%)
- **평균 소요시간**: 110.8초
- **실패 URL**: https://www.glamping.co.kr

### 권장 조치

- [ ] Vision AI 프롬프트에서 플레이스홀더 형식 강화 필요
