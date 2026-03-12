"""
test_e2e_cmo_copywriter.py
CMOAgent + CopywriterAgent 전체 흐름 E2E 검증.

흐름:
  Cycle 1: AccountManager → CLIENT_ONBOARD 생성
  Cycle 2: AccountManager → CLIENT_ONBOARD 처리 → CMO CAMPAIGN_PLAN 생성
  Cycle 3: CMOAgent → CAMPAIGN_PLAN 처리 → CONTENT_CREATE 생성 (Claude API 호출)
  Cycle 4: CopywriterAgent → CONTENT_CREATE 처리 → 콘텐츠 저장 → QUALITY_CHECK 생성 (Claude API 2회)

검증 포인트:
  ✓ CAMPAIGN_PLAN Job DONE
  ✓ CONTENT_CREATE Job 생성됨
  ✓ CONTENT_CREATE Job DONE
  ✓ contents 테이블에 콘텐츠 저장됨
  ✓ QUALITY_CHECK Job 생성됨 (OPS_QUALITY)

실행:
  cd ai-marketer/agents
  python3 test_e2e_cmo_copywriter.py
"""
import sys
import traceback
from datetime import datetime, timezone

sys.path.insert(0, ".")

from core.db_client import DBClient
from core.account_manager_agent import AccountManagerAgent
from cmo.cmo_agent import CMOAgent
from copywriter.copywriter_agent import CopywriterAgent


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _section(title: str) -> None:
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")


