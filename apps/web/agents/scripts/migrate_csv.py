#!/usr/bin/env python3
"""
migrate_csv.py — 캠핏 스프레드시트 데이터 → Supabase 마이그레이션 스크립트

컬럼 매핑 (0-indexed):
  A(0):  메인 키워드         → 무시 (태그/그룹용, keywords 테이블에 저장 안 함)
  B(1):  서브 키워드         → keywords.keyword  ← 필수, 없으면 해당 행 스킵
  C(2):  제목               → contents.title
  D(3):  사용한 파일명        → contents.source_file
  E(4):  계정               → blog_accounts.account_name (없으면 자동 생성)
  F(5):  발행 날짜           → contents.published_at (MM.DD → 2026-MM-DD)
  G(6):  캠핏 링크 첨부 여부  → contents.camfit_link (Y→True, N/기타→False)
  H(7):  URL               → contents.published_url (없거나 http 아니면 행 스킵)
  I(8):  발행 24시간 후 순위  → serp_results (device=pc, captured_at=published_at+1day)
  J(9):  최신순위(PC)        → serp_results (device=pc, captured_at=데이터기준일)
  K(10): 최신순위(mo)        → serp_results (device=mo, captured_at=데이터기준일)
  L(11): 순위변동(PC)        → 무시
  M(12): 순위변동(MO)        → 무시
  N(13): 월검색량(PC)        → 무시 (keywords 컬럼 미존재)
  O(14): 월검색량(Mo)        → 무시 (keywords 컬럼 미존재)
  P(15): 월검색량(합계)       → keywords.monthly_search_total
  Q(16): 경쟁도             → keywords.competition_level (높음→high, 중간→medium, 낮음→low)
  R(17): mo 비중            → 무시
  S(18): 데이터기준일        → serp_results captured_at 기준일

스킵 조건:
  - URL 컬럼이 비어있거나 http로 시작하지 않는 행
  - 서브 키워드가 비어있는 행 (9개, 추후 AI 키워드 추출 예정)

사용법:
  cd agents/
  python3 scripts/migrate_csv.py --dry-run
  python3 scripts/migrate_csv.py --execute
  python3 scripts/migrate_csv.py --file /path/to/file.csv --client-id <UUID> --dry-run
"""

import argparse
import csv
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# agents/ 디렉토리를 파이썬 경로에 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from supabase import create_client

# ── 기본값 ─────────────────────────────────────────────────────────────────────
DEFAULT_CLIENT_ID = "d9af5297-de7c-4353-96ea-78ba0bb59f0c"  # camfit
DEFAULT_CSV_PATH  = "/Users/kk/Downloads/data.csv"
DEFAULT_YEAR      = 2026

# ── 경쟁도 매핑 ───────────────────────────────────────────────────────────────
COMPETITION_MAP: dict[str, str] = {
    "높음": "high",
    "중간": "medium",
    "낮음": "low",
}


# ── 유틸 함수 ─────────────────────────────────────────────────────────────────

def parse_date(date_str: str, year: int = DEFAULT_YEAR) -> str | None:
    """MM.DD 또는 YYYY-MM-DD 형식의 날짜를 YYYY-MM-DD로 변환."""
    if not date_str or not date_str.strip():
        return None
    s = date_str.strip()
    # YYYY-MM-DD 형식
    if len(s) == 10 and s[4] == "-":
        return s
    # MM.DD 형식
    if "." in s:
        parts = s.split(".")
        if len(parts) == 2:
            try:
                m, d = int(parts[0]), int(parts[1])
                return f"{year}-{m:02d}-{d:02d}"
            except ValueError:
                return None
    return None


def safe_rank(val: str) -> int | None:
    """순위 문자열 → int. '2위' → 2, '미노출' → None, '' → None."""
    if not val or not val.strip():
        return None
    v = val.strip()
    if v in ("미노출", "노출안됨", "-", "N/A"):
        return None
    # 숫자 + '위' 패턴
    v = v.replace("위", "").strip()
    try:
        return int(v)
    except ValueError:
        return None


def safe_int(val: str) -> int | None:
    """정수 변환, 실패 시 None."""
    if not val or not val.strip():
        return None
    try:
        return int(val.strip().replace(",", ""))
    except ValueError:
        return None


