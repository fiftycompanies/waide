#!/usr/bin/env python3
"""
test_place_analysis.py
네이버 플레이스 분석 독립 테스트 스크립트.

Usage:
  cd agents
  python3 scripts/test_place_analysis.py "https://naver.me/FLyTVJOZ"
  python3 scripts/test_place_analysis.py "https://map.naver.com/p/entry/place/1501810705?lng=..."
"""
import sys
import os
import re
import json
import time
import urllib.parse

import requests
from dotenv import load_dotenv

# ── 환경변수 로드 ────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
# 네이버 API 키는 apps/web/.env.local에 있음
_web_env = os.path.join(os.path.dirname(__file__), "..", "..", "apps", "web", ".env.local")
if os.path.exists(_web_env):
    load_dotenv(_web_env, override=False)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")

# ── 공통 유틸 ────────────────────────────────────────────
HEADERS_BROWSER = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://map.naver.com/",
}


def log(step: str, msg: str, ok: bool = True):
    icon = "✅" if ok else "❌"
    print(f"  {icon} [{step}] {msg}")


def log_header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# ══════════════════════════════════════════════════════════
# Step 1. URL 파싱 + place_id 추출
# ══════════════════════════════════════════════════════════

def extract_place_id(url: str) -> dict:
    """
    네이버 플레이스 URL에서 place_id를 추출.
    축약 URL(naver.me)이면 리다이렉트를 따라가서 풀 URL 획득.
    """
    log_header("Step 1. URL 파싱 + place_id 추출")
    result = {"input_url": url, "resolved_url": None, "place_id": None, "success": False}

    # 1-a. 축약 URL 리다이렉트 처리
    if "naver.me" in url:
        log("URL", f"축약 URL 감지 → 리다이렉트 추적 시작")
        try:
            resp = requests.get(url, allow_redirects=True, timeout=10, headers={
                "User-Agent": HEADERS_BROWSER["User-Agent"]
            })
            resolved = resp.url
            result["resolved_url"] = resolved
            log("URL", f"리다이렉트 결과: {resolved[:100]}...")
        except Exception as e:
            log("URL", f"리다이렉트 실패: {e}", ok=False)
            return result
    else:
        result["resolved_url"] = url
        log("URL", f"풀 URL 사용: {url[:100]}...")

    # 1-b. place_id 추출 (/place/ 뒤 숫자)
    full_url = result["resolved_url"]
    patterns = [
        r"/place/(\d+)",           # /place/1501810705
        r"placeid=(\d+)",          # ?placeid=123
        r"/entry/place/(\d+)",     # /entry/place/1501810705
    ]
    for pat in patterns:
        m = re.search(pat, full_url)
        if m:
            result["place_id"] = m.group(1)
            result["success"] = True
            log("PARSE", f"place_id 추출 성공: {result['place_id']}")
            return result

    log("PARSE", f"place_id 추출 실패 — URL 패턴 매칭 안 됨", ok=False)
    return result


# ══════════════════════════════════════════════════════════
# Step 2. 네이버 플레이스 데이터 수집
# ══════════════════════════════════════════════════════════

