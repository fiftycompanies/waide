import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '/Users/kk/Desktop/my-ai-agents/ai-marketer/apps/web/.env.local' });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const { data: best, error: e1 } = await db
  .from('contents')
  .select('id, title, keyword_id, url, peak_rank, client_id, keywords(keyword)')
  .lte('peak_rank', 5)
  .gte('peak_rank', 1);

if (e1) { console.error('Error:', e1); process.exit(1); }
console.log('Peak 1-5 콘텐츠:', best.length, '건');

if (best.length === 0) {
  console.log('등록할 베스트글 없음');
  process.exit(0);
}

// 이미 등록된 content_id
const contentIds = best.map(c => c.id);
const { data: existing } = await db
  .from('content_sources')
  .select('content_id')
  .in('content_id', contentIds)
  .eq('is_active', true);

const existingIds = new Set((existing ?? []).map(e => e.content_id));
console.log('이미 등록:', existingIds.size, '건');

let registered = 0;
let skipped = 0;

for (const c of best) {
  if (existingIds.has(c.id)) {
    skipped++;
    continue;
  }

  const { error } = await db.from('content_sources').insert({
    client_id: c.client_id,
    source_type: 'own_best',
    title: c.title ?? c.keywords?.keyword ?? '베스트 콘텐츠',
    url: c.url ?? null,
    content_text: null,
    content_structure: { peak_rank: c.peak_rank },
    content_id: c.id,
    usage_mode: 'style',
  });

  if (error) {
    console.log('Insert error for', c.title, ':', error.message);
  } else {
    registered++;
  }
}

console.log('=== 결과 ===');
console.log('신규 등록:', registered, '건');
console.log('스킵(중복):', skipped, '건');
process.exit(0);
