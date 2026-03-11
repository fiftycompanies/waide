#!/usr/bin/env python3
"""
backfill_clients.py
===================
기존 brand_personas 레코드 중 client_id가 NULL인 것들에 대해
clients 테이블에 대응하는 레코드를 생성하고 FK를 업데이트한다.

실행 방법:
    cd agents/
    python backfill_clients.py [--dry-run]

플래그:
    --dry-run   실제 DB 변경 없이 처리 예정 항목만 출력
"""

import sys
import os
import argparse
from datetime import datetime, timezone

# Load .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]


def main(dry_run: bool = False) -> None:
    db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    now = datetime.now(timezone.utc).isoformat()

    # 1) client_id가 없는 brand_personas 전체 조회
    result = db.table("brand_personas").select(
        "id, workspace_id, name, client_id"
    ).is_("client_id", "null").execute()

    personas = result.data or []
    print(f"[Backfill] client_id가 없는 brand_personas: {len(personas)}건")

    if not personas:
        print("[Backfill] 처리할 항목 없음. 종료.")
        return

    for p in personas:
        persona_id = p["id"]
        workspace_id = p["workspace_id"]
        brand_name = p["name"]

        print(f"\n--- brand_persona: {brand_name} ({persona_id[:8]}...) ---")
        print(f"    workspace_id: {workspace_id}")

        if dry_run:
            print(f"    [DRY RUN] clients INSERT 예정: name={brand_name!r}")
            print(f"    [DRY RUN] brand_personas UPDATE 예정: client_id=<new_uuid>")
            continue

        # 2) 동일 workspace + name으로 이미 client가 있는지 확인
        existing = db.table("clients").select("id").eq(
            "workspace_id", workspace_id
        ).eq("name", brand_name).limit(1).execute()

        if existing.data:
            client_id = existing.data[0]["id"]
            print(f"    기존 client 재사용: {client_id}")
        else:
            # 3) clients INSERT
            insert_result = db.table("clients").insert({
                "workspace_id": workspace_id,
                "name": brand_name,
                "company_name": brand_name,
                "status": "active",
                "updated_at": now,
            }).execute()

            if not insert_result.data:
                print(f"    [ERROR] clients INSERT 실패: {insert_result}")
                continue

            client_id = insert_result.data[0]["id"]
            print(f"    clients 생성 완료: {client_id}")

        # 4) brand_personas.client_id 업데이트
        update_result = db.table("brand_personas").update({
            "client_id": client_id,
        }).eq("id", persona_id).execute()

        if update_result.data:
            print(f"    brand_personas.client_id 업데이트 완료")
        else:
            print(f"    [ERROR] brand_personas UPDATE 실패: {update_result}")

    print("\n[Backfill] 완료.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill clients for brand_personas")
    parser.add_argument("--dry-run", action="store_true", help="변경 없이 예정 항목만 출력")
    args = parser.parse_args()
    main(dry_run=args.dry_run)