def collect_place_data(place_id: str) -> dict:
    """
    place_id로 네이버 내부 API 호출.
    summary API의 data.placeDetail 구조에서 데이터 추출.
    차단 시 네이버 검색 API 대안 사용.
    """
    log_header("Step 2. 네이버 플레이스 데이터 수집")
    result = {
        "place_id": place_id,
        "api_results": {},
        "search_fallback": None,
        "collected_data": {},
        "success": False,
    }

    # ── 2-a. summary API 호출 (핵심 데이터 소스) ──────────
    summary_url = f"https://map.naver.com/p/api/place/summary/{place_id}"
    try:
        resp = requests.get(summary_url, headers=HEADERS_BROWSER, timeout=10)
        status = resp.status_code
        result["api_results"]["summary"] = {"status": status, "data": None, "error": None}

        if status == 200:
            raw = resp.json()
            result["api_results"]["summary"]["data"] = raw
            log("API", f"summary: {status} OK")
        else:
            result["api_results"]["summary"]["error"] = f"HTTP {status}"
            log("API", f"summary: {status} — 차단 또는 오류", ok=False)
    except Exception as e:
        result["api_results"]["summary"] = {"status": 0, "data": None, "error": str(e)}
        log("API", f"summary: 요청 실패 — {e}", ok=False)

    # ── 2-b. placeDetail에서 데이터 추출 ──────────────────
    collected = {}
    raw_summary = (result["api_results"].get("summary") or {}).get("data")

    # data.placeDetail 중첩 구조 처리
    place = None
    if isinstance(raw_summary, dict):
        if "data" in raw_summary and isinstance(raw_summary["data"], dict):
            place = raw_summary["data"].get("placeDetail")
        if not place:
            place = raw_summary  # fallback: 직접 접근

    if isinstance(place, dict):
        collected["name"] = place.get("name", "")
        collected["business_type"] = place.get("businessType", "")

        # 카테고리 (중첩 구조)
        cat = place.get("category") or {}
        if isinstance(cat, dict):
            collected["category"] = cat.get("category", "")
        elif isinstance(cat, str):
            collected["category"] = cat

        # 주소 (중첩 구조)
        addr = place.get("address") or {}
        if isinstance(addr, dict):
            collected["road_address"] = addr.get("roadAddress", "")
            collected["address"] = addr.get("address", "")
        elif isinstance(addr, str):
            collected["address"] = addr

        # 전화번호
        collected["phone"] = place.get("phone") or place.get("tel", "")

        # 영업시간 (중첩 구조)
        bh = place.get("businessHours") or {}
        if isinstance(bh, dict):
            collected["business_hours"] = bh.get("description", "")
        elif isinstance(bh, str):
            collected["business_hours"] = bh

        # 리뷰 수
        vr = place.get("visitorReviews") or {}
        if isinstance(vr, dict):
            display = vr.get("displayText", "")
            # "방문자 리뷰 2,955" → 숫자 추출
            nums = re.findall(r"[\d,]+", display)
            collected["visitor_review_count"] = nums[-1] if nums else "0"
            collected["visitor_review_display"] = display

        br = place.get("blogReviews") or {}
        if isinstance(br, dict):
            collected["blog_review_count"] = br.get("total", 0)

        # 라벨 (예약, 배달, N페이 등)
        labels = place.get("labels") or {}
        if isinstance(labels, dict):
            active_labels = [k for k, v in labels.items() if v]
            collected["service_labels"] = active_labels

        # 좌표
        coord = place.get("coordinate") or {}
        if isinstance(coord, dict):
            collected["latitude"] = coord.get("latitude")
            collected["longitude"] = coord.get("longitude")

        # 이미지
        imgs = place.get("images") or {}
        if isinstance(imgs, dict):
            img_list = imgs.get("images") or []
            collected["image_count"] = len(img_list)
            collected["image_urls"] = [
                img.get("origin", "") for img in img_list[:5]
            ]

        # 네이버 예약 메뉴 (인기 메뉴 이미지)
        booking_menu = place.get("naverBookingMenu") or {}
        if isinstance(booking_menu, dict):
            pop_imgs = booking_menu.get("popularMenuImages") or []
            if pop_imgs:
                collected["popular_menu_images"] = len(pop_imgs)

        collected["_placeDetail_keys"] = list(place.keys())

    # ── 2-c. 네이버 검색 API로 보충 (업체명으로 검색) ─────
    place_name = collected.get("name", "")
    road_addr = collected.get("road_address", "")
    if place_name:
        log("SEARCH", f"업체명 '{place_name}'으로 검색 API 보충 시도")
        # 주소에서 지역명 추출해서 검색 정확도 향상
        region = ""
        if road_addr:
            parts = road_addr.split()
            if len(parts) >= 2:
                region = parts[1]  # 구/군
        search_query = f"{place_name} {region}".strip()
        fallback = _search_naver_local(place_id, search_query)
        result["search_fallback"] = fallback
        if fallback and fallback.get("success"):
            fb_data = fallback.get("data", {})
            # 검색 API에서만 얻을 수 있는 정보 보충
            if fb_data.get("description") and not collected.get("description"):
                collected["description"] = fb_data["description"]
            if fb_data.get("link") and not collected.get("home_url"):
                collected["home_url"] = fb_data["link"]
            if fb_data.get("category") and not collected.get("category"):
                collected["category"] = fb_data["category"]
            log("SEARCH", f"검색 API 보충 완료: category={fb_data.get('category', 'N/A')}")

    result["collected_data"] = collected

    if collected.get("name"):
        result["success"] = True
        log("DATA", f"업체명: {collected.get('name', 'N/A')}")
        log("DATA", f"카테고리: {collected.get('category', 'N/A')}")
        log("DATA", f"업종: {collected.get('business_type', 'N/A')}")
        log("DATA", f"도로명 주소: {collected.get('road_address', 'N/A')}")
        log("DATA", f"전화: {collected.get('phone', 'N/A')}")
        log("DATA", f"영업시간: {collected.get('business_hours', 'N/A')}")
        log("DATA", f"방문자 리뷰: {collected.get('visitor_review_display', 'N/A')}")
        log("DATA", f"블로그 리뷰: {collected.get('blog_review_count', 0)}건")
        log("DATA", f"서비스: {', '.join(collected.get('service_labels', []))}")
        log("DATA", f"이미지: {collected.get('image_count', 0)}장")
    else:
        # summary도 실패 → 검색 API만으로 시도
        if not place_name:
            log("FALLBACK", "summary 데이터 없음 → 네이버 검색 API 시도")
            fallback = _search_naver_local(place_id, None)
            result["search_fallback"] = fallback
            if fallback and fallback.get("success"):
                result["collected_data"].update(fallback.get("data", {}))
                result["success"] = True
                log("FALLBACK", f"검색 결과: {fallback['data'].get('name', 'N/A')}")

    if not result["success"]:
        log("DATA", "데이터 수집 실패 — 모든 방법 차단됨", ok=False)

    return result


