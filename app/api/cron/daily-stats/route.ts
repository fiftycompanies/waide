/**
 * 일일 통계 수집 크론 — place_stats_history + mention_count + place_rank
 *
 * 스케줄: 매일 새벽 4시 (SERP 크론 이후)
 * 동작:
 *   1. active client의 place_stats_history UPSERT (VPS에서 리뷰수/저장수)
 *   2. 활성 키워드별 mention_count 수집 (네이버/구글 상위 20건)
 *   3. is_primary 키워드의 place_rank 수집
 *   4. keyword_visibility 업데이트
 *   5. 30일 초과 place_stats_history 정리
 */

import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/scheduler";
import { createAdminClient } from "@/lib/supabase/service";
import {
  collectMentionCount,
  buildTargetPatterns,
} from "@/lib/mention-count-collector";
import { findPlaceRank } from "@/lib/place-rank-collector";

export const maxDuration = 300; // 5분
export const dynamic = "force-dynamic";

const VPS_URL = process.env.VPS_URL || "http://115.68.231.90:8000";
const VPS_SECRET = process.env.VPS_SECRET || "";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const stats = {
    place_stats_saved: 0,
    mention_count_updated: 0,
    place_rank_updated: 0,
    errors: [] as string[],
  };

  try {
    // ── 1. Active clients 조회 ─────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: clients } = await (db as any)
      .from("clients")
      .select("id, name, website_url")
      .eq("is_active", true);

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, stats, message: "No active clients" });
    }

    // ── 2. place_stats_history 저장 ────────────────────────
    for (const client of clients) {
      try {
        // brand_analyses에서 place_id 조회
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: analysis } = await (db as any)
          .from("brand_analyses")
          .select("place_id, basic_info")
          .eq("client_id", client.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (analysis?.place_id) {
          // VPS에서 플레이스 데이터 수집
          try {
            const vpsResp = await fetch(`${VPS_URL}/api/place-info`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                placeId: analysis.place_id,
                secret: VPS_SECRET,
              }),
              signal: AbortSignal.timeout(15000),
            });

            if (vpsResp.ok) {
              const placeData = await vpsResp.json();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (db as any).from("place_stats_history").upsert(
                {
                  client_id: client.id,
                  measured_at: today,
                  visitor_review_count: placeData.visitorReviewCount ?? null,
                  blog_review_count: placeData.blogReviewCount ?? null,
                  bookmark_count: placeData.bookmarkCount ?? null,
                },
                { onConflict: "client_id,measured_at" },
              );
              stats.place_stats_saved++;
            }
          } catch (vpsErr) {
            console.warn(`[daily-stats] VPS call failed for ${client.name}:`, vpsErr);
          }
        }
      } catch (err) {
        console.warn(`[daily-stats] place_stats error for ${client.name}:`, err);
      }

      await sleep(500);
    }

    // ── 3. mention_count + place_rank 수집 ─────────────────
    // 클라이언트별 블로그 계정 + 키워드 조회
    for (const client of clients) {
      try {
        // 블로그 계정 URL 조회
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: blogAccounts } = await (db as any)
          .from("blog_accounts")
          .select("blog_url, account_name, platform")
          .eq("client_id", client.id)
          .eq("is_active", true);

        const blogUrls = (blogAccounts || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any) => a.blog_url || (a.platform === "naver" ? `https://blog.naver.com/${a.account_name}` : null),
        ).filter(Boolean);

        const targetPatterns = buildTargetPatterns(blogUrls, client.website_url);
        if (targetPatterns.length === 0) continue;

        // 활성 키워드 조회
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: keywords } = await (db as any)
          .from("keywords")
          .select("id, keyword, is_primary")
          .eq("client_id", client.id)
          .eq("status", "active");

        if (!keywords || keywords.length === 0) continue;

        // place_rank용 client 정보
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: analysis } = await (db as any)
          .from("brand_analyses")
          .select("basic_info")
          .eq("client_id", client.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const placeName = analysis?.basic_info?.name || client.name || "";
        const placeAddress = analysis?.basic_info?.roadAddress || analysis?.basic_info?.address || "";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const kw of keywords as any[]) {
          try {
            // mention_count 수집
            const mentionResult = await collectMentionCount(kw.keyword, targetPatterns);

            // place_rank 수집 (is_primary 키워드만 - API 부하 최소화)
            let placeRank: number | null = null;
            if (kw.is_primary && placeName) {
              placeRank = await findPlaceRank(kw.keyword, placeName, placeAddress);
              stats.place_rank_updated++;
            }

            // keyword_visibility 업데이트 (기존 레코드에 신규 필드 추가)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: existing } = await (db as any)
              .from("keyword_visibility")
              .select("id")
              .eq("keyword_id", kw.id)
              .eq("measured_at", today)
              .single();

            if (existing) {
              // 기존 레코드 업데이트
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (db as any)
                .from("keyword_visibility")
                .update({
                  naver_mention_count: mentionResult.naver_mention_count,
                  google_mention_count: mentionResult.google_mention_count,
                  ...(placeRank !== null ? { place_rank_pc: placeRank, place_rank_mo: placeRank } : {}),
                })
                .eq("id", existing.id);
            } else {
              // SERP 크론이 아직 안 돌았으면 신규 레코드 생성
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (db as any).from("keyword_visibility").upsert(
                {
                  client_id: client.id,
                  keyword_id: kw.id,
                  measured_at: today,
                  naver_mention_count: mentionResult.naver_mention_count,
                  google_mention_count: mentionResult.google_mention_count,
                  ...(placeRank !== null ? { place_rank_pc: placeRank, place_rank_mo: placeRank } : {}),
                  is_exposed: false,
                },
                { onConflict: "keyword_id,measured_at" },
              );
            }

            stats.mention_count_updated++;
            await sleep(1200); // API rate limit
          } catch (kwErr) {
            const msg = `[daily-stats] keyword error ${kw.keyword}: ${kwErr}`;
            console.warn(msg);
            stats.errors.push(msg);
          }
        }
      } catch (clientErr) {
        const msg = `[daily-stats] client error ${client.name}: ${clientErr}`;
        console.warn(msg);
        stats.errors.push(msg);
      }
    }

    // ── 4. 30일 초과 place_stats_history 정리 ──────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("place_stats_history")
      .delete()
      .lt("measured_at", thirtyDaysAgo.toISOString().split("T")[0]);

  } catch (err) {
    console.error("[daily-stats] Fatal error:", err);
    stats.errors.push(String(err));
  }

  return NextResponse.json({ success: true, stats });
}

export async function GET(request: Request) {
  return POST(request);
}
