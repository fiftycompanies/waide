import os
import re
import json
import random
import asyncio
import logging
from datetime import datetime
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from playwright.async_api import async_playwright, Page
from playwright_stealth import Stealth

# ── .env 로딩 ─────────────────────────────────────────────
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("waide-crawler")

TRIGGER_SECRET = os.getenv("TRIGGER_SECRET", "")
BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

# ── 프록시 설정 ───────────────────────────────────────────
PROXY_SERVER = os.getenv("PROXY_SERVER", "")
PROXY_USERNAME = os.getenv("PROXY_USERNAME", "")
PROXY_PASSWORD = os.getenv("PROXY_PASSWORD", "")

stealth_cfg = Stealth(
    navigator_languages_override=("ko-KR", "ko"),
    navigator_platform_override="MacIntel",
    navigator_user_agent_override=BROWSER_UA,
    navigator_vendor_override="Google Inc.",
)

# ── GraphQL 쿼리 ──────────────────────────────────────────
GRAPHQL_BASE = """{placeDetail(input:{id:"%s",deviceType:"mobile",isNx:false,checkRedirect:false}){base{id name category roadAddress address phone virtualPhone visitorReviewsTotal visitorReviewsScore microReviews conveniences coordinate{x y}}description newBusinessHours{businessStatusDescription{status description}businessHours{day businessHours{start end}}}menus{name price recommend description}homepages{repr{url type}}images{images{origin url}}fsasReviews{total}bookingBusinessId bookingUrl saveCount}}"""

GRAPHQL_REVIEW = """{placeDetail(input:{id:"%s",deviceType:"mobile",isNx:false,checkRedirect:false}){visitorReviewStats{analysis{themes{label count}}}}}"""

GRAPHQL_KEYWORDS = """{placeDetail(input:{id:"%s",deviceType:"mobile",isNx:false,checkRedirect:false}){keywords}}"""

# ── 브라우저 싱글턴 ────────────────────────────────────────
_pw = None
_browser = None
_lock = asyncio.Lock()


def _build_proxy_config() -> dict | None:
    """BrightData Residential Proxy 설정을 반환합니다."""
    if not PROXY_SERVER:
        return None
    cfg = {"server": PROXY_SERVER}
    if PROXY_USERNAME:
        cfg["username"] = PROXY_USERNAME
    if PROXY_PASSWORD:
        cfg["password"] = PROXY_PASSWORD
    return cfg


async def _get_browser():
    global _pw, _browser
    async with _lock:
        if _browser is None or not _browser.is_connected():
            _pw = await async_playwright().start()
            launch_kwargs = {
                "headless": True,
                "args": [
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                ],
            }
            proxy = _build_proxy_config()
            if proxy:
                launch_kwargs["proxy"] = proxy
                logger.info(f"Browser launching with proxy: {PROXY_SERVER}")
            _browser = await _pw.chromium.launch(**launch_kwargs)
            logger.info("Browser launched")
    return _browser


@app.on_event("shutdown")
async def _shutdown():
    global _pw, _browser
    if _browser:
        await _browser.close()
    if _pw:
        await _pw.stop()


