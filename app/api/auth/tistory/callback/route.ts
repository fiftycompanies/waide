/**
 * Tistory OAuth 콜백
 * GET /api/auth/tistory/callback?code=XXX&state=CLIENT_ID
 *
 * 플로우:
 * 1. code → access_token 교환
 * 2. 블로그 정보 조회
 * 3. blog_accounts INSERT
 * 4. 블로그 계정 페이지로 리다이렉트
 */

import { NextRequest, NextResponse } from "next/server";
import { getTistoryBlogInfo, saveTistoryAccount } from "@/lib/publishers/tistory-publisher";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // clientId

  if (!code) {
    return NextResponse.redirect(
      new URL("/blog-accounts?error=tistory_no_code", request.url)
    );
  }

  // state에 `:portal` 접미사가 있으면 포털에서 온 요청
  const isPortal = state?.endsWith(":portal") ?? false;
  const clientId = isPortal ? state!.replace(/:portal$/, "") : state;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/blog-accounts?error=tistory_no_client", request.url)
    );
  }

  const tistoryClientId = process.env.TISTORY_CLIENT_ID;
  const tistoryClientSecret = process.env.TISTORY_CLIENT_SECRET;
  const tistoryRedirectUri = process.env.TISTORY_REDIRECT_URI;

  if (!tistoryClientId || !tistoryClientSecret || !tistoryRedirectUri) {
    return NextResponse.redirect(
      new URL("/blog-accounts?error=tistory_not_configured", request.url)
    );
  }

  try {
    // 1. code → access_token 교환
    const tokenParams = new URLSearchParams({
      client_id: tistoryClientId,
      client_secret: tistoryClientSecret,
      redirect_uri: tistoryRedirectUri,
      code,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch(
      `https://www.tistory.com/oauth/access_token?${tokenParams.toString()}`
    );
    const tokenText = await tokenRes.text();

    // Tistory returns access_token=XXX format
    let accessToken: string | null = null;
    if (tokenText.includes("access_token=")) {
      const params = new URLSearchParams(tokenText);
      accessToken = params.get("access_token");
    } else {
      // JSON 형태일 수도 있음
      try {
        const tokenData = JSON.parse(tokenText);
        accessToken = tokenData.access_token;
      } catch {
        // 파싱 실패
      }
    }

    if (!accessToken) {
      return NextResponse.redirect(
        new URL("/blog-accounts?error=tistory_token_failed", request.url)
      );
    }

    // 2. 블로그 정보 조회
    const blogInfo = await getTistoryBlogInfo(accessToken);
    if (!blogInfo.success || !blogInfo.blogName) {
      return NextResponse.redirect(
        new URL("/blog-accounts?error=tistory_blog_info_failed", request.url)
      );
    }

    // 3. blog_accounts INSERT
    const saveResult = await saveTistoryAccount({
      clientId,
      accessToken,
      blogName: blogInfo.blogName,
      blogUrl: blogInfo.blogUrl || `https://${blogInfo.blogName}.tistory.com`,
    });

    if (!saveResult.success) {
      return NextResponse.redirect(
        new URL(`/blog-accounts?error=tistory_save_failed&msg=${encodeURIComponent(saveResult.error || "")}`, request.url)
      );
    }

    // 4. 성공 → 포털이면 /portal/blog, 아니면 기존 /blog-accounts로 리다이렉트
    const successRedirect = isPortal
      ? "/portal/blog?success=tistory_connected"
      : "/blog-accounts?success=tistory_connected";
    return NextResponse.redirect(
      new URL(successRedirect, request.url)
    );
  } catch (error) {
    console.error("[tistory-oauth] 콜백 처리 실패:", error);
    return NextResponse.redirect(
      new URL("/blog-accounts?error=tistory_callback_error", request.url)
    );
  }
}
