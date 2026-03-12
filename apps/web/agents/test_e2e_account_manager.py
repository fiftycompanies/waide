"""
test_e2e_account_manager.py
AccountManagerAgent 전체 흐름 E2E 검증.

흐름:
  Cycle 1: scan_new_subscriptions → CLIENT_ONBOARD Job 생성
  Cycle 2: CLIENT_ONBOARD Job 처리 → CMO CAMPAIGN_PLAN Job 생성

실행:
  cd ai-marketer/agents
  python test_e2e_account_manager.py
"""
import sys
import traceback
from datetime import datetime, timezone

# ── 경로 설정 ──────────────────────────────────────
sys.path.insert(0, ".")

from core.db_client import DBClient
from core.account_manager_agent import AccountManagerAgent


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _section(title: str) -> None:
    print(f"\n{'─' * 54}")
    print(f"  {title}")
    print(f"{'─' * 54}")


def run() -> bool:
    db = DBClient()

    workspace_id: str | None = None
    created_workspace: bool = False
    test_client_id: str | None = None
    test_subscription_id: str | None = None

    try:
        # ────────────────────────────────────────────────────
        # 0. 테스트 환경 준비
        # ────────────────────────────────────────────────────
        _section("0. 테스트 환경 준비")

        # 기존 워크스페이스 재사용 (없으면 생성)
        ws_result = db.client.table("workspaces").select("id").limit(1).execute()
        if ws_result.data:
            workspace_id = ws_result.data[0]["id"]
            created_workspace = False
            print(f"  기존 워크스페이스 사용: {workspace_id[:8]}...")
        else:
            ws = db.client.table("workspaces").insert({
                "name": "[E2E_TEST] 테스트 워크스페이스",
                "created_at": _now(),
                "updated_at": _now(),
            }).execute()
            workspace_id = ws.data[0]["id"]
            created_workspace = True
            print(f"  새 워크스페이스 생성: {workspace_id[:8]}...")

        # 테스트 클라이언트 생성
        client_result = db.client.table("clients").insert({
            "workspace_id": workspace_id,
            "company_name": "[E2E_TEST] 테스트회사",
            "name": "테스트 담당자",
        }).execute()
        test_client_id = client_result.data[0]["id"]
        print(f"  테스트 클라이언트 생성: {test_client_id[:8]}...")

        # 활성 구독 생성 (scope 포함)
        sub_result = db.client.table("subscriptions").insert({
            "client_id": test_client_id,
            "plan_name": "basic",
            "status": "active",
            "scope": {
                "monthly_content_count": 5,
                "platforms": ["NAVER_BLOG"],
                "keyword_count": 3,
                "include_report": False,
                "include_design": False,
            },
        }).execute()
        test_subscription_id = sub_result.data[0]["id"]
        print(f"  활성 구독 생성: {test_subscription_id[:8]}...")
        print("  ✓ 준비 완료\n")

        # ────────────────────────────────────────────────────
        # Cycle 1: 신규 구독 감지 → CLIENT_ONBOARD Job 생성
        # ────────────────────────────────────────────────────
        _section("Cycle 1: 신규 구독 감지 → CLIENT_ONBOARD Job 생성")

        agent = AccountManagerAgent()
        agent.run_once()

        # 검증 1: CLIENT_ONBOARD Job 생성 여부
        jobs_result = (
            db.client.table("jobs")
            .select("*")
            .eq("client_id", test_client_id)
            .eq("job_type", "CLIENT_ONBOARD")
            .execute()
        )

        if not jobs_result.data:
            print("  ✗ CLIENT_ONBOARD Job이 생성되지 않았습니다.")
            return False

        onboard_job = jobs_result.data[0]
        print(f"  ✓ CLIENT_ONBOARD Job 생성됨")
        print(f"    ID:     {onboard_job['id'][:8]}...")
        print(f"    status: {onboard_job['status']}")
        print(f"    title:  {onboard_job['title']}")

        # 검증 2: subscription.onboarding_job_id 설정 여부
        sub_check = (
            db.client.table("subscriptions")
            .select("onboarding_job_id")
            .eq("id", test_subscription_id)
            .single()
            .execute()
        )
        onboarding_job_id = sub_check.data.get("onboarding_job_id") if sub_check.data else None
        if onboarding_job_id:
            print(f"  ✓ subscription.onboarding_job_id: {str(onboarding_job_id)[:8]}...")
        else:
            print("  ✗ subscription.onboarding_job_id가 설정되지 않았습니다.")
            return False

        # ────────────────────────────────────────────────────
        # Cycle 2: CLIENT_ONBOARD Job 처리 → CMO CAMPAIGN_PLAN Job 생성
        # ────────────────────────────────────────────────────
        _section("Cycle 2: CLIENT_ONBOARD 처리 → CMO CAMPAIGN_PLAN Job 생성")

        agent.run_once()

        # 검증 3: CLIENT_ONBOARD Job 상태가 DONE인지 확인
        onboard_updated = db.get_job(onboard_job["id"])
        onboard_status = onboard_updated["status"] if onboard_updated else "NOT_FOUND"
        print(f"  CLIENT_ONBOARD 최종 상태: {onboard_status}")

        if onboard_status != "DONE":
            print("  ✗ CLIENT_ONBOARD Job 처리 실패")
            err = onboard_updated.get("error_message") if onboard_updated else ""
            if err:
                print(f"    오류: {err}")
            return False
        print("  ✓ CLIENT_ONBOARD Job DONE")

        # 검증 4: CMO CAMPAIGN_PLAN Job 생성 여부
        cmo_result = (
            db.client.table("jobs")
            .select("*")
            .eq("client_id", test_client_id)
            .eq("job_type", "CAMPAIGN_PLAN")
            .eq("assigned_agent", "CMO")
            .execute()
        )

        if not cmo_result.data:
            print("  ✗ CMO CAMPAIGN_PLAN Job이 생성되지 않았습니다.")
            return False

        cmo_job = cmo_result.data[0]
        print(f"  ✓ CMO CAMPAIGN_PLAN Job 생성됨")
        print(f"    ID:     {cmo_job['id'][:8]}...")
        print(f"    status: {cmo_job['status']}")
        print(f"    title:  {cmo_job['title']}")

        return True

    except Exception as e:
        print(f"\n  ✗ 예외 발생: {e}")
        traceback.print_exc()
        return False

    finally:
        # ────────────────────────────────────────────────────
        # 정리: 테스트 데이터 삭제
        # ────────────────────────────────────────────────────
        _section("테스트 데이터 정리")
        try:
            if test_client_id:
                # jobs.client_id → ON DELETE SET NULL (자동이지만 명시적 삭제)
                db.client.table("jobs").delete().eq("client_id", test_client_id).execute()
                # subscriptions → ON DELETE CASCADE (client 삭제 시 자동)
                # clients 삭제 (subscriptions, metrics cascade)
                db.client.table("clients").delete().eq("id", test_client_id).execute()
                print(f"  ✓ 테스트 클라이언트 및 연관 데이터 삭제")
            if created_workspace and workspace_id:
                db.client.table("workspaces").delete().eq("id", workspace_id).execute()
                print(f"  ✓ 테스트 워크스페이스 삭제")
        except Exception as e:
            print(f"  ⚠ 정리 중 오류 (무시): {e}")


if __name__ == "__main__":
    print("=" * 54)
    print("  AccountManagerAgent E2E 테스트")
    print("=" * 54)

    success = run()

    print("\n" + "=" * 54)
    if success:
        print("✓ E2E 테스트 전체 통과!")
        print("  구독 감지 → CLIENT_ONBOARD → CMO 체인 정상 동작")
    else:
        print("✗ E2E 테스트 실패. 위 오류를 확인하세요.")
    print("=" * 54)

    sys.exit(0 if success else 1)