def _search_naver_local(place_id: str, name_hint: str | None = None) -> dict:
    """네이버 검색 API(/v1/search/local.json)로 업체 정보 검색."""
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        log("FALLBACK", "NAVER_CLIENT_ID/SECRET 미설정 — 검색 API 사용 불가", ok=False)
        return {"success": False, "error": "API 키 미설정"}

    query = name_hint or place_id
    try:
        resp = requests.get(
            "https://openapi.naver.com/v1/search/local.json",
            params={"query": query, "display": 5},
            headers={
                "X-Naver-Client-Id": NAVER_CLIENT_ID,
                "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
            },
            timeout=10,
        )
        if resp.status_code != 200:
            log("FALLBACK", f"검색 API 응답: {resp.status_code}", ok=False)
            return {"success": False, "error": f"HTTP {resp.status_code}"}

        data = resp.json()
        items = data.get("items", [])
        if not items:
            log("FALLBACK", "검색 결과 없음", ok=False)
            return {"success": False, "error": "No results"}

        item = items[0]
        return {
            "success": True,
            "data": {
                "name": re.sub(r"<[^>]+>", "", item.get("title", "")),
                "category": item.get("category", ""),
                "address": item.get("address", ""),
                "road_address": item.get("roadAddress", ""),
                "phone": item.get("telephone", ""),
                "description": item.get("description", ""),
                "link": item.get("link", ""),
            },
        }
    except Exception as e:
        log("FALLBACK", f"검색 API 오류: {e}", ok=False)
        return {"success": False, "error": str(e)}


