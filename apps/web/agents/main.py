"""
main.py
AI 마케터 에이전트 시스템 — 메인 디스패처

모든 에이전트를 멀티스레드로 동시 실행한다.
각 에이전트는 독립적인 스레드에서 폴링 루프를 돌며
자신에게 배정된 PENDING Job을 처리한다.

실행 방법:
  cd agents
  python main.py

  # 특정 에이전트만 실행:
  python main.py --agents CMO COPYWRITER

  # 단일 폴링 후 종료 (테스트용):
  python main.py --once
"""
import argparse
import threading
import sys
import os

# 현재 디렉터리를 sys.path에 추가 (상대 임포트 지원)
sys.path.insert(0, os.path.dirname(__file__))


def _make_agents(names: list[str]) -> list:
    """에이전트 이름 목록으로 인스턴스 생성."""
    # 지연 임포트 (환경변수 로드 후 실행되도록)
    from core.account_manager_agent  import AccountManagerAgent
    from cmo.cmo_agent               import CMOAgent
    from copywriter.copywriter_agent import CopywriterAgent
    from rnd.rnd_agent               import RNDAgent
    from ops.quality_agent           import QualityAgent
    from ops.publisher_agent         import PublisherAgent
    from analyst.report_agent        import ReportAgent
    from analyst.serp_agent          import SerpAgent         # Deprecated — serp-collector.ts로 이전
    from analyst.account_grader      import AccountGraderAgent
    from analyst.keyword_grader      import KeywordGraderAgent
    from analyst.publish_recommender import PublishRecommenderAgent

    _registry = {
        "ACCOUNT_MANAGER":    AccountManagerAgent,
        "CMO":                CMOAgent,
        "COPYWRITER":         CopywriterAgent,
        "RND":                RNDAgent,
        "OPS_QUALITY":        QualityAgent,
        "OPS_PUBLISHER":      PublisherAgent,
        "ANALYST_REPORT":     ReportAgent,
        "ANALYST_SERP":       SerpAgent,             # Deprecated — serp-collector.ts로 이전
        "ANALYST_MATCH":      PublishRecommenderAgent,  # 매칭 추천 (복합 에이전트)
        "ACCOUNT_GRADER":     AccountGraderAgent,
        "KEYWORD_GRADER":     KeywordGraderAgent,
    }

    agents = []
    for name in names:
        cls = _registry.get(name.upper())
        if cls is None:
            print(f"[MAIN] 알 수 없는 에이전트: {name}")
            continue
        agents.append(cls())
    return agents


def run_all(agent_names: list[str], once: bool = False) -> None:
    """에이전트를 멀티스레드로 실행."""
    agents = _make_agents(agent_names)

    if not agents:
        print("[MAIN] 실행할 에이전트가 없습니다.")
        return

    if once:
        # 단일 폴링 (테스트용): 스레드 없이 순차 실행
        print(f"[MAIN] 단일 폴링 모드 — 에이전트 {len(agents)}개")
        for agent in agents:
            agent.run_once()
        return

    # 상시 폴링: 각 에이전트를 별도 스레드로 실행
    threads = []
    for agent in agents:
        t = threading.Thread(
            target=agent.start,
            name=agent.agent_type,
            daemon=True,
        )
        threads.append(t)

    print(
        f"[MAIN] {len(agents)}개 에이전트 시작: "
        + ", ".join(a.agent_type for a in agents)
    )

    for t in threads:
        t.start()

    try:
        for t in threads:
            t.join()
    except KeyboardInterrupt:
        print("\n[MAIN] 종료 신호 수신 — 모든 에이전트 정지 중...")
        for agent in agents:
            agent.stop()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI 마케터 에이전트 시스템")
    parser.add_argument(
        "--agents",
        nargs="+",
        default=[
            "ACCOUNT_MANAGER",
            "CMO",
            "COPYWRITER",
            "RND",
            "OPS_QUALITY",
            "OPS_PUBLISHER",
            "ANALYST_REPORT",
            "ANALYST_SERP",    # SERP 순위 트래커
            "ANALYST_MATCH",   # 매칭 추천 + 피드백 루프
            "ACCOUNT_GRADER",  # 계정 등급 계산
            "KEYWORD_GRADER",  # 키워드 난이도 계산
        ],
        help="실행할 에이전트 이름 목록 (기본: 전체)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="단일 폴링 후 종료 (테스트용)",
    )
    args = parser.parse_args()

    run_all(agent_names=args.agents, once=args.once)