def load_csv(file_path: str) -> list[list[str]]:
    """CSV 파일 로드. BOM 자동 제거."""
    with open(file_path, newline="", encoding="utf-8-sig") as f:
        return list(csv.reader(f))


# ── DB 헬퍼 ──────────────────────────────────────────────────────────────────

def get_or_create_blog_account(
    db,
    client_id: str,
    account_raw: str,
    account_cache: dict[str, str],
    dry_run: bool,
) -> str | None:
    """blog_accounts 테이블에서 계정 조회 또는 생성."""
    if not account_raw or not account_raw.strip():
        return None

    account_name = account_raw.strip()

    if account_name in account_cache:
        return account_cache[account_name]

    resp = (
        db.table("blog_accounts")
        .select("id")
        .eq("client_id", client_id)
        .eq("account_name", account_name)
        .limit(1)
        .execute()
    )
    if resp and resp.data:
        account_cache[account_name] = resp.data[0]["id"]
        return resp.data[0]["id"]

    if dry_run:
        fake_id = str(uuid.uuid4())
        account_cache[account_name] = fake_id
        print(f"  [DRY] 블로그 계정 생성: {account_name}")
        return fake_id

    insert_resp = (
        db.table("blog_accounts")
        .insert({
            "client_id": client_id,
            "account_name": account_name,
            "platform": "naver",
            "is_active": True,
        })
        .execute()
    )
    if insert_resp.data:
        aid = insert_resp.data[0]["id"]
        account_cache[account_name] = aid
        print(f"  [NEW] 블로그 계정: {account_name} ({aid[:8]}...)")
        return aid
    print(f"  [ERR] 계정 생성 실패: {account_name}")
    return None


def get_or_create_keyword(
    db,
    client_id: str,
    sub_keyword: str,
    monthly_search_total: int | None,
    competition_level: str | None,
    keyword_cache: dict[str, str],
    dry_run: bool,
) -> str | None:
    """keywords 테이블에서 서브 키워드 조회 또는 생성."""
    if sub_keyword in keyword_cache:
        return keyword_cache[sub_keyword]

    resp = (
        db.table("keywords")
        .select("id")
        .eq("client_id", client_id)
        .eq("keyword", sub_keyword)
        .limit(1)
        .execute()
    )
    if resp and resp.data:
        keyword_cache[sub_keyword] = resp.data[0]["id"]
        return resp.data[0]["id"]

    if dry_run:
        fake_id = str(uuid.uuid4())
        keyword_cache[sub_keyword] = fake_id
        print(f"  [DRY] 키워드 생성: {sub_keyword} (검색량={monthly_search_total}, 경쟁도={competition_level})")
        return fake_id

    now = datetime.now(timezone.utc).isoformat()
    payload: dict = {
        "client_id": client_id,
        "keyword": sub_keyword,
        "platform": "naver",
        "status": "active",
        "is_tracking": True,
        "updated_at": now,
    }
    if monthly_search_total is not None:
        payload["monthly_search_total"] = monthly_search_total
    if competition_level:
        payload["competition_level"] = competition_level

    insert_resp = (
        db.table("keywords")
        .insert(payload)
        .execute()
    )
    if insert_resp.data:
        kid = insert_resp.data[0]["id"]
        keyword_cache[sub_keyword] = kid
        return kid
    print(f"  [ERR] 키워드 생성 실패: {sub_keyword}")
    return None


def get_existing_content_id(db, client_id: str, published_url: str) -> str | None:
    """이미 존재하는 콘텐츠의 ID 반환 (URL로 조회)."""
    resp = (
        db.table("contents")
        .select("id")
        .eq("client_id", client_id)
        .eq("published_url", published_url)
        .limit(1)
        .execute()
    )
    if resp and resp.data:
        return resp.data[0]["id"]
    return None


