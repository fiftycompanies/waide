/**
 * GET /api/debug — 서버 환경 및 외부 연결 진단
 * 배포 후 삭제 예정
 */

import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      NSERP_EC2_URL: process.env.NSERP_EC2_URL ? "SET" : "NOT_SET",
      NSERP_EC2_URL_value: process.env.NSERP_EC2_URL ?? "undefined",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "SET" : "NOT_SET",
      NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID ? "SET" : "NOT_SET",
    },
  };

  // 1. iwinv 서버 health 체크
  const ec2Url = process.env.NSERP_EC2_URL;
  if (ec2Url) {
    try {
      const start = Date.now();
      const resp = await fetch(`${ec2Url}/health`, {
        signal: AbortSignal.timeout(10_000),
      });
      const elapsed = Date.now() - start;
      const body = await resp.text();
      results.iwinv_health = {
        status: resp.status,
        elapsed_ms: elapsed,
        body: body.slice(0, 200),
      };
    } catch (e) {
      results.iwinv_health = {
        error: String(e),
        message: "Vercel → iwinv 연결 실패 (방화벽 차단 가능성)",
      };
    }

    // 2. iwinv place-info 테스트
    try {
      const start = Date.now();
      const resp = await fetch(`${ec2Url}/api/place-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: "1048535417" }),
        signal: AbortSignal.timeout(30_000),
      });
      const elapsed = Date.now() - start;
      const data = await resp.json();
      results.iwinv_place = {
        status: resp.status,
        elapsed_ms: elapsed,
        name: data?.name ?? "N/A",
        category: data?.category ?? "N/A",
        reviews: data?.visitorReviewCount ?? "N/A",
      };
    } catch (e) {
      results.iwinv_place = {
        error: String(e),
      };
    }
  } else {
    results.iwinv_health = { error: "NSERP_EC2_URL not set" };
    results.iwinv_place = { error: "NSERP_EC2_URL not set" };
  }

  // 3. naver.me 리다이렉트 테스트
  try {
    const resp = await fetch("https://naver.me/5IgMYxVA", {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(10_000),
    });
    results.naver_me_redirect = {
      final_url: resp.url,
      status: resp.status,
      place_id_extracted: resp.url.match(/\/place\/(\d+)/)?.[1] ?? "NONE",
    };
  } catch (e) {
    results.naver_me_redirect = { error: String(e) };
  }

  // 4. 네이버 GraphQL 직접 테스트
  try {
    const start = Date.now();
    const resp = await fetch("https://pcmap-api.place.naver.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Origin: "https://m.place.naver.com",
        Referer: "https://m.place.naver.com/",
      },
      body: JSON.stringify({
        query: `{ restaurant(input: { id: "1048535417" }) { name category visitorReviewsTotal } }`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const elapsed = Date.now() - start;
    const body = await resp.text();
    results.naver_graphql = {
      status: resp.status,
      elapsed_ms: elapsed,
      body: body.slice(0, 300),
    };
  } catch (e) {
    results.naver_graphql = { error: String(e) };
  }

  return NextResponse.json(results, { status: 200 });
}
