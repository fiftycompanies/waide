"""
test_connection.py
Supabase 연결 및 테이블 확인 스크립트.
Step 3 완료 후 실행해서 모든 것이 정상인지 검증.

실행:
  cd ai-marketer/agents
  python test_connection.py
"""
import sys
from core.db_client import DBClient


def test_connection():
    print("=" * 50)
    print("Supabase 연결 테스트")
    print("=" * 50)

    try:
        db = DBClient()
        print("✓ DBClient 초기화 성공\n")
    except Exception as e:
        print(f"✗ DBClient 초기화 실패: {e}")
        sys.exit(1)

    # 테이블 존재 여부 확인
    tables = [
        "clients", "accounts", "keywords",
        "contents", "serp_results", "settings",
        "jobs", "agent_logs", "metrics", "reports",
    ]

    print("테이블 확인:")
    all_ok = True
    for table in tables:
        try:
            result = db.client.table(table).select("id").limit(1).execute()
            count = len(result.data)
            print(f"  ✓ {table:<15} (행 샘플: {count}개 조회됨)")
        except Exception as e:
            print(f"  ✗ {table:<15} 오류: {e}")
            all_ok = False

    # 설정값 확인
    print("\n설정값 확인:")
    for key in ["ec2_api", "agent_config", "quality_gate"]:
        val = db.get_settings(key)
        if val:
            print(f"  ✓ settings['{key}'] 존재")
        else:
            print(f"  ✗ settings['{key}'] 없음 (002_agent_system.sql 실행 확인)")
            all_ok = False

    # agent_logs 쓰기 테스트
    print("\nagent_logs 쓰기 테스트:")
    try:
        db.insert_agent_log({
            "agent_type": "SYSTEM",
            "action": "CONNECTION_TEST",
            "status": "success",
            "message": "test_connection.py 실행 완료",
            "metadata": {"test": True},
        })
        print("  ✓ agent_logs 쓰기 성공")
    except Exception as e:
        print(f"  ✗ agent_logs 쓰기 실패: {e}")
        all_ok = False

    print("\n" + "=" * 50)
    if all_ok:
        print("✓ 모든 테스트 통과. 에이전트 실행 준비 완료!")
    else:
        print("✗ 일부 테스트 실패. 위 오류를 확인하세요.")
        print("  → 002_agent_system.sql이 Supabase에서 실행되었는지 확인")
    print("=" * 50)


if __name__ == "__main__":
    test_connection()