def insert_content(
    db,
    client_id: str,
    keyword_id: str,
    account_id: str | None,
    title: str,
    published_url: str,
    published_at: str | None,
    source_file: str | None,
    camfit_link: bool,
    url_cache: set[str],
    dry_run: bool,
) -> tuple[str | None, bool]:
    """contents 테이블에 콘텐츠 등록.
    Returns: (content_id, is_new) — is_new=False이면 기존 콘텐츠 ID 반환.
    """
    if published_url in url_cache:
        # 이미 삽입된 URL → 기존 ID 조회해서 SERP 처리 가능하도록 반환
        if not dry_run:
            existing_id = get_existing_content_id(db, client_id, published_url)
            return existing_id, False
        return None, False

    if dry_run:
        fake_id = str(uuid.uuid4())
        url_cache.add(published_url)
        return fake_id, True

    now = datetime.now(timezone.utc).isoformat()
    # NOTE: account_id는 019_fix_contents_account_fk.sql 실행 후 UPDATE로 연결
    # (현재 contents.account_id FK가 blog_accounts 대신 accounts를 참조 중)
    now = datetime.now(timezone.utc).isoformat()
    insert_resp = (
        db.table("contents")
        .insert({
            "client_id": client_id,
            "keyword_id": keyword_id,
            "title": title or None,
            "published_url": published_url,
            "published_at": published_at,
            "publish_status": "published",
            "generated_by": "ai",
            "content_type": "single",
            "is_active": True,
            "is_tracking": True,
            "camfit_link": camfit_link,
            "source_file": source_file or None,
            "created_at": now,
            "updated_at": now,
        })
        .execute()
    )
    if insert_resp.data:
        cid = insert_resp.data[0]["id"]
        url_cache.add(published_url)
        return cid, True
    print(f"  [ERR] 콘텐츠 삽입 실패: {title[:40] if title else published_url}")
    return None, False


def insert_serp_results(
    db,
    content_id: str,
    pc_rank: int | None,
    mo_rank: int | None,
    captured_at: str,
    dry_run: bool,
) -> int:
    """serp_results에 PC/MO 순위 삽입. 삽입 건수 반환."""
    records = []
    if pc_rank is not None:
        records.append({"content_id": content_id, "rank": pc_rank, "device": "PC", "captured_at": captured_at})
    if mo_rank is not None:
        records.append({"content_id": content_id, "rank": mo_rank, "device": "MO", "captured_at": captured_at})

    if not records:
        return 0

    if dry_run:
        return len(records)

    db.table("serp_results").insert(records).execute()
    return len(records)


# ── 메인 실행 ─────────────────────────────────────────────────────────────────