# ══════════════════════════════════════════════════════════
# Step 3. AI 분석 (Claude API)
# ══════════════════════════════════════════════════════════

def analyze_with_claude(collected_data: dict, place_id: str) -> dict:
    """수집된 데이터를 Claude에 넘겨 구조화된 마케팅 분석 JSON 생성."""
    log_header("Step 3. AI 분석 (Claude API)")
    result = {"success": False, "analysis": None, "error": None}

    if not ANTHROPIC_API_KEY:
        log("AI", "ANTHROPIC_API_KEY 미설정", ok=False)
        result["error"] = "API 키 미설정"
        return result

    # 분석에 불필요한 내부 키 제거
    clean_data = {k: v for k, v in collected_data.items() if not k.startswith("_")}

    system_prompt = """당신은 B2B 마케팅 전략 컨설턴트입니다.
네이버 플레이스 업체 데이터를 분석하여, 콘텐츠 생성 파이프라인에 직접 주입할 수 있는 구조화된 JSON을 생성합니다.

반드시 아래 JSON 형식으로만 응답하세요. 모든 필드를 빠짐없이 채우세요:
{
  "brand_analysis": {
    "industry": {"main": "대분류", "sub": "소분류", "region": "지역구"},
    "tone": {
      "style": "글쓰기 스타일 (예: 친근한 해요체, 감성적 스토리텔링)",
      "personality": "브랜드 성격 키워드 (예: 열정적, 프로페셔널, 따뜻한)",
      "example_phrases": ["이 업체 스타일에 맞는 예시 표현 3~5개"]
    },
    "target_audience": {
      "primary": "주요 타겟 (예: 30~40대 직장인 가족)",
      "secondary": "보조 타겟",
      "pain_points": ["고객 고민/니즈 3~5개"],
      "search_intent": "이 업체를 검색하는 고객의 핵심 의도"
    },
    "usp": ["핵심 차별화 포인트 3~5개 (짧은 문장)"],
    "selling_points_from_reviews": ["리뷰 수/별점 기반으로 추정되는 고객 만족 포인트 3~5개"],
    "price_position": "가격 포지셔닝 (예: 가성비 중심, 중상위 프리미엄)",
    "signature_products": ["시그니처 메뉴/상품/서비스 3~5개"],
    "cta": {
      "primary": "메인 CTA 문구",
      "secondary": "보조 CTA 문구"
    },
    "forbidden_terms": ["이 업종에서 절대 쓰면 안 되는 표현 3~5개"]
  },
  "content_strategy": {
    "recommended_keywords": [
      {"keyword": "키워드1", "intent": "검색 의도", "priority": "high"},
      ...5~10개
    ],
    "recommended_content_types": ["list", "single", "review 등 추천 콘텐츠 타입"],
    "posting_frequency": "추천 발행 빈도 (예: 주 2~3회)",
    "competitor_differentiation": "경쟁사 대비 콘텐츠 차별화 전략 1~2문장",
    "content_angles": ["추천 콘텐츠 주제/관점 5개+"]
  }
}"""

    user_prompt = f"""아래 네이버 플레이스 업체 데이터를 분석하여 콘텐츠 생성용 구조화 JSON을 만들어주세요.

## 수집된 업체 데이터
```json
{json.dumps(clean_data, ensure_ascii=False, indent=2)}
```

위 데이터를 기반으로 brand_analysis와 content_strategy를 빠짐없이 분석해주세요.
- selling_points_from_reviews: 방문자 리뷰 수와 블로그 리뷰 수를 근거로 추정
- signature_products: 업종 카테고리와 업체명에서 추론
- forbidden_terms: 업종 특성상 금기 표현 (과대광고, 의료법 위반 등)
- recommended_keywords: 실제 네이버 검색에서 쓰일 키워드

JSON 형식으로만 응답하세요."""

    try:
        log("AI", "Claude API 호출 중...")
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 4096,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
            },
            timeout=60,
        )

        if resp.status_code != 200:
            log("AI", f"Claude API 응답: {resp.status_code} — {resp.text[:200]}", ok=False)
            result["error"] = f"HTTP {resp.status_code}"
            return result

        resp_data = resp.json()
        text = resp_data.get("content", [{}])[0].get("text", "")

        # JSON 추출 (코드 블록 안에 있을 수 있음)
        json_match = re.search(r"```json\s*([\s\S]*?)\s*```", text)
        if json_match:
            text = json_match.group(1)
        elif text.strip().startswith("{"):
            pass
        else:
            brace_match = re.search(r"\{[\s\S]*\}", text)
            if brace_match:
                text = brace_match.group(0)

        ai_result = json.loads(text)

        # ── 최종 구조화 JSON 조립 (basic_info + brand_analysis + content_strategy) ──
        analysis = {
            "place_id": place_id,
            "basic_info": {
                "name": collected_data.get("name", ""),
                "category": collected_data.get("category", ""),
                "address": collected_data.get("road_address") or collected_data.get("address", ""),
                "phone": collected_data.get("phone", ""),
                "hours": collected_data.get("business_hours", ""),
                "sns_url": "",
                "homepage_url": collected_data.get("home_url", ""),
                "visitor_reviews": int(str(collected_data.get("visitor_review_count", "0")).replace(",", "")),
                "blog_reviews": int(collected_data.get("blog_review_count", 0)),
                "service_labels": collected_data.get("service_labels", []),
            },
            "brand_analysis": ai_result.get("brand_analysis", {}),
            "content_strategy": ai_result.get("content_strategy", {}),
        }

        result["analysis"] = analysis
        result["success"] = True

        ba = analysis.get("brand_analysis", {})
        cs = analysis.get("content_strategy", {})
        ind = ba.get("industry", {})
        log("AI", f"업종: {ind.get('main', '')} > {ind.get('sub', '')}")
        log("AI", f"톤: {ba.get('tone', {}).get('style', 'N/A')}")
        log("AI", f"USP: {len(ba.get('usp', []))}개")
        log("AI", f"키워드: {len(cs.get('recommended_keywords', []))}개")
        log("AI", f"CTA: {ba.get('cta', {}).get('primary', 'N/A')}")
        log("AI", f"금기 표현: {len(ba.get('forbidden_terms', []))}개")
        log("AI", f"시그니처: {', '.join(ba.get('signature_products', [])[:3])}")

    except json.JSONDecodeError as e:
        log("AI", f"JSON 파싱 실패: {e}", ok=False)
        result["error"] = f"JSON parse error: {e}"
        result["analysis"] = text if "text" in dir() else None
    except Exception as e:
        log("AI", f"Claude API 오류: {e}", ok=False)
        result["error"] = str(e)

    return result


