/**
 * SERP 전체 재수집 스크립트
 * 네이버 검색 API로 전체 키워드 순위를 수집하고 DB에 기록한다.
 *
 * Usage: node scripts/serp-recollect.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const RANK_MAX = 100;
const DELAY_MS = 1200;
const today = new Date().toISOString().slice(0, 10);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function visibilityScore(rank) {
  if (rank == null || rank > 20) return 0;
  return Math.round(Math.max(0, ((21 - rank) / 20) * 100) * 100) / 100;
}

function extractBlogId(url) {
  const m = url.match(/blog\.naver\.com\/([a-zA-Z0-9_]+)/);
  return m ? m[1] : null;
}

async function searchNaverBlog(query) {
  const params = new URLSearchParams({ query, display: '100', sort: 'sim' });
  const resp = await fetch('https://openapi.naver.com/v1/search/blog.json?' + params, {
    headers: { 'X-Naver-Client-Id': NAVER_CLIENT_ID, 'X-Naver-Client-Secret': NAVER_CLIENT_SECRET },
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  return resp.json();
}

function findBlogRank(items, ourBlogIds) {
  const lower = ourBlogIds.map(id => id.toLowerCase());
  for (let i = 0; i < Math.min(items.length, RANK_MAX); i++) {
    const linkId = extractBlogId(items[i].link);
    if (linkId && lower.includes(linkId.toLowerCase())) {
      return { rank: i + 1, blogId: linkId, url: items[i].link };
    }
    const bloggerId = extractBlogId(
      items[i].bloggerlink.startsWith('http') ? items[i].bloggerlink : 'https://' + items[i].bloggerlink
    );
    if (bloggerId && lower.includes(bloggerId.toLowerCase())) {
      return { rank: i + 1, blogId: bloggerId, url: items[i].link };
    }
  }
  return { rank: null, blogId: null, url: null };
}

// ── STEP 0: Before Stats ────────────────────────────────
async function getBeforeStats() {
  const { data: oldSerp } = await db.from('serp_results').select('rank, is_exposed').eq('captured_at', today).eq('device', 'PC');
  const { data: oldSummary } = await db.from('daily_visibility_summary').select('*').eq('measured_at', today);

  const pcRanks = (oldSerp || []).filter(r => r.rank !== null).map(r => r.rank);
  const exposedCount = (oldSerp || []).filter(r => r.is_exposed).length;
  const total = (oldSerp || []).length;

  return {
    total,
    exposed: exposedCount,
    exposureRate: total > 0 ? Math.round(exposedCount / total * 10000) / 100 : 0,
    avgRank: pcRanks.length > 0 ? Math.round(pcRanks.reduce((a, b) => a + b, 0) / pcRanks.length * 100) / 100 : null,
    top3: pcRanks.filter(r => r <= 3).length,
    top10: pcRanks.filter(r => r <= 10).length,
    wVisPc: oldSummary?.[0]?.weighted_visibility_pc ?? null,
    wVisMo: oldSummary?.[0]?.weighted_visibility_mo ?? null,
  };
}

// ── MAIN ─────────────────────────────────────────────────
async function main() {
  console.log('=== 전체 키워드 SERP 재수집 시작 ===');
  console.log('날짜:', today);
  console.log('수집 방식: 네이버 검색 API (collection_method: api)');
  console.log('');

  // Before stats
  const before = await getBeforeStats();
  console.log('[BEFORE] 노출:', before.exposed + '/' + before.total, '(' + before.exposureRate + '%)');
  console.log('[BEFORE] 평균순위:', before.avgRank, '| TOP3:', before.top3, '| TOP10:', before.top10);
  console.log('[BEFORE] 가중점유율 PC:', before.wVisPc, '| MO:', before.wVisMo);
  console.log('');

  // 블로그 계정 로드
  const { data: accounts } = await db.from('blog_accounts').select('id, account_name, blog_url, client_id').eq('is_active', true);
  const blogAccountMap = {};
  const clientBlogMap = {};
  for (const acct of accounts || []) {
    let blogId = acct.account_name;
    if (acct.blog_url) {
      const m = acct.blog_url.match(/blog\.naver\.com\/([a-zA-Z0-9_]+)/);
      if (m) blogId = m[1];
    }
    blogAccountMap[blogId.toLowerCase()] = acct.id;
    if (!clientBlogMap[acct.client_id]) clientBlogMap[acct.client_id] = [];
    clientBlogMap[acct.client_id].push(blogId);
  }

  // 키워드 조회
  const { data: keywords } = await db.from('keywords')
    .select('id, keyword, sub_keyword, client_id, monthly_search_pc, monthly_search_mo')
    .neq('status', 'archived')
    .order('created_at', { ascending: true });

  // 콘텐츠 조회
  const { data: contents } = await db.from('contents').select('id, keyword_id, account_id');
  const kwContentMap = {};
  for (const c of contents || []) {
    if (!kwContentMap[c.keyword_id]) kwContentMap[c.keyword_id] = [];
    kwContentMap[c.keyword_id].push(c);
  }

  const total = keywords.length;
  console.log('총 키워드:', total, '개');
  console.log('─'.repeat(60));

  const results = [];
  let exposed = 0;
  let notExposed = 0;
  let failed = 0;

  for (let i = 0; i < total; i++) {
    const kw = keywords[i];
    const kwText = kw.sub_keyword || kw.keyword;
    const kwBlogIds = clientBlogMap[kw.client_id] || [];

    try {
      const searchResp = await searchNaverBlog(kwText);
      const rankResult = findBlogRank(searchResp.items, kwBlogIds);
      const rank = rankResult.rank;
      const isExposed = rank !== null;
      const postUrl = rankResult.url;

      if (isExposed) exposed++;
      else notExposed++;

      // Progress
      const pct = Math.round((i + 1) / total * 100);
      const rankStr = rank !== null ? rank + '위' : '-';
      process.stdout.write(`\r[${pct}%] ${i + 1}/${total} | ${kwText.padEnd(20).slice(0, 20)} | ${rankStr.padEnd(5)} | 노출:${exposed} 미노출:${notExposed} 실패:${failed}`);

      // DB 업데이트
      const kwContents = kwContentMap[kw.id] || [];
      const matchedAccountId = rankResult.blogId ? blogAccountMap[rankResult.blogId.toLowerCase()] : null;
      let targetContent = kwContents[0];
      if (matchedAccountId) {
        const sameAcct = kwContents.find(c => c.account_id === matchedAccountId);
        if (sameAcct) targetContent = sameAcct;
      }

      if (targetContent) {
        if (postUrl) {
          await db.from('contents').update({ url: postUrl }).eq('id', targetContent.id);
        }
        for (const device of ['PC', 'MO']) {
          await db.from('serp_results').upsert(
            { content_id: targetContent.id, device, rank, rank_change: 0, is_exposed: isExposed, search_platform: 'NAVER_SERP', captured_at: today, collection_method: 'api' },
            { onConflict: 'content_id,device,captured_at' }
          );
        }
        if (rank !== null) {
          const { data: cur } = await db.from('contents').select('peak_rank').eq('id', targetContent.id).single();
          if (!cur?.peak_rank || rank < cur.peak_rank) {
            await db.from('contents').update({ peak_rank: rank, peak_rank_at: today }).eq('id', targetContent.id);
          }
        }
      }

      // keywords 순위 업데이트
      await db.from('keywords').update({
        current_rank_naver_pc: rank,
        current_rank_naver_mo: rank,
        last_tracked_at: new Date().toISOString(),
      }).eq('id', kw.id);

      results.push({ keywordId: kw.id, keyword: kwText, rank, isExposed, postUrl, clientId: kw.client_id, searchPc: kw.monthly_search_pc || 0, searchMo: kw.monthly_search_mo || 0 });
    } catch (e) {
      failed++;
      process.stdout.write(`\r[${Math.round((i + 1) / total * 100)}%] ${i + 1}/${total} | ${kwText.padEnd(20).slice(0, 20)} | ERROR | 노출:${exposed} 미노출:${notExposed} 실패:${failed}`);
      results.push({ keywordId: kw.id, keyword: kwText, rank: null, isExposed: false, postUrl: null, clientId: kw.client_id, searchPc: kw.monthly_search_pc || 0, searchMo: kw.monthly_search_mo || 0 });
    }

    if (i < total - 1) await sleep(DELAY_MS);
  }

  console.log('\n');
  console.log('=== 수집 완료 ===');
  console.log('총:', total, '| 노출:', exposed, '| 미노출:', notExposed, '| 실패:', failed);
  console.log('');

  // ── keyword_visibility 배치 upsert ─────────────────
  console.log('keyword_visibility 업데이트 중...');
  const visRecords = results.map(r => ({
    client_id: r.clientId,
    keyword_id: r.keywordId,
    measured_at: today,
    rank_pc: r.rank,
    rank_mo: r.rank,
    visibility_score_pc: visibilityScore(r.rank),
    visibility_score_mo: visibilityScore(r.rank),
    search_volume_pc: r.searchPc,
    search_volume_mo: r.searchMo,
    is_exposed: r.isExposed,
  }));

  for (let i = 0; i < visRecords.length; i += 50) {
    await db.from('keyword_visibility').upsert(visRecords.slice(i, i + 50), { onConflict: 'keyword_id,measured_at' });
  }
  console.log('keyword_visibility:', visRecords.length, '건 upsert 완료');

  // ── daily_visibility_summary ───────────────────────
  console.log('daily_visibility_summary 재계산 중...');
  const clientIds = [...new Set(visRecords.map(r => r.client_id).filter(Boolean))];

  for (const cid of clientIds) {
    const cRecords = visRecords.filter(r => r.client_id === cid);
    const totalKw = cRecords.length;
    const exposedKw = cRecords.filter(r => r.is_exposed).length;
    const ranks = cRecords.map(r => r.rank_pc).filter(r => r !== null);

    const avgRank = ranks.length > 0 ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length * 100) / 100 : null;
    const top3 = ranks.filter(r => r <= 3).length;
    const top10 = ranks.filter(r => r <= 10).length;
    const exposureRate = totalKw > 0 ? Math.round(exposedKw / totalKw * 10000) / 100 : 0;

    const totalVolPc = cRecords.reduce((s, r) => s + r.search_volume_pc, 0);
    const totalVolMo = cRecords.reduce((s, r) => s + r.search_volume_mo, 0);

    const wVisPc = totalVolPc > 0
      ? Math.round(cRecords.reduce((s, r) => s + r.visibility_score_pc * r.search_volume_pc, 0) / totalVolPc * 100) / 100
      : totalKw > 0
        ? Math.round(cRecords.reduce((s, r) => s + r.visibility_score_pc, 0) / totalKw * 100) / 100
        : 0;
    const wVisMo = totalVolMo > 0
      ? Math.round(cRecords.reduce((s, r) => s + r.visibility_score_mo * r.search_volume_mo, 0) / totalVolMo * 100) / 100
      : totalKw > 0
        ? Math.round(cRecords.reduce((s, r) => s + r.visibility_score_mo, 0) / totalKw * 100) / 100
        : 0;

    await db.from('daily_visibility_summary').upsert({
      client_id: cid, measured_at: today, total_keywords: totalKw, exposed_keywords: exposedKw,
      exposure_rate: exposureRate, weighted_visibility_pc: wVisPc, weighted_visibility_mo: wVisMo,
      avg_rank_pc: avgRank, avg_rank_mo: avgRank, top3_count: top3, top10_count: top10,
    }, { onConflict: 'client_id,measured_at' });
  }
  console.log('daily_visibility_summary:', clientIds.length, '개 클라이언트 upsert 완료');
  console.log('');

  // ── AFTER STATS ────────────────────────────────────
  const allRanks = results.filter(r => r.rank !== null).map(r => r.rank);
  const after = {
    total,
    exposed,
    notExposed,
    failed,
    exposureRate: total > 0 ? Math.round(exposed / total * 10000) / 100 : 0,
    avgRank: allRanks.length > 0 ? Math.round(allRanks.reduce((a, b) => a + b, 0) / allRanks.length * 100) / 100 : null,
    top3: allRanks.filter(r => r <= 3).length,
    top10: allRanks.filter(r => r <= 10).length,
  };

  // summary from DB
  const { data: newSummary } = await db.from('daily_visibility_summary').select('*').eq('measured_at', today);
  const camfitSummary = newSummary?.find(s => s.client_id === 'd9af5297-de7c-4353-96ea-78ba0bb59f0c');

  console.log('=== BEFORE vs AFTER 비교 ===');
  console.log('');
  console.log('| 지표 | BEFORE (HTML) | AFTER (API) | 변화 |');
  console.log('|------|:-----:|:-----:|:----:|');
  console.log('| 노출률 | ' + before.exposureRate + '% | ' + after.exposureRate + '% | ' + (after.exposureRate - before.exposureRate > 0 ? '+' : '') + (after.exposureRate - before.exposureRate).toFixed(1) + 'pp |');
  console.log('| 평균순위 | ' + (before.avgRank || 'N/A') + '위 | ' + (after.avgRank || 'N/A') + '위 | ' + (before.avgRank && after.avgRank ? (after.avgRank > before.avgRank ? '+' : '') + (after.avgRank - before.avgRank).toFixed(1) : '-') + ' |');
  console.log('| TOP3 | ' + before.top3 + '개 | ' + after.top3 + '개 | ' + (after.top3 - before.top3 > 0 ? '+' : '') + (after.top3 - before.top3) + ' |');
  console.log('| TOP10 | ' + before.top10 + '개 | ' + after.top10 + '개 | ' + (after.top10 - before.top10 > 0 ? '+' : '') + (after.top10 - before.top10) + ' |');
  if (camfitSummary) {
    console.log('| 가중점유율PC | ' + (before.wVisPc || 'N/A') + '% | ' + camfitSummary.weighted_visibility_pc + '% | - |');
  }
  console.log('');

  // TOP 10 이내 키워드 목록
  const top10Keywords = results.filter(r => r.rank !== null && r.rank <= 10).sort((a, b) => a.rank - b.rank);
  console.log('=== TOP 10 이내 키워드 (' + top10Keywords.length + '개) ===');
  console.log('| # | 키워드 | 순위 | URL |');
  console.log('|---|--------|------|-----|');
  for (const r of top10Keywords) {
    const shortUrl = r.postUrl ? r.postUrl.replace('https://blog.naver.com/', '') : '-';
    console.log('| ' + r.rank + ' | ' + r.keyword + ' | ' + r.rank + '위 | ' + shortUrl + ' |');
  }

  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