def run(args: argparse.Namespace):
    db = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )

    dry_run = not args.execute
    if dry_run:
        print("=" * 60)
        print("  DRY-RUN 모드 — DB에 실제 반영되지 않습니다")
        print("=" * 60)

    print(f"\nCSV 로드: {args.file}")
    rows = load_csv(args.file)

    # 헤더 감지
    start_idx = 0
    if rows and rows[0] and "키워드" in rows[0][0]:
        start_idx = 1
        print(f"헤더 감지 ({len(rows[0])}컬럼) → 2행부터 처리\n")

    data_rows = rows[start_idx:]

    # 기존 URL 캐시 로드 (중복 방지)
    if not dry_run:
        url_resp = (
            db.table("contents")
            .select("published_url")
            .eq("client_id", args.client_id)
            .filter("published_url", "not.is", "null")
            .execute()
        )
        url_cache: set[str] = {r["published_url"] for r in (url_resp.data or []) if r.get("published_url")}
        print(f"기존 URL {len(url_cache)}개 캐시 로드\n")
    else:
        url_cache = set()

    keyword_cache: dict[str, str] = {}
    account_cache: dict[str, str] = {}

    stats = {
        "processed": 0,
        "skip_no_url": 0,
        "skip_no_sub": 0,
        "skip_dup_url": 0,
        "keywords_new": 0,
        "accounts_new": 0,
        "contents": 0,
        "serp": 0,
        "errors": 0,
    }

    print(f"처리 대상: {len(data_rows)}행 (필터 후 집계 예정)")
    print("-" * 60)

    for i, row in enumerate(data_rows, start=1):
        # 빈 행 건너뜀
        if not any(c.strip() for c in row[:10]):
            continue

        row_p = (row + [""] * 25)[:25]

        sub_keyword     = row_p[1].strip()
        title           = row_p[2].strip()
        source_file     = row_p[3].strip() or None
        account_raw     = row_p[4].strip()
        date_raw        = row_p[5].strip()
        camfit_link_raw = row_p[6].strip().upper()
        url_raw         = row_p[7].strip()
        rank_24h_raw    = row_p[8].strip()
        rank_pc_raw     = row_p[9].strip()
        rank_mo_raw     = row_p[10].strip()
        search_total_raw = row_p[15].strip()
        competition_raw = row_p[16].strip()
        ref_date_raw    = row_p[18].strip()

        # ── 스킵 조건 1: URL 없음 ──────────────────────────────────────────────
        if not url_raw or not url_raw.startswith("http"):
            stats["skip_no_url"] += 1
            continue

        # ── 스킵 조건 2: 서브 키워드 없음 ────────────────────────────────────
        if not sub_keyword:
            stats["skip_no_sub"] += 1
            continue

        # ── 중복 URL (dry-run 제외) ───────────────────────────────────────────
        if url_raw in url_cache:
            stats["skip_dup_url"] += 1
            continue

        stats["processed"] += 1

        # ── 필드 파싱 ──────────────────────────────────────────────────────────
        published_at    = parse_date(date_raw)
        camfit_link     = camfit_link_raw == "Y"
        search_total    = safe_int(search_total_raw)
        competition     = COMPETITION_MAP.get(competition_raw)
        ref_date        = ref_date_raw if ref_date_raw else None

        rank_24h_pc     = safe_rank(rank_24h_raw)
        rank_latest_pc  = safe_rank(rank_pc_raw)
        rank_latest_mo  = safe_rank(rank_mo_raw)

        # ── 1. 블로그 계정 ────────────────────────────────────────────────────
        prev_acc_count = len(account_cache)
        account_id = get_or_create_blog_account(db, args.client_id, account_raw, account_cache, dry_run)
        if len(account_cache) > prev_acc_count:
            stats["accounts_new"] += 1

        # ── 2. 키워드 ─────────────────────────────────────────────────────────
        prev_kw_count = len(keyword_cache)
        keyword_id = get_or_create_keyword(
            db, args.client_id, sub_keyword,
            search_total, competition,
            keyword_cache, dry_run
        )
        if len(keyword_cache) > prev_kw_count:
            stats["keywords_new"] += 1

        if not keyword_id:
            stats["errors"] += 1
            continue

        # ── 3. 콘텐츠 ─────────────────────────────────────────────────────────
        content_id, is_new_content = insert_content(
            db, args.client_id, keyword_id, account_id,
            title, url_raw, published_at, source_file, camfit_link,
            url_cache, dry_run
        )
        if not content_id:
            stats["skip_dup_url"] += 1
            stats["processed"] -= 1
            continue
        if is_new_content:
            stats["contents"] += 1
        # is_new=False: 기존 콘텐츠지만 SERP는 계속 처리

        # ── 4. SERP 결과 ──────────────────────────────────────────────────────
        # 4-a. 24시간 후 순위 (published_at + 1day, PC만)
        if rank_24h_pc is not None and published_at:
            try:
                pub_dt = datetime.fromisoformat(published_at).replace(tzinfo=timezone.utc)
                ts_24h = (pub_dt + timedelta(days=1)).isoformat()
                stats["serp"] += insert_serp_results(db, content_id, rank_24h_pc, None, ts_24h, dry_run)
            except Exception as e:
                print(f"  [WARN] SERP 삽입 실패 (24h): {e}")

        # 4-b. 최신 순위 (데이터기준일)
        if ref_date and (rank_latest_pc is not None or rank_latest_mo is not None):
            try:
                captured_at = f"{ref_date}T00:00:00+00:00"
                stats["serp"] += insert_serp_results(db, content_id, rank_latest_pc, rank_latest_mo, captured_at, dry_run)
            except Exception as e:
                print(f"  [WARN] SERP 삽입 실패 (최신순위): {e}")

        # 진행 표시 (dry-run: 첫 5개 상세, execute: 매 50개)
        if dry_run and stats["contents"] <= 5:
            print(f"  [{stats['contents']:3d}] {sub_keyword[:25]:<25} | {account_raw:<12} | {published_at} | PC={rank_latest_pc} MO={rank_latest_mo}")
        elif not dry_run and stats["contents"] % 50 == 0:
            print(f"  진행: {stats['contents']}개 완료...")

    # ── 결과 요약 ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"  {'[DRY-RUN] ' if dry_run else ''}마이그레이션 {'미리보기' if dry_run else '완료'}")
    print("=" * 60)
    print(f"  처리 완료     : {stats['contents']:4d}건")
    print(f"  키워드 신규   : {stats['keywords_new']:4d}개")
    print(f"  계정 신규     : {stats['accounts_new']:4d}개")
    print(f"  SERP 레코드   : {stats['serp']:4d}건")
    print(f"  스킵 (URL없음): {stats['skip_no_url']:4d}건")
    print(f"  스킵 (서브KW없음): {stats['skip_no_sub']:4d}건  ← 추후 AI 추출 예정")
    print(f"  스킵 (URL중복): {stats['skip_dup_url']:4d}건")
    if stats["errors"]:
        print(f"  오류          : {stats['errors']:4d}건")
    if dry_run:
        print("\n  실제 반영하려면: python3 scripts/migrate_csv.py --execute")
    print("=" * 60)