def log_msg(msg: str):
    logger.info(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")


# ── JS fetch helper (브라우저 내부에서 실행) ────────────────
JS_FETCH = """
async ([url, body]) => {
    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json", "Accept": "*/*"},
            body: body,
        });
        const text = await resp.text();
        return {status: resp.status, body: text};
    } catch (e) {
        return {error: e.toString()};
    }
}
"""


# ── 핵심: Playwright 브라우저 컨텍스트 내 fetch 로 GraphQL 호출 ──
async def _crawl_place(place_id: str) -> dict:
    result = {
        "name": "", "category": "", "businessType": "",
        "roadAddress": "", "address": "", "phone": "",
        "businessHours": "", "visitorReviewCount": 0,
        "blogReviewCount": 0, "serviceLabels": [],
        "imageCount": 0, "imageUrls": [],
        "homepageUrl": "", "snsUrl": "", "description": "",
        "facilities": [], "paymentMethods": [],
        "reservationUrl": "", "reviewKeywords": [],
        "nearbyCompetitors": 0,
        "placeKeywords": [],
        "bookmarkCount": None,
    }

    browser = await _get_browser()
    context = await browser.new_context(
        user_agent=BROWSER_UA,
        viewport={"width": 430, "height": 932},
        locale="ko-KR",
        timezone_id="Asia/Seoul",
        ignore_https_errors=True,
    )
    page = await context.new_page()
    await stealth_cfg.apply_stealth_async(page)

    try:
        # 1) m.place.naver.com 로 이동 (세션/쿠키 확보 + 같은 오리진)
        await page.goto("https://m.place.naver.com/", wait_until="domcontentloaded", timeout=15000)
        delay = random.uniform(1.0, 3.0)
        await page.wait_for_timeout(int(delay * 1000))

        # 2) 브라우저 내부에서 GraphQL fetch — 기본 데이터
        gql_url = "https://pcmap-api.place.naver.com/graphql"
        query_body = json.dumps({"query": GRAPHQL_BASE % place_id})
        resp = await page.evaluate(JS_FETCH, [gql_url, query_body])

        if resp.get("status") == 200:
            data = json.loads(resp["body"])
            if data.get("errors"):
                log_msg(f"GraphQL error: {data['errors'][0].get('message','')[:120]}")
            detail = (data.get("data") or {}).get("placeDetail")

            if detail and detail.get("base"):
                base = detail["base"]
                result["name"] = base.get("name", "")
                result["category"] = base.get("category", "")
                result["roadAddress"] = base.get("roadAddress", "")
                result["address"] = base.get("address", "")
                result["phone"] = base.get("phone") or base.get("virtualPhone", "")
                result["visitorReviewCount"] = base.get("visitorReviewsTotal", 0) or 0

                coord = base.get("coordinate")
                if coord:
                    try:
                        result["longitude"] = float(coord.get("x", 0))
                        result["latitude"] = float(coord.get("y", 0))
                    except (ValueError, TypeError):
                        pass

                micro = base.get("microReviews")
                if isinstance(micro, list):
                    result["description"] = " ".join(m for m in micro if m)

                conv = base.get("conveniences")
                if isinstance(conv, list):
                    result["facilities"] = [c for c in conv if c]

            if detail:
                desc = detail.get("description")
                if desc and isinstance(desc, str):
                    result["description"] = desc

                fsar = detail.get("fsasReviews")
                if fsar and fsar.get("total"):
                    result["blogReviewCount"] = fsar["total"]

                # 영업시간
                nbh = detail.get("newBusinessHours")
                if isinstance(nbh, list) and nbh:
                    first = nbh[0]
                    bh_list = first.get("businessHours")
                    if isinstance(bh_list, list) and bh_list:
                        parts = []
                        for h in bh_list:
                            day = h.get("day", "")
                            bh = h.get("businessHours") or {}
                            start = bh.get("start", "")
                            end = bh.get("end", "")
                            if start and end:
                                parts.append(f"{day} {start}~{end}")
                        result["businessHours"] = ", ".join(parts)
                    if not result["businessHours"]:
                        sd = first.get("businessStatusDescription") or {}
                        if sd.get("status"):
                            result["businessHours"] = sd["status"]

                # 메뉴
                menus = detail.get("menus")
                if isinstance(menus, list) and menus:
                    result["serviceLabels"].append("메뉴")

                # 홈페이지
                hp = detail.get("homepages")
                if hp and isinstance(hp, dict):
                    rpr = hp.get("repr")
                    if rpr and rpr.get("url"):
                        result["homepageUrl"] = rpr["url"]

                # 저장수 (bookmarkCount / saveCount)
                save_count = detail.get("saveCount")
                if save_count is not None:
                    try:
                        result["bookmarkCount"] = int(save_count)
                    except (ValueError, TypeError):
                        pass

                # 이미지
                imgs = detail.get("images")
                if imgs and isinstance(imgs, dict):
                    img_list = imgs.get("images") or []
                    result["imageCount"] = len(img_list)
                    for img in img_list[:20]:
                        img_url = img.get("origin") or img.get("url", "")
                        if img_url:
                            result["imageUrls"].append({"url": img_url, "type": "photo"})
        else:
            log_msg(f"GraphQL base status={resp.get('status')} err={resp.get('error','')}")

        # 3) 리뷰 키워드 (별도 쿼리)
        if result["name"]:
            await page.wait_for_timeout(int(random.uniform(500, 1500)))
            kw_body = json.dumps({"query": GRAPHQL_REVIEW % place_id})
            kw_resp = await page.evaluate(JS_FETCH, [gql_url, kw_body])
            if kw_resp.get("status") == 200:
                try:
                    kw_data = json.loads(kw_resp["body"])
                    themes_obj = ((kw_data.get("data") or {}).get("placeDetail") or {}).get("visitorReviewStats", {})
                    themes = (themes_obj.get("analysis") or {}).get("themes") or []
                    result["reviewKeywords"] = [
                        {"keyword": t.get("label", ""), "count": t.get("count", 0)}
                        for t in themes[:10] if t.get("label")
                    ]
                except Exception:
                    pass

        # 4) ★ 대표 키워드 (GraphQL keywords 필드)
        if result["name"]:
            try:
                await page.wait_for_timeout(int(random.uniform(300, 800)))
                pk_body = json.dumps({"query": GRAPHQL_KEYWORDS % place_id})
                pk_resp = await page.evaluate(JS_FETCH, [gql_url, pk_body])
                if pk_resp.get("status") == 200:
                    pk_data = json.loads(pk_resp["body"])
                    pk_detail = (pk_data.get("data") or {}).get("placeDetail") or {}
                    keywords = pk_detail.get("keywords")
                    if isinstance(keywords, list):
                        result["placeKeywords"] = [k for k in keywords if k and len(k) >= 2][:20]
                        if result["placeKeywords"]:
                            log_msg(f"[place-keywords] {place_id}: {len(result['placeKeywords'])}개 → {', '.join(result['placeKeywords'][:5])}")
                        else:
                            log_msg(f"[place-keywords] {place_id}: keywords 필드 비어있음")
                    else:
                        log_msg(f"[place-keywords] {place_id}: keywords 필드 없음")
            except Exception as e:
                log_msg(f"[place-keywords] GraphQL 실패: {e}")
                result["placeKeywords"] = []

    except Exception as e:
        log_msg(f"Crawl error: {e}")
    finally:
        await context.close()

    return result


# ── Health ─────────────────────────────────────────────────
@app.get("/health")
async def health():
    proxy_status = "connected" if PROXY_SERVER else "direct"
    return {"status": "ok", "engine": "playwright-stealth", "proxy": proxy_status}


# ── API 엔드포인트 (GET + POST) ────────────────────────────
@app.get("/api/place-info")
async def place_info_get(place_id: str = Query(..., description="네이버 플레이스 ID")):
    return await _handle(place_id, None)


class PlaceInfoBody(BaseModel):
    placeId: str
    secret: Optional[str] = None


@app.post("/api/place-info")
async def place_info_post(body: PlaceInfoBody):
    return await _handle(body.placeId, body.secret)


async def _handle(place_id: str, secret: Optional[str]):
    if TRIGGER_SECRET and secret != TRIGGER_SECRET:
        raise HTTPException(status_code=401, detail="Invalid secret")
    pid = place_id.strip()
    if not pid:
        raise HTTPException(status_code=400, detail="place_id is required")

    log_msg(f"REQ placeId={pid}")
    result = await _crawl_place(pid)

    if not result.get("name"):
        log_msg(f"EMPTY placeId={pid}")
        raise HTTPException(status_code=404, detail="Place not found or no data")

    log_msg(f"OK name={result['name']} reviews={result['visitorReviewCount']} placeKeywords={len(result.get('placeKeywords', []))}")
    return result
