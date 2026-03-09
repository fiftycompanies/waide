"""
iwinv 서버 (115.68.231.90) main.py 패치 — 대표 키워드 수집

이 파일은 iwinv 크롤러 서버의 /api/place-info 엔드포인트에
"대표 키워드" 파싱 로직을 추가하기 위한 패치 코드입니다.

[배포 방법]
1. SSH 접속: ssh root@115.68.231.90
2. 기존 main.py 백업: cp main.py main.py.bak
3. 아래 함수를 main.py에 추가
4. /api/place-info 핸들러의 응답에 placeKeywords 필드 추가
5. 서버 재시작: systemctl restart crawler (또는 pm2 restart)

[통합 방법]
기존 place-info 핸들러에서 scrape_place_keywords(place_id) 호출 후
응답 dict에 "placeKeywords": keywords 추가
"""

from playwright.async_api import async_playwright
import asyncio
import re


async def scrape_place_keywords(place_id: str) -> list[str]:
    """
    네이버 플레이스 정보탭에서 "대표 키워드" 섹션을 파싱합니다.

    Args:
        place_id: 네이버 플레이스 ID (예: "1048535417")

    Returns:
        대표 키워드 리스트 (예: ["홍대피부과", "보톡스", "리프팅"])
        파싱 실패 시 빈 리스트 반환
    """
    keywords = []
    url = f"https://m.place.naver.com/place/{place_id}/home"

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
                viewport={"width": 390, "height": 844},
                locale="ko-KR",
            )
            page = await context.new_page()

            await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            # 동적 콘텐츠 로딩 대기
            await page.wait_for_timeout(2000)

            # 방법 1: h2 "대표 키워드" 섹션 찾기
            # 네이버 플레이스 모바일 구조:
            #   <div class="place_section">
            #     <h2 class="place_section_header">대표 키워드</h2>
            #     <div class="place_section_content">
            #       <span>키워드1</span> <span>키워드2</span> ...
            #     </div>
            #   </div>
            sections = await page.query_selector_all("div.place_section, section")
            for section in sections:
                header = await section.query_selector("h2, .place_section_header, [class*='header']")
                if not header:
                    continue
                header_text = (await header.inner_text()).strip()
                if "대표 키워드" in header_text or "대표키워드" in header_text:
                    # 키워드 컨테이너에서 텍스트 추출
                    content = await section.query_selector(".place_section_content, [class*='content'], [class*='keyword']")
                    if content:
                        spans = await content.query_selector_all("span, a, li, [class*='chip'], [class*='tag'], [class*='keyword']")
                        if spans:
                            for span in spans:
                                text = (await span.inner_text()).strip()
                                text = text.lstrip("#").strip()
                                if text and len(text) >= 2 and text not in keywords:
                                    keywords.append(text)
                        else:
                            # span이 없으면 전체 텍스트에서 추출
                            full_text = (await content.inner_text()).strip()
                            for kw in re.split(r"[,\n·|]", full_text):
                                kw = kw.strip().lstrip("#").strip()
                                if kw and len(kw) >= 2 and kw not in keywords:
                                    keywords.append(kw)
                    break

            # 방법 2: 방법 1 실패 시 — data attribute 또는 aria-label 기반 탐색
            if not keywords:
                keyword_elements = await page.query_selector_all(
                    "[class*='representKeyword'], [class*='represent_keyword'], "
                    "[class*='placeKeyword'], [class*='place_keyword'], "
                    "[data-nclicks*='keyword'], [class*='chip']"
                )
                for el in keyword_elements:
                    text = (await el.inner_text()).strip().lstrip("#").strip()
                    if text and len(text) >= 2 and text not in keywords:
                        keywords.append(text)

            # 방법 3: 전체 페이지 텍스트에서 "대표 키워드" 이후 텍스트 파싱
            if not keywords:
                page_text = await page.inner_text("body")
                match = re.search(r"대표\s*키워드\s*(.+?)(?:영업시간|주소|전화|메뉴|리뷰|편의|$)", page_text, re.DOTALL)
                if match:
                    keyword_block = match.group(1).strip()
                    # 줄바꿈이나 구분자로 분리
                    for kw in re.split(r"[\n,·|]", keyword_block):
                        kw = kw.strip().lstrip("#").strip()
                        if kw and len(kw) >= 2 and len(kw) <= 20 and kw not in keywords:
                            keywords.append(kw)

            await browser.close()

    except Exception as e:
        print(f"[place-keywords] 대표 키워드 파싱 실패 (place_id={place_id}): {e}")

    if keywords:
        print(f"[place-keywords] {place_id}: {len(keywords)}개 수집 → {', '.join(keywords[:5])}")
    else:
        print(f"[place-keywords] {place_id}: 대표 키워드 섹션 없음")

    return keywords[:20]  # 최대 20개


# ═══════════════════════════════════════════════════════
# 기존 main.py의 /api/place-info 핸들러에 통합하는 방법:
# ═══════════════════════════════════════════════════════
#
# 기존 핸들러 (예시):
#
#   @app.post("/api/place-info")
#   async def get_place_info(request):
#       data = await request.json()
#       place_id = data["placeId"]
#       result = await crawl_place_data(place_id)  # 기존 크롤링
#       return JSONResponse(result)
#
# 패치 후:
#
#   @app.post("/api/place-info")
#   async def get_place_info(request):
#       data = await request.json()
#       place_id = data["placeId"]
#       result = await crawl_place_data(place_id)  # 기존 크롤링
#
#       # ★ 대표 키워드 수집 추가
#       try:
#           place_keywords = await scrape_place_keywords(place_id)
#           result["placeKeywords"] = place_keywords
#       except Exception as e:
#           print(f"[place-keywords] 실패: {e}")
#           result["placeKeywords"] = []
#
#       return JSONResponse(result)
#
# ═══════════════════════════════════════════════════════


# 테스트용 실행
if __name__ == "__main__":
    import sys

    place_id = sys.argv[1] if len(sys.argv) > 1 else "1048535417"  # 양와당 기본
    print(f"\n=== 대표 키워드 수집 테스트: place_id={place_id} ===\n")

    keywords = asyncio.run(scrape_place_keywords(place_id))

    if keywords:
        print(f"\n✅ 수집된 대표 키워드 ({len(keywords)}개):")
        for i, kw in enumerate(keywords, 1):
            print(f"  {i}. {kw}")
    else:
        print("\n❌ 대표 키워드를 찾지 못했습니다.")
        print("   → description 기반 키워드 추출로 폴백됩니다.")