# ══════════════════════════════════════════════════════════
# Step 4. 결과 리포트
# ══════════════════════════════════════════════════════════

def print_report(step1: dict, step2: dict, step3: dict, elapsed: float):
    """전체 결과 리포트 출력."""
    log_header("Step 4. 최종 결과 리포트")

    print(f"\n  ⏱️  총 소요 시간: {elapsed:.1f}초")
    print()

    # 성공/실패 요약
    steps = [
        ("Step 1 — URL 파싱", step1["success"]),
        ("Step 2 — 데이터 수집", step2["success"]),
        ("Step 3 — AI 분석", step3["success"]),
    ]
    for name, ok in steps:
        icon = "✅" if ok else "❌"
        print(f"  {icon} {name}")

    # 수집 데이터 항목
    print(f"\n  📦 수집된 데이터 항목:")
    collected = step2.get("collected_data", {})
    for key, val in collected.items():
        if key.startswith("_"):
            continue
        if isinstance(val, list):
            print(f"     · {key}: {len(val)}개")
        elif isinstance(val, str) and len(val) > 50:
            print(f"     · {key}: {val[:50]}...")
        elif val:
            print(f"     · {key}: {val}")

    # API 응답 요약
    print(f"\n  🌐 API 응답 상태:")
    for name, info in step2.get("api_results", {}).items():
        status = info.get("status", "N/A")
        has_data = "📄 데이터 있음" if info.get("data") else "비어 있음"
        print(f"     · {name}: HTTP {status} — {has_data}")

    if step2.get("search_fallback"):
        fb = step2["search_fallback"]
        icon = "✅" if fb.get("success") else "❌"
        print(f"     · search_fallback: {icon} {fb.get('error', '성공')}")

    # AI 분석 결과 (전체 구조화 JSON)
    if step3.get("success") and step3.get("analysis"):
        print(f"\n  🤖 AI 분석 결과 (구조화 JSON):")
        print(json.dumps(step3["analysis"], ensure_ascii=False, indent=2))
    elif step3.get("error"):
        print(f"\n  ❌ AI 분석 실패: {step3['error']}")

    print(f"\n{'='*60}")
    all_ok = all(ok for _, ok in steps)
    if all_ok:
        print("  🎉 전체 파이프라인 성공!")
    else:
        failed = [name for name, ok in steps if not ok]
        print(f"  ⚠️  실패 단계: {', '.join(failed)}")
    print(f"{'='*60}\n")


