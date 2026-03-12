"""
test_import_check.py
모든 에이전트 모듈 임포트 검증 (DB 연결 없이 실행).

환경변수 없이도 임포트 자체가 성공하는지 확인한다.
실행:
  cd agents
  python test_import_check.py
"""
import sys
import os

# 필요 경로 추가
sys.path.insert(0, os.path.dirname(__file__))

# DB 연결이 필요 없도록 환경변수를 더미로 세팅
os.environ.setdefault("SUPABASE_URL", "https://dummy.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "dummy_key")
os.environ.setdefault("ANTHROPIC_API_KEY", "dummy_key")

MODULES = [
    ("core.logger",                  "AgentLogger"),
    ("core.db_client",               "DBClient"),
    ("core.base_agent",              "BaseAgent"),
    ("core.account_manager_agent",   "AccountManagerAgent"),
    ("modules.claude_client",        "complete"),
    ("modules.slack_client",         "send"),
    ("modules.slack_client",         "send_qc_report"),
    ("modules.slack_client",         "send_publish_report"),
    ("modules.slack_client",         "send_brand_persona_report"),
    ("modules.slack_client",         "send_aeo_citation_alert"),
    ("modules.slack_client",         "send_som_weekly_report"),
    ("cmo.cmo_agent",                "CMOAgent"),
    ("copywriter.copywriter_agent",  "CopywriterAgent"),
    ("rnd.rnd_agent",                "RNDAgent"),
    ("ops.quality_agent",            "QualityAgent"),
    ("ops.publisher_agent",          "PublisherAgent"),
    ("analyst.report_agent",         "ReportAgent"),
]

ok = 0
fail = 0

for module_path, attr in MODULES:
    try:
        mod = __import__(module_path, fromlist=[attr])
        getattr(mod, attr)  # 속성 접근도 확인
        print(f"  ✅ {module_path}.{attr}")
        ok += 1
    except Exception as e:
        print(f"  ❌ {module_path}.{attr}  →  {e}")
        fail += 1

print()
print(f"결과: {ok}개 성공 / {fail}개 실패")
sys.exit(0 if fail == 0 else 1)
