# /run-pipeline — 파이프라인 실행 헬퍼

AI 마케터 에이전트 파이프라인의 특정 단계를 즉시 실행하거나
전체 파이프라인을 테스트하는 커맨드.

## 사용법

```
/run-pipeline [agent] [job_type] [client_id]
/run-pipeline --all --once          # 전체 1회 폴링
/run-pipeline --agent CMO           # CMO만 실행
/run-pipeline --test                # E2E 테스트 모드
```

## 실행 명령어 모음

### 전체 파이프라인 1회 실행

```bash
cd agents/
python main.py --once
```

### 특정 에이전트만 실행

```bash
python main.py --agents CMO --once
python main.py --agents RND --once
python main.py --agents COPYWRITER --once
python main.py --agents OPS_QUALITY OPS_PUBLISHER --once
```

### 수동 Job 생성 (DB 직접 삽입)

```bash
python -c "
from dotenv import load_dotenv; load_dotenv()
from core.db_client import DBClient
db = DBClient()
job = db.create_job({
    'job_type': 'BRAND_ANALYZE',
    'assigned_agent': 'RND',
    'title': '[RND] 브랜드 분석',
    'input_payload': {
        'client_id': 'YOUR_CLIENT_ID',
        'source_url': 'https://example.com'
    }
})
print('Created job:', job['id'])
"
```

### 모델 라우팅 확인

```bash
python -c "
from modules.claude_client import route_model, ModelTier
agents = ['ACCOUNT_MANAGER', 'CMO', 'COPYWRITER', 'RND', 'OPS_QUALITY']
for a in agents:
    m = route_model(a)
    tier = 'HIGH' if 'opus' in m else 'MED' if 'sonnet' in m else 'LOW'
    print(f'{a:20} → {tier} ({m})')
"
```

## Next.js 대시보드

실행 중인 Jobs 확인:
```
http://localhost:3000/ops/jobs
```

## 환경변수 테스트

```bash
# 전체 에이전트를 Haiku로 강제 (비용 절감 테스트)
FORCE_MODEL=claude-haiku-4-5-20251001 python main.py --once

# Tavily 딥리서치 활성화 테스트
TAVILY_API_KEY=tvly-xxx python main.py --agents RND --once
```
