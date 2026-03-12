#!/usr/bin/env node
/**
 * 키워드 검색량 일괄 조회 스크립트
 *
 * 고객사별 API 키 유무에 따라 자동 분기:
 *   - 네이버 광고 API (키 있을 때) → 1개씩 호출, 1초 딜레이
 *   - DataLab 트렌드 API (키 없을 때) → 5개씩 호출, 1초 딜레이
 *
 * 사용법:
 *   node scripts/bulk-search-volume.mjs                         # 전체 client
 *   node scripts/bulk-search-volume.mjs --client <clientId>     # 특정 client
 *   node scripts/bulk-search-volume.mjs --offset 100            # 100번째부터
 *   node scripts/bulk-search-volume.mjs --limit 50              # 50개만
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// ── 환경 설정 ───────────────────────────────────────────────
const dotenv = await import("dotenv");
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("SUPABASE_URL 또는 SUPABASE_SERVICE_KEY가 설정되지 않았습니다.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CLI 인자 파싱 ───────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

const targetClientId = getArg("client");
const offsetArg = parseInt(getArg("offset") || "0", 10);
const limitArg = parseInt(getArg("limit") || "0", 10);
const BATCH_DELAY = 1000;
const DAILY_LIMIT = 1000; // DataLab 일일 호출 한도

// ── 네이버 광고 API ─────────────────────────────────────────
function makeSignature(timestamp, secretKey) {
  const message = `${timestamp}.GET./keywordstool`;
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}

function parseVolume(val) {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    if (val === "< 10") return 5;
    const n = parseInt(val, 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

async function fetchNaverAdVolume(keyword, creds) {
  const timestamp = Date.now();
  const sig = makeSignature(timestamp, creds.secretKey);
  const clean = keyword.replace(/\s+/g, "");
  const params = new URLSearchParams({ hintKeywords: clean, showDetail: "1" });

  const res = await fetch(`https://api.naver.com/keywordstool?${params}`, {
    headers: {
      "X-Timestamp": String(timestamp),
      "X-API-KEY": creds.apiKey,
      "X-Customer": creds.customerId,
      "X-Signature": sig,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`광고API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const list = data.keywordList ?? [];
  const found = list.find((i) => i.relKeyword === clean) ?? list[0];
  if (!found) return null;

  return {
    pc: parseVolume(found.monthlyPcQcCnt),
    mo: parseVolume(found.monthlyMobileQcCnt),
  };
}

// ── DataLab 트렌드 API ──────────────────────────────────────
async function fetchDatalabTrend(keywords, factor = 1000) {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 미설정");
  }

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const body = {
    startDate: fmt(start),
    endDate: fmt(end),
    timeUnit: "month",
    keywordGroups: keywords.slice(0, 5).map((kw) => ({
      groupName: kw,
      keywords: [kw.replace(/\s+/g, "")],
    })),
  };

  const res = await fetch("https://openapi.naver.com/v1/datalab/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Naver-Client-Id": NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataLab ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.results ?? []).map((g) => {
    const ratio = g.data.length > 0 ? g.data[g.data.length - 1].ratio : 0;
    const total = Math.round((ratio * factor) / 100);
    const pc = Math.round(total * 0.2);
    return { keyword: g.title, pc, mo: total - pc, total };
  });
}

// ── 메인 실행 ───────────────────────────────────────────────
async function main() {
  console.log("=== 키워드 검색량 일괄 조회 ===\n");

  // 고객사 목록 조회
  let clientQuery = db.from("clients").select("id, name, naver_ad_api_key, naver_ad_secret_key, naver_ad_customer_id").eq("is_active", true);
  if (targetClientId) clientQuery = clientQuery.eq("id", targetClientId);

  const { data: clients, error: clientErr } = await clientQuery;
  if (clientErr) { console.error("clients 조회 실패:", clientErr.message); process.exit(1); }
  if (!clients?.length) { console.log("활성 고객사가 없습니다."); return; }

  let totalUpdated = 0;
  let totalFailed = 0;
  let datalabCalls = 0;

  for (const client of clients) {
    const hasCreds = client.naver_ad_api_key && client.naver_ad_secret_key && client.naver_ad_customer_id;
    const source = hasCreds ? "naver_ad" : "datalab";
    const creds = hasCreds
      ? { apiKey: client.naver_ad_api_key, secretKey: client.naver_ad_secret_key, customerId: client.naver_ad_customer_id }
      : null;

    console.log(`\n[${client.name}] 데이터 소스: ${source === "naver_ad" ? "광고API" : "DataLab"}`);

    // 키워드 조회
    let kwQuery = db
      .from("keywords")
      .select("id, keyword")
      .eq("client_id", client.id)
      .neq("status", "archived")
      .order("created_at", { ascending: true });

    if (offsetArg > 0 || limitArg > 0) {
      const start = offsetArg;
      const end = limitArg > 0 ? start + limitArg - 1 : start + 999;
      kwQuery = kwQuery.range(start, end);
    }

    const { data: keywords } = await kwQuery;
    if (!keywords?.length) { console.log("  키워드 없음, 건너뜀"); continue; }

    console.log(`  키워드 ${keywords.length}개 처리 시작...`);

    if (creds) {
      // ── 광고 API: 1개씩 호출 ──
      for (let i = 0; i < keywords.length; i++) {
        const kw = keywords[i];
        try {
          const vol = await fetchNaverAdVolume(kw.keyword, creds);
          if (vol) {
            await db.from("keywords").update({
              monthly_search_pc: vol.pc,
              monthly_search_mo: vol.mo,
              monthly_search_total: vol.pc + vol.mo,
              search_volume_source: "naver_ad",
            }).eq("id", kw.id);
            totalUpdated++;
            process.stdout.write(`\r  [광고API] ${i + 1}/${keywords.length} — ${kw.keyword}: PC ${vol.pc}, MO ${vol.mo}`);
          } else {
            totalFailed++;
            process.stdout.write(`\r  [광고API] ${i + 1}/${keywords.length} — ${kw.keyword}: 데이터 없음`);
          }
        } catch (err) {
          totalFailed++;
          process.stdout.write(`\r  [광고API] ${i + 1}/${keywords.length} — ${kw.keyword}: 실패`);
        }
        if (i < keywords.length - 1) await new Promise((r) => setTimeout(r, BATCH_DELAY));
      }
    } else {
      // ── DataLab: 5개씩 배치 ──
      for (let i = 0; i < keywords.length; i += 5) {
        // 일일 한도 체크
        if (datalabCalls >= DAILY_LIMIT) {
          console.log(`\n\n  [경고] DataLab 일일 호출 한도 (${DAILY_LIMIT}회) 도달.`);
          console.log(`  다음 실행 시 --offset ${offsetArg + i} 로 이어서 처리하세요.`);
          break;
        }

        const batch = keywords.slice(i, i + 5);
        try {
          const trends = await fetchDatalabTrend(batch.map((k) => k.keyword));
          datalabCalls++;

          for (const kw of batch) {
            const found = trends.find((t) => t.keyword === kw.keyword);
            if (found) {
              await db.from("keywords").update({
                monthly_search_pc: found.pc,
                monthly_search_mo: found.mo,
                monthly_search_total: found.total,
                search_volume_source: "datalab",
              }).eq("id", kw.id);
              totalUpdated++;
            } else {
              totalFailed++;
            }
          }
          process.stdout.write(`\r  [DataLab] ${Math.min(i + 5, keywords.length)}/${keywords.length} — 배치 ${Math.floor(i / 5) + 1}`);
        } catch (err) {
          totalFailed += batch.length;
          process.stdout.write(`\r  [DataLab] ${Math.min(i + 5, keywords.length)}/${keywords.length} — 배치 실패`);
        }
        if (i + 5 < keywords.length) await new Promise((r) => setTimeout(r, BATCH_DELAY));
      }
    }
    console.log(""); // 줄바꿈
  }

  console.log("\n=== 완료 ===");
  console.log(`  성공: ${totalUpdated}건`);
  console.log(`  실패: ${totalFailed}건`);
  if (datalabCalls > 0) console.log(`  DataLab 호출 횟수: ${datalabCalls}회 / ${DAILY_LIMIT}회 한도`);
}

main().catch((err) => {
  console.error("\n치명적 오류:", err.message);
  process.exit(1);
});
