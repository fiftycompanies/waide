# /ops-status — 에이전트 운영 현황 조회

실행 중인 Jobs, 실패한 콘텐츠, AEO 인용률 등
운영 상태를 빠르게 확인하는 커맨드.

## 사용법

```
/ops-status                    # 전체 현황 요약
/ops-status --jobs             # Jobs 목록
/ops-status --failed           # 실패한 콘텐츠
/ops-status --aeo [client_id]  # AEO 인용률
```

## DB 쿼리 예시

### 현재 PENDING/IN_PROGRESS Jobs

```bash
python -c "
from dotenv import load_dotenv; load_dotenv()
from core.db_client import DBClient
db = DBClient()
supabase = db._client
res = supabase.table('jobs') \
    .select('id, title, assigned_agent, status, created_at') \
    .in_('status', ['PENDING', 'IN_PROGRESS']) \
    .order('created_at', desc=True) \
    .limit(20) \
    .execute()
for job in res.data:
    print(f\"{job['assigned_agent']:15} {job['status']:12} {job['title'][:50]}\")
"
```

### 오늘 실패한 Jobs

```bash
python -c "
from dotenv import load_dotenv; load_dotenv()
from datetime import date
from core.db_client import DBClient
db = DBClient()
today = date.today().isoformat()
res = db._client.table('jobs') \
    .select('title, assigned_agent, error_message, updated_at') \
    .eq('status', 'FAILED') \
    .gte('updated_at', today) \
    .execute()
for j in res.data:
    print(f\"{j['assigned_agent']}: {j['title'][:40]} — {j['error_message'][:60]}\")
"
```

### 최근 AEO 인용률 (7일)

```bash
python -c "
from dotenv import load_dotenv; load_dotenv()
from datetime import date, timedelta
from core.db_client import DBClient
db = DBClient()
since = (date.today() - timedelta(days=7)).isoformat()
res = db._client.table('aeo_metrics') \
    .select('platform, is_cited, keyword') \
    .gte('created_at', since) \
    .execute()
from collections import defaultdict
stats = defaultdict(lambda: {'total': 0, 'cited': 0})
for m in res.data:
    p = m['platform']
    stats[p]['total'] += 1
    if m['is_cited']:
        stats[p]['cited'] += 1
for p, s in sorted(stats.items()):
    rate = s['cited']/s['total']*100 if s['total'] else 0
    print(f'{p:15} {rate:5.1f}% ({s[\"cited\"]}/{s[\"total\"]})')
"
```

## Next.js 대시보드 링크

- 전체 현황: http://localhost:3000/ops
- Jobs 목록: http://localhost:3000/ops/jobs
- 콘텐츠 뷰어: http://localhost:3000/ops/contents
