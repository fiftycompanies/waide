/**
 * POST /api/consultation — 상담 신청
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { analysisId, salesRef, contactName, contactPhone, contactEmail, message } = body;

    if (!analysisId || !contactName || !contactPhone) {
      return NextResponse.json(
        { error: "analysisId, contactName, contactPhone are required" },
        { status: 400 }
      );
    }

    const db = createAdminClient();

    // salesRef가 body에 없으면 brand_analyses에서 가져오기
    let effectiveRef = salesRef || null;

    // 분석 결과에서 매장명, 점수, sales_ref 조회
    const { data: analysis } = await db
      .from("brand_analyses")
      .select("basic_info, marketing_score, sales_ref")
      .eq("id", analysisId)
      .single();

    if (!effectiveRef && analysis?.sales_ref) {
      effectiveRef = analysis.sales_ref;
    }

    const placeName = analysis?.basic_info?.name ?? "알 수 없음";
    const score = analysis?.marketing_score ?? "N/A";

    // 상담 신청 INSERT
    const { data, error } = await db
      .from("consultation_requests")
      .insert({
        analysis_id: analysisId,
        sales_ref: effectiveRef,
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail || null,
        message: message || null,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // CRM 자동 연동: brand_analyses 연락처 + 상태 + 시스템 노트 업데이트
    try {
      // 기존 notes 가져오기
      const { data: existing } = await db
        .from("brand_analyses")
        .select("notes, lead_status")
        .eq("id", analysisId)
        .single();

      const currentNotes = Array.isArray(existing?.notes) ? existing.notes : [];
      const systemNote = {
        id: crypto.randomUUID(),
        author: "시스템",
        text: `상담 신청 접수 — ${contactName} (${contactPhone})${message ? `: ${message}` : ""}`,
        created_at: new Date().toISOString(),
      };

      const crmUpdate: Record<string, unknown> = {
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail || null,
        notes: [systemNote, ...currentNotes],
        last_activity_at: new Date().toISOString(),
      };

      // lead_status가 'new'이면 'contacted'로 자동 승격
      if (existing?.lead_status === "new") {
        crmUpdate.lead_status = "contacted";
      }

      await db.from("brand_analyses").update(crmUpdate).eq("id", analysisId);
    } catch {
      // CRM 연동 실패해도 상담 신청 자체는 성공
    }

    // Slack 알림 + 영업사원 카운터 (non-blocking)
    try {
      const slackToken = process.env.SLACK_BOT_TOKEN;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://waide.co.kr";
      const resultUrl = `${baseUrl}/analysis/${analysisId}`;

      // 영업사원 이름 조회 + 카운터 증가
      let agentName = "";
      let agentSlackId = "";

      if (effectiveRef) {
        const { data: agent } = await db
          .from("sales_agents")
          .select("id, name, slack_user_id, total_consultations")
          .eq("ref_code", effectiveRef)
          .eq("is_active", true)
          .single();

        if (agent) {
          agentName = agent.name;
          agentSlackId = agent.slack_user_id ?? "";
          // 카운터 증가
          await db.from("sales_agents").update({
            total_consultations: (agent.total_consultations ?? 0) + 1,
            updated_at: new Date().toISOString(),
          }).eq("id", agent.id);
        }
      }

      if (slackToken) {
        const slackMsg = [
          `🔥 *[상담 신청] 전환 기회!*`,
          ``,
          `📍 매장: ${placeName} (마케팅 점수: ${score})`,
          `👤 이름: ${contactName}`,
          `📞 전화: ${contactPhone}`,
          contactEmail ? `📧 이메일: ${contactEmail}` : null,
          message ? `💬 문의: "${message}"` : null,
          ``,
          agentName ? `🎯 담당 영업사원: ${agentName} (${effectiveRef})` : null,
          `👉 분석 결과: ${resultUrl}`,
        ].filter(Boolean).join("\n");

        // 영업사원 DM
        if (agentSlackId) {
          await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${slackToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ channel: agentSlackId, text: slackMsg }),
          }).catch(() => {});
        }

        // alerts 채널에도 항상 전송
        const alertsChannel = process.env.SLACK_ALERTS_CHANNEL || "#alerts";
        await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${slackToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ channel: alertsChannel, text: slackMsg }),
        }).catch(() => {});
      }
    } catch {
      // Slack 실패해도 파이프라인 블로킹 금지
    }

    return NextResponse.json({ id: data.id, success: true });
  } catch (err) {
    console.error("POST /api/consultation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