# ══════════════════════════════════════════════════════════
# Step 5. 프롬프트 주입 미리보기
# ══════════════════════════════════════════════════════════

def build_prompt_preview(analysis: dict) -> str:
    """구조화 JSON을 COPYWRITER 프롬프트에 주입했을 때의 미리보기 생성."""
    bi = analysis.get("basic_info", {})
    ba = analysis.get("brand_analysis", {})
    cs = analysis.get("content_strategy", {})
    ind = ba.get("industry", {})
    tone = ba.get("tone", {})
    ta = ba.get("target_audience", {})
    cta = ba.get("cta", {})

    # 키워드 포맷
    kw_lines = []
    for kw in cs.get("recommended_keywords", []):
        if isinstance(kw, dict):
            kw_lines.append(f"  - {kw.get('keyword', '')} ({kw.get('intent', '')}) [{kw.get('priority', '')}]")
        else:
            kw_lines.append(f"  - {kw}")
    kw_block = "\n".join(kw_lines) if kw_lines else "  (없음)"

    preview = f"""===== 프롬프트 주입 미리보기 =====

## 브랜드 정보

- 브랜드명: {bi.get('name', '')}
- 업종: {ind.get('main', '')} > {ind.get('sub', '')}
- 지역: {ind.get('region', '')}
- 주소: {bi.get('address', '')}
- 전화: {bi.get('phone', '')}
- 영업시간: {bi.get('hours', '')}
- 홈페이지: {bi.get('homepage_url', '') or '없음'}
- 방문자 리뷰: {bi.get('visitor_reviews', 0)}건 / 블로그 리뷰: {bi.get('blog_reviews', 0)}건
- 서비스: {', '.join(bi.get('service_labels', [])) or '없음'}

## 톤앤매너 가이드

- 스타일: {tone.get('style', '')}
- 성격: {tone.get('personality', '')}
- 자주 쓸 표현:
  {chr(10).join(f'  - "{p}"' for p in tone.get('example_phrases', []))}

## 타겟 독자

- 주요: {ta.get('primary', '')}
- 보조: {ta.get('secondary', '')}
- 검색 의도: {ta.get('search_intent', '')}
- 독자의 고민:
  {chr(10).join(f'  - {p}' for p in ta.get('pain_points', []))}

## 우리 강점 (콘텐츠에 자연스럽게 녹일 것)

- USP:
  {chr(10).join(f'  - {u}' for u in ba.get('usp', []))}
- 고객이 뽑은 강점:
  {chr(10).join(f'  - {s}' for s in ba.get('selling_points_from_reviews', []))}
- 가격 포지션: {ba.get('price_position', '')}
- 시그니처:
  {chr(10).join(f'  - {s}' for s in ba.get('signature_products', []))}

## CTA

- 메인: {cta.get('primary', '')}
- 보조: {cta.get('secondary', '')}

## 절대 쓰지 말 것

  {chr(10).join(f'  - {f}' for f in ba.get('forbidden_terms', []))}

## 공략 키워드

{kw_block}

## 콘텐츠 전략

- 추천 콘텐츠 타입: {', '.join(cs.get('recommended_content_types', []))}
- 추천 발행 빈도: {cs.get('posting_frequency', '')}
- 경쟁사 차별화: {cs.get('competitor_differentiation', '')}
- 콘텐츠 앵글:
  {chr(10).join(f'  - {a}' for a in cs.get('content_angles', []))}

==================================="""
    return preview