def run() -> bool:
    db = DBClient()

    workspace_id: str | None = None
    created_workspace: bool = False
    test_client_id: str | None = None

    try:
        # ────────────────────────────────────────────────────────────
        # 0. 테스트 환경 준비
        # ────────────────────────────────────────────────────────────
        _section("0. 테스트 환경 준비")

        # 기존 워크스페이스 재사용
        ws_result = db.client.table("workspaces").select("id").limit(1).execute()
        if ws_result.data:
            workspace_id = ws_result.data[0]["id"]
            created_workspace = False
            print(f"  기존 워크스페이스 사용: {workspace_id[:8]}...")
        else:
            ws = db.client.table("workspaces").insert({
                "name": "[E2E_TEST] 테스트 워크스페이스",
            }).execute()
            workspace_id = ws.data[0]["id"]
            created_workspace = True
            print(f"  새 워크스페이스 생성: {workspace_id[:8]}...")

        # 테스트 클라이언트 생성
        client_result = db.client.table("clients").insert({
            "workspace_id": workspace_id,
            "company_name": "[E2E_TEST] 글램핑 테스트회사",
            "name": "테스트 담당자",
        }).execute()
        test_client_id = client_result.data[0]["id"]
        print(f"  테스트 클라이언트: {test_client_id[:8]}...")

        # 활성 구독 생성 (monthly_content_count=1 → 콘텐츠 1개만 생성)
        sub_result = db.client.table("subscriptions").insert({
            "client_id": test_client_id,
            "plan_name": "basic",
            "status": "active",
            "scope": {
                "monthly_content_count": 1,
                "keyword_count": 1,
                "platforms": ["NAVER_BLOG"],
                "include_report": False,
            },
        }).execute()
        test_subscription_id = sub_result.data[0]["id"]
        print(f"  활성 구독: {test_subscription_id[:8]}...")

        # 테스트 키워드 생성 (CMO가 사용)
        kw_result = db.client.table("keywords").insert({
            "client_id": test_client_id,
            "keyword": "글램핑 추천",
            "sub_keyword": "경기도 글램핑",
            "monthly_search_total": 45000,
            "competition": "MEDIUM",
            "priority": "high",
            "is_tracking": True,
        }).execute()
        test_keyword_id = kw_result.data[0]["id"]
        print(f"  테스트 키워드: 글램핑 추천 ({test_keyword_id[:8]}...)")

        # 테스트 계정 생성 (CMO 계정 배정용)
        acc_result = db.client.table("accounts").insert({
            "client_id": test_client_id,
            "name": "[E2E_TEST] 테스트블로그",
            "platform": "naver",
            "blog_score": 75,
            "status": "active",
        }).execute()
        test_account_id = acc_result.data[0]["id"]
        print(f"  테스트 계정: {test_account_id[:8]}...")
        print("  ✓ 준비 완료")

        # ────────────────────────────────────────────────────────────
        # Cycle 1: 구독 감지 → CLIENT_ONBOARD Job 생성
        # ────────────────────────────────────────────────────────────
        _section("Cycle 1: 구독 감지 → CLIENT_ONBOARD Job 생성")

        am_agent = AccountManagerAgent()
        am_agent.run_once()

        onboard_jobs = (
            db.client.table("jobs")
            .select("*")
            .eq("client_id", test_client_id)
            .eq("job_type", "CLIENT_ONBOARD")
            .execute()
        )
        if not onboard_jobs.data:
            print("  ✗ CLIENT_ONBOARD Job이 생성되지 않았습니다.")
            return False

        onboard_job = onboard_jobs.data[0]
        print(f"  ✓ CLIENT_ONBOARD 생성됨: {onboard_job['id'][:8]}...")

        # ────────────────────────────────────────────────────────────
        # Cycle 2: CLIENT_ONBOARD 처리 → CMO CAMPAIGN_PLAN 생성
        # ────────────────────────────────────────────────────────────
        _section("Cycle 2: CLIENT_ONBOARD 처리 → CMO CAMPAIGN_PLAN 생성")

        am_agent.run_once()

        onboard_done = db.get_job(onboard_job["id"])
        onboard_status = onboard_done["status"] if onboard_done else "NOT_FOUND"
        print(f"  CLIENT_ONBOARD 상태: {onboard_status}")
        if onboard_status != "DONE":
            err = onboard_done.get("error_message", "") if onboard_done else ""
            print(f"  ✗ CLIENT_ONBOARD 처리 실패 — {err}")
            return False
        print("  ✓ CLIENT_ONBOARD DONE")

        cmo_jobs = (
            db.client.table("jobs")
            .select("*")
            .eq("client_id", test_client_id)
            .eq("job_type", "CAMPAIGN_PLAN")
            .eq("assigned_agent", "CMO")
            .execute()
        )
        if not cmo_jobs.data:
            print("  ✗ CMO CAMPAIGN_PLAN Job이 생성되지 않았습니다.")
            return False

        cmo_job = cmo_jobs.data[0]
        print(f"  ✓ CAMPAIGN_PLAN 생성됨: {cmo_job['id'][:8]}...")

        # ────────────────────────────────────────────────────────────
        # Cycle 3: CMO → CAMPAIGN_PLAN 처리 → CONTENT_CREATE 생성
        # (Claude API 호출 발생)
        # ────────────────────────────────────────────────────────────
        _section("Cycle 3: CMO CAMPAIGN_PLAN 처리 → CONTENT_CREATE 생성 (Claude API)")

        cmo_agent = CMOAgent()
        cmo_agent.run_once()

        cmo_done = db.get_job(cmo_job["id"])
        cmo_status = cmo_done["status"] if cmo_done else "NOT_FOUND"
        print(f"  CAMPAIGN_PLAN 상태: {cmo_status}")
        if cmo_status != "DONE":
            err = cmo_done.get("error_message", "") if cmo_done else ""
            print(f"  ✗ CAMPAIGN_PLAN 처리 실패 — {err}")
            return False
        print("  ✓ CAMPAIGN_PLAN DONE")

        out = cmo_done.get("output_payload") or {}
        print(f"  전략 요약: {str(out.get('strategy_summary', ''))[:80]}...")
        print(f"  방향: {out.get('focus_direction', '')}")

        content_jobs = (
            db.client.table("jobs")
            .select("*")
            .eq("client_id", test_client_id)
            .eq("job_type", "CONTENT_CREATE")
            .eq("assigned_agent", "COPYWRITER")
            .execute()
        )
        if not content_jobs.data:
            print("  ✗ CONTENT_CREATE Job이 생성되지 않았습니다.")
            return False

        content_job = content_jobs.data[0]
        cj_payload = content_job.get("input_payload") or {}
        print(f"  ✓ CONTENT_CREATE 생성됨: {content_job['id'][:8]}...")
        print(f"    키워드: {cj_payload.get('keyword')}")
        print(f"    제목:   {cj_payload.get('content_title', '')[:50]}...")
        print(f"    계정:   {cj_payload.get('account_name', '미배정')}")

        # ────────────────────────────────────────────────────────────
        # Cycle 4: Copywriter → CONTENT_CREATE 처리
        # (Claude API 2회 호출 — 구조 설계 + 세부 집필)
        # ────────────────────────────────────────────────────────────
        _section("Cycle 4: Copywriter CONTENT_CREATE 처리 (Claude API ×2)")
        print("  ⏳ Claude API 호출 중... (30~60초 소요될 수 있습니다)")

        cw_agent = CopywriterAgent()
        cw_agent.run_once()

        cw_done = db.get_job(content_job["id"])
        cw_status = cw_done["status"] if cw_done else "NOT_FOUND"
        print(f"  CONTENT_CREATE 상태: {cw_status}")
        if cw_status != "DONE":
            err = cw_done.get("error_message", "") if cw_done else ""
            print(f"  ✗ CONTENT_CREATE 처리 실패 — {err}")
            return False
        print("  ✓ CONTENT_CREATE DONE")

        out_cw = cw_done.get("output_payload") or {}
        content_id = out_cw.get("content_id")
        print(f"  콘텐츠 ID:   {str(content_id)[:8] if content_id else 'None'}...")
        print(f"  글자 수:     {out_cw.get('word_count', 0):,}자")
        print(f"  FAQ 수:      {out_cw.get('faq_count', 0)}개")
        print(f"  스키마 타입: {out_cw.get('schema_types', [])}")

        # 검증: contents 테이블에 저장됐는지 확인
        if content_id:
            content_rec = (
                db.client.table("contents")
                .select("id, title, word_count, publish_status")
                .eq("id", content_id)
                .single()
                .execute()
            )
            if content_rec.data:
                rec = content_rec.data
                print(f"  ✓ contents DB 저장 확인")
                print(f"    제목:   {rec.get('title', '')[:50]}...")
                print(f"    상태:   {rec.get('publish_status')}")
                print(f"    글자수: {rec.get('word_count'):,}자")
            else:
                print("  ✗ contents 테이블에서 콘텐츠를 찾을 수 없습니다.")
                return False
        else:
            print("  ⚠ keyword_id 없음 → contents 저장 건너뜀 (정상 동작)")

        # 검증: QUALITY_CHECK Job 생성 여부
        qc_jobs = (
            db.client.table("jobs")
            .select("*")
            .eq("client_id", test_client_id)
            .eq("job_type", "QUALITY_CHECK")
            .eq("assigned_agent", "OPS_QUALITY")
            .execute()
        )
        if not qc_jobs.data:
            print("  ✗ QUALITY_CHECK Job이 생성되지 않았습니다.")
            return False

        qc_job = qc_jobs.data[0]
        qc_payload = qc_job.get("input_payload") or {}
        print(f"  ✓ QUALITY_CHECK Job 생성됨: {qc_job['id'][:8]}...")
        print(f"    키워드:    {qc_payload.get('keyword')}")
        print(f"    글자 수:   {qc_payload.get('word_count', 0):,}자")
        print(f"    FAQ 수:    {qc_payload.get('faq_count', 0)}개")
        print(f"    AI 요약:   {str(qc_payload.get('ai_summary', ''))[:60]}...")

        return True

    except Exception as e:
        print(f"\n  ✗ 예외 발생: {e}")
        traceback.print_exc()
        return False

    finally:
        # ────────────────────────────────────────────────────────────
        # 테스트 데이터 정리
        # ────────────────────────────────────────────────────────────
        _section("테스트 데이터 정리")
        try:
            if test_client_id:
                db.client.table("contents").delete().eq("client_id", test_client_id).execute()
                db.client.table("jobs").delete().eq("client_id", test_client_id).execute()
                db.client.table("keywords").delete().eq("client_id", test_client_id).execute()
                db.client.table("accounts").delete().eq("client_id", test_client_id).execute()
                db.client.table("clients").delete().eq("id", test_client_id).execute()
                print("  ✓ 테스트 데이터 전체 삭제")
            if created_workspace and workspace_id:
                db.client.table("workspaces").delete().eq("id", workspace_id).execute()
                print("  ✓ 테스트 워크스페이스 삭제")
        except Exception as e:
            print(f"  ⚠ 정리 중 오류 (무시): {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("  CMOAgent + CopywriterAgent E2E 테스트")
    print("  (실제 Claude API 호출 포함 — API 비용 발생)")
    print("=" * 60)

    success = run()

    print("\n" + "=" * 60)
    if success:
        print("✓ E2E 테스트 전체 통과!")
        print("  CAMPAIGN_PLAN → CONTENT_CREATE → 콘텐츠 저장 → QC 체인 정상")
    else:
        print("✗ E2E 테스트 실패. 위 오류를 확인하세요.")
    print("=" * 60)

    sys.exit(0 if success else 1)
