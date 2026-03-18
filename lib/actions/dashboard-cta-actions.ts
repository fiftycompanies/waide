"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { getCurrentUser, isClientRole } from "@/lib/auth";

/**
 * 대시보드 CTA: 무료 홈페이지 제작 신청
 * → consultation_requests INSERT (channel='homepage_request')
 * → Slack #alerts 알림
 */
export async function requestFreeHomepage(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user || !isClientRole(user.role)) {
      return { success: false, error: "권한이 없습니다." };
    }

    const db = createAdminClient();

    // 브랜드 정보 조회
    let brandName = "미지정";
    if (user.client_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: client } = await (db as any)
        .from("clients")
        .select("name")
        .eq("id", user.client_id)
        .single();
      if (client) brandName = client.name;
    }

    // 중복 신청 방지 (24시간 이내 동일 브랜드 동일 채널)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (db as any)
      .from("consultation_requests")
      .select("id")
      .eq("channel", "homepage_request")
      .eq("contact_email", user.email)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: "이미 신청이 접수되었습니다. 담당자가 곧 연락드립니다." };
    }

    // consultation_requests INSERT
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (db as any)
      .from("consultation_requests")
      .insert({
        contact_name: user.name || user.email.split("@")[0],
        contact_phone: user.phone || "",
        contact_email: user.email,
        channel: "homepage_request",
        interested_items: ["homepage_creation"],
        brand_name: brandName,
        message: "대시보드에서 무료 홈페이지 제작 신청",
        status: "pending",
        created_at: now,
        updated_at: now,
        last_activity_at: now,
      });

    if (insertError) {
      console.error("[dashboard-cta] homepage request insert error:", insertError);
      return { success: false, error: "신청 접수에 실패했습니다." };
    }

    // Slack #alerts 알림 (non-blocking)
    sendCtaSlackAlert({
      type: "homepage_request",
      brandName,
      contactName: user.name || user.email,
      contactPhone: user.phone || "",
      contactEmail: user.email,
    }).catch(() => {});

    return { success: true };
  } catch (err) {
    console.error("[dashboard-cta] requestFreeHomepage error:", err);
    return { success: false, error: "예상치 못한 오류가 발생했습니다." };
  }
}

/**
 * 대시보드 CTA: 전문 마케팅 상담 요청
 * → consultation_requests INSERT (channel='dashboard_cta')
 * → Slack #alerts 알림
 */
export async function requestMarketingConsultation(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user || !isClientRole(user.role)) {
      return { success: false, error: "권한이 없습니다." };
    }

    const db = createAdminClient();

    // 브랜드 정보 + 마케팅 점수 조회
    let brandName = "미지정";
    let marketingScore: number | null = null;
    if (user.client_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: client } = await (db as any)
        .from("clients")
        .select("name")
        .eq("id", user.client_id)
        .single();
      if (client) brandName = client.name;

      // 최신 분석 점수
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: analysis } = await (db as any)
        .from("brand_analyses")
        .select("marketing_score")
        .eq("client_id", user.client_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (analysis) marketingScore = analysis.marketing_score;
    }

    // 중복 신청 방지 (24시간 이내)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (db as any)
      .from("consultation_requests")
      .select("id")
      .eq("channel", "dashboard_cta")
      .eq("contact_email", user.email)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: "이미 상담이 신청되었습니다. 전문가가 곧 연락드립니다." };
    }

    // consultation_requests INSERT
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertPayload: Record<string, unknown> = {
      contact_name: user.name || user.email.split("@")[0],
      contact_phone: user.phone || "",
      contact_email: user.email,
      channel: "dashboard_cta",
      interested_items: ["marketing_consultation"],
      brand_name: brandName,
      message: "대시보드에서 전문 마케팅 상담 요청",
      status: "pending",
      created_at: now,
      updated_at: now,
      last_activity_at: now,
    };
    if (marketingScore !== null) {
      insertPayload.marketing_score = marketingScore;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (db as any)
      .from("consultation_requests")
      .insert(insertPayload);

    if (insertError) {
      console.error("[dashboard-cta] marketing consultation insert error:", insertError);
      return { success: false, error: "상담 신청에 실패했습니다." };
    }

    // Slack #alerts 알림 (non-blocking)
    sendCtaSlackAlert({
      type: "marketing_consultation",
      brandName,
      contactName: user.name || user.email,
      contactPhone: user.phone || "",
      contactEmail: user.email,
      marketingScore,
    }).catch(() => {});

    return { success: true };
  } catch (err) {
    console.error("[dashboard-cta] requestMarketingConsultation error:", err);
    return { success: false, error: "예상치 못한 오류가 발생했습니다." };
  }
}

// ── Slack 알림 헬퍼 ──────────────────────────────────────────────────────────

async function sendCtaSlackAlert(params: {
  type: "homepage_request" | "marketing_consultation";
  brandName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  marketingScore?: number | null;
}): Promise<void> {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) return;

  const alertsChannel = process.env.SLACK_ALERTS_CHANNEL || "#alerts";

  const emoji = params.type === "homepage_request" ? "🏠" : "💬";
  const label = params.type === "homepage_request" ? "홈페이지 제작 신청" : "마케팅 상담 요청";

  const lines = [
    `${emoji} *[${label}]*`,
    ``,
    `🏢 브랜드: ${params.brandName}`,
    `👤 이름: ${params.contactName}`,
    params.contactPhone ? `📞 전화: ${params.contactPhone}` : null,
    params.contactEmail ? `📧 이메일: ${params.contactEmail}` : null,
    params.marketingScore ? `📊 마케팅 점수: ${params.marketingScore}점` : null,
    ``,
    `📌 출처: 고객 대시보드 CTA`,
  ].filter(Boolean).join("\n");

  try {
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${slackToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: alertsChannel, text: lines }),
    });
  } catch {
    // Slack 실패해도 파이프라인 블로킹 금지
  }
}