def update_accounts(args: argparse.Namespace):
    """019 SQL 실행 후 contents.account_id를 blog_accounts로 연결."""
    db = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )

    print("=" * 60)
    print("  계정 연결 업데이트")
    print("=" * 60)

    rows = load_csv(args.file)
    start_idx = 1 if (rows and rows[0] and "키워드" in rows[0][0]) else 0
    data_rows = rows[start_idx:]

    # blog_accounts 전체 로드 (계정명 → ID 캐시)
    acc_resp = (
        db.table("blog_accounts")
        .select("id, account_name")
        .eq("client_id", args.client_id)
        .execute()
    )
    account_map: dict[str, str] = {
        r["account_name"]: r["id"]
        for r in (acc_resp.data or [])
    }
    print(f"blog_accounts 로드: {list(account_map.keys())}\n")

    updated = 0
    skipped = 0
    errors  = 0

    for row in data_rows:
        if not any(c.strip() for c in row[:10]):
            continue

        row_p = (row + [""] * 25)[:25]
        sub_keyword = row_p[1].strip()
        account_raw = row_p[4].strip()
        url_raw     = row_p[7].strip()

        if not url_raw.startswith("http") or not sub_keyword:
            continue

        account_id = account_map.get(account_raw)
        if not account_id:
            print(f"  [WARN] 계정 미발견: {account_raw}")
            skipped += 1
            continue

        resp = (
            db.table("contents")
            .update({"account_id": account_id})
            .eq("client_id", args.client_id)
            .eq("published_url", url_raw)
            .is_("account_id", "null")
            .execute()
        )
        if resp and resp.data:
            updated += len(resp.data)
        # account_id가 이미 있으면 0 rows updated → skipped
        else:
            skipped += 1

    print(f"\n  업데이트 완료: {updated}건")
    print(f"  스킵 (이미 연결됨): {skipped}건")
    if errors:
        print(f"  오류: {errors}건")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="캠핏 CSV → Supabase 마이그레이션")
    parser.add_argument(
        "--file",
        default=DEFAULT_CSV_PATH,
        help=f"CSV 파일 경로 (기본: {DEFAULT_CSV_PATH})"
    )
    parser.add_argument(
        "--client-id",
        default=DEFAULT_CLIENT_ID,
        dest="client_id",
        help=f"Supabase clients.id (기본: camfit={DEFAULT_CLIENT_ID[:8]}...)"
    )

    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", default=True, help="미리보기 모드 (기본값)")
    mode.add_argument("--execute", action="store_true", help="실제 DB 반영")
    mode.add_argument("--update-accounts", action="store_true", dest="update_accounts",
                      help="019 SQL 실행 후 contents.account_id 연결")

    args = parser.parse_args()

    if not Path(args.file).exists():
        print(f"오류: 파일을 찾을 수 없습니다 — {args.file}")
        sys.exit(1)

    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        print("오류: SUPABASE_URL, SUPABASE_SERVICE_KEY 환경변수가 필요합니다.")
        print("agents/.env 파일을 확인하세요.")
        sys.exit(1)

    if args.update_accounts:
        update_accounts(args)
    else:
        run(args)


if __name__ == "__main__":
    main()