# ══════════════════════════════════════════════════════════
# Step 6. 파일 저장
# ══════════════════════════════════════════════════════════

def save_results(analysis: dict, prompt_preview: str, place_name: str):
    """분석 결과를 파일로 저장."""
    log_header("Step 6. 파일 저장")

    # 디렉토리 생성
    results_dir = os.path.join(os.path.dirname(__file__), "test_results")
    os.makedirs(results_dir, exist_ok=True)

    # 파일명에서 공백/특수문자 정리
    safe_name = re.sub(r"[^\w가-힣]", "_", place_name).strip("_")
    if not safe_name:
        safe_name = "unknown"

    # JSON 저장
    json_path = os.path.join(results_dir, f"place_analysis_{safe_name}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(analysis, f, ensure_ascii=False, indent=2)
    log("SAVE", f"JSON: {json_path}")

    # 프롬프트 프리뷰 저장
    txt_path = os.path.join(results_dir, f"prompt_preview_{safe_name}.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(prompt_preview)
    log("SAVE", f"TXT:  {txt_path}")

    return json_path, txt_path


# ══════════════════════════════════════════════════════════
# main
# ══════════════════════════════════════════════════════════

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/test_place_analysis.py <naver_place_url>")
        print('  예: python3 scripts/test_place_analysis.py "https://naver.me/FLyTVJOZ"')
        sys.exit(1)

    url = sys.argv[1]
    print(f"\n🔍 네이버 플레이스 분석 테스트")
    print(f"   입력 URL: {url}")

    t0 = time.time()

    # Step 1
    step1 = extract_place_id(url)
    if not step1["success"]:
        print("\n❌ place_id 추출 실패 — 중단")
        print_report(step1, {"success": False, "collected_data": {}, "api_results": {}}, {"success": False}, time.time() - t0)
        sys.exit(1)

    # Step 2
    step2 = collect_place_data(step1["place_id"])

    # Step 3
    if step2["success"]:
        step3 = analyze_with_claude(step2["collected_data"], step1["place_id"])
    else:
        log_header("Step 3. AI 분석 (Claude API)")
        log("AI", "데이터 수집 실패로 AI 분석 건너뜀", ok=False)
        step3 = {"success": False, "analysis": None, "error": "No data"}

    # Step 4 — 결과 리포트
    elapsed = time.time() - t0
    print_report(step1, step2, step3, elapsed)

    # Step 5 — 프롬프트 주입 미리보기
    if step3.get("success") and step3.get("analysis"):
        log_header("Step 5. 프롬프트 주입 미리보기")
        preview = build_prompt_preview(step3["analysis"])
        print(preview)

        # Step 6 — 파일 저장
        place_name = step3["analysis"].get("basic_info", {}).get("name", "unknown")
        save_results(step3["analysis"], preview, place_name)


if __name__ == "__main__":
    main()
