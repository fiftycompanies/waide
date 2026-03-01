import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { MonthlyReportData, ContentTrendItem } from "@/lib/actions/report-actions";

// ── 한글 폰트 등록 ──────────────────────────────────────────────────────

Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: process.cwd() + "/public/fonts/NotoSansKR-Regular.ttf", fontWeight: 400 },
    { src: process.cwd() + "/public/fonts/NotoSansKR-Bold.ttf", fontWeight: 700 },
  ],
});

// ── 스타일 ────────────────────────────────────────────────────────────

const colors = {
  primary: "#10b981",
  primaryDark: "#059669",
  text: "#1f2937",
  textMuted: "#6b7280",
  textLight: "#9ca3af",
  border: "#e5e7eb",
  bg: "#f9fafb",
  white: "#ffffff",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  amber: "#f59e0b",
  red: "#ef4444",
};

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "NotoSansKR",
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.white,
  },
  // ── 제목 ──
  title: { fontSize: 22, fontWeight: 700, color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 2 },
  dateText: { fontSize: 9, color: colors.textLight, marginBottom: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  // ── KPI 그리드 ──
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  kpiCard: {
    width: "31%",
    padding: 10,
    borderRadius: 6,
    border: `1 solid ${colors.border}`,
    backgroundColor: colors.bg,
    alignItems: "center",
  },
  kpiLabel: { fontSize: 8, color: colors.textMuted, marginBottom: 4, textAlign: "center" },
  kpiValue: { fontSize: 18, fontWeight: 700, color: colors.text, textAlign: "center" },
  kpiChange: { fontSize: 7, marginTop: 2, textAlign: "center" },
  // ── 섹션 ──
  sectionTitle: { fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 10, marginTop: 8 },
  // ── 테이블 ──
  table: { borderRadius: 4, border: `1 solid ${colors.border}`, overflow: "hidden" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.bg,
    borderBottom: `1 solid ${colors.border}`,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: `1 solid ${colors.border}`,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  th: { fontSize: 8, fontWeight: 700, color: colors.textMuted },
  td: { fontSize: 9, color: colors.text },
  // ── 차트 (SVG 바) ──
  chartContainer: { marginVertical: 8 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  barLabel: { width: 40, fontSize: 8, color: colors.textMuted, textAlign: "right", marginRight: 6 },
  barTrack: { flex: 1, height: 14, backgroundColor: colors.bg, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 14, borderRadius: 3 },
  barValue: { width: 24, fontSize: 8, color: colors.text, textAlign: "left", marginLeft: 4 },
  // ── 푸터 ──
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: `1 solid ${colors.border}`,
    paddingTop: 8,
  },
  footerText: { fontSize: 8, color: colors.textLight },
  // ── 상태 배지 ──
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 7 },
  // ── 다음 달 계획 ──
  planCard: {
    padding: 16,
    borderRadius: 6,
    border: `1 solid ${colors.border}`,
    backgroundColor: colors.bg,
    marginBottom: 12,
  },
  planValue: { fontSize: 22, fontWeight: 700, color: colors.primary, textAlign: "center", marginBottom: 2 },
  planLabel: { fontSize: 9, color: colors.textMuted, textAlign: "center" },
});

// ── 헬퍼 ────────────────────────────────────────────────────────────

function formatChange(current: number, prev: number): { text: string; color: string } {
  const diff = current - prev;
  if (diff === 0) return { text: "-", color: colors.textLight };
  return {
    text: `${diff > 0 ? "+" : ""}${diff}`,
    color: diff > 0 ? colors.primary : colors.red,
  };
}

function formatRank(rank: number | null): string {
  return rank != null ? `${rank}위` : "-";
}

function rankColor(rank: number | null): string {
  if (rank == null) return colors.textLight;
  if (rank <= 3) return colors.primary;
  if (rank <= 10) return colors.blue;
  if (rank <= 20) return colors.amber;
  return colors.textLight;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "작성중",
    review: "검토중",
    approved: "승인",
    published: "발행",
    rejected: "반려",
  };
  return map[status] || status;
}

// ── 푸터 컴포넌트 ────────────────────────────────────────────────────

function Footer({ brandName, pageNum }: { brandName: string; pageNum: number }) {
  return (
    <View style={s.footer}>
      <Text style={[s.footerText, { fontWeight: 700, color: colors.primary }]}>Waide</Text>
      <Text style={s.footerText}>{brandName}</Text>
      <Text style={s.footerText}>{pageNum}</Text>
    </View>
  );
}

// ── 바 차트 ────────────────────────────────────────────────────────────

function BarChartSection({ data, maxVal }: { data: ContentTrendItem[]; maxVal: number }) {
  const effectiveMax = maxVal > 0 ? maxVal : 1;
  return (
    <View style={s.chartContainer}>
      {data.map((item) => {
        const [, m] = item.month.split("-");
        const pct = (item.count / effectiveMax) * 100;
        return (
          <View key={item.month} style={s.barRow}>
            <Text style={s.barLabel}>{parseInt(m)}월</Text>
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: colors.purple }]} />
            </View>
            <Text style={s.barValue}>{item.count}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── 메인 문서 ──────────────────────────────────────────────────────────

export function MonthlyReportDocument({ data }: { data: MonthlyReportData }) {
  const { kpi, contentsTrend, contents, rankings, brandName, reportMonth, generatedAt } = data;
  const maxTrend = Math.max(...contentsTrend.map((c) => c.count), 1);

  return (
    <Document>
      {/* ── Page 1: 제목 + KPI ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{reportMonth} 마케팅 리포트</Text>
        <Text style={s.subtitle}>{brandName}</Text>
        <Text style={s.dateText}>생성일: {generatedAt}</Text>
        <View style={s.divider} />

        <Text style={s.sectionTitle}>핵심 성과 지표 (KPI)</Text>
        <View style={s.kpiGrid}>
          {/* 활성 키워드 */}
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>활성 키워드</Text>
            <Text style={s.kpiValue}>{kpi.activeKeywords}</Text>
            <Text style={[s.kpiChange, { color: formatChange(kpi.activeKeywords, kpi.prevActiveKeywords).color }]}>
              전월 대비 {formatChange(kpi.activeKeywords, kpi.prevActiveKeywords).text}
            </Text>
          </View>

          {/* 발행 콘텐츠 */}
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>이번 달 콘텐츠</Text>
            <Text style={s.kpiValue}>{kpi.monthlyContents}</Text>
            <Text style={[s.kpiChange, { color: formatChange(kpi.monthlyContents, kpi.prevMonthlyContents).color }]}>
              전월 대비 {formatChange(kpi.monthlyContents, kpi.prevMonthlyContents).text}
            </Text>
          </View>

          {/* 평균 QC */}
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>평균 QC 점수</Text>
            <Text style={s.kpiValue}>{kpi.avgQcScore ?? "-"}</Text>
            {kpi.avgQcScore != null && kpi.prevAvgQcScore != null && (
              <Text style={[s.kpiChange, { color: formatChange(kpi.avgQcScore, kpi.prevAvgQcScore).color }]}>
                전월 대비 {formatChange(kpi.avgQcScore, kpi.prevAvgQcScore).text}
              </Text>
            )}
          </View>

          {/* 노출 키워드 */}
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>노출 키워드</Text>
            <Text style={s.kpiValue}>{kpi.exposedKeywords}</Text>
          </View>

          {/* 평균 순위 */}
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>평균 순위</Text>
            <Text style={s.kpiValue}>{kpi.avgRank != null ? `${kpi.avgRank}위` : "-"}</Text>
          </View>

          {/* TOP3 */}
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>TOP3 키워드</Text>
            <Text style={s.kpiValue}>{kpi.top3Keywords}</Text>
          </View>
        </View>

        <Footer brandName={brandName} pageNum={1} />
      </Page>

      {/* ── Page 2: 콘텐츠 발행 현황 ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>콘텐츠 발행 추이 (최근 6개월)</Text>
        <BarChartSection data={contentsTrend} maxVal={maxTrend} />

        <View style={s.divider} />

        <Text style={s.sectionTitle}>이번 달 발행 콘텐츠</Text>
        {contents.length === 0 ? (
          <Text style={{ fontSize: 9, color: colors.textLight, textAlign: "center", marginVertical: 20 }}>
            이번 달 발행된 콘텐츠가 없습니다
          </Text>
        ) : (
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 3 }]}>키워드</Text>
              <Text style={[s.th, { flex: 1, textAlign: "center" }]}>상태</Text>
              <Text style={[s.th, { flex: 1, textAlign: "center" }]}>QC</Text>
            </View>
            {contents.slice(0, 15).map((c) => (
              <View key={c.id} style={s.tableRow}>
                <Text style={[s.td, { flex: 3 }]}>{c.keyword || c.title || "-"}</Text>
                <Text style={[s.td, { flex: 1, textAlign: "center" }]}>{statusLabel(c.publish_status)}</Text>
                <Text style={[s.td, { flex: 1, textAlign: "center", color: c.qc_score != null && c.qc_score >= 70 ? colors.primary : colors.textLight }]}>
                  {c.qc_score ?? "-"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Footer brandName={brandName} pageNum={2} />
      </Page>

      {/* ── Page 3: 키워드 순위 현황 ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>키워드 순위 현황</Text>
        {rankings.length === 0 ? (
          <View style={{ alignItems: "center", marginVertical: 40 }}>
            <Text style={{ fontSize: 10, color: colors.textLight }}>
              순위 추적이 시작되면 여기에 표시됩니다
            </Text>
          </View>
        ) : (
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 3 }]}>키워드</Text>
              <Text style={[s.th, { flex: 1, textAlign: "center" }]}>네이버</Text>
              <Text style={[s.th, { flex: 1, textAlign: "center" }]}>구글</Text>
            </View>
            {rankings.map((r, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={[s.td, { flex: 3 }]}>{r.keyword}</Text>
                <Text style={[s.td, { flex: 1, textAlign: "center", fontWeight: 700, color: rankColor(r.rank_naver) }]}>
                  {formatRank(r.rank_naver)}
                </Text>
                <Text style={[s.td, { flex: 1, textAlign: "center", fontWeight: 700, color: rankColor(r.rank_google) }]}>
                  {formatRank(r.rank_google)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Footer brandName={brandName} pageNum={3} />
      </Page>

      {/* ── Page 4: 다음 달 계획 ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>다음 달 계획</Text>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          <View style={[s.planCard, { flex: 1 }]}>
            <Text style={s.planValue}>{data.suggestedKeywordsCount}</Text>
            <Text style={s.planLabel}>AI 추천 키워드 대기</Text>
          </View>
          <View style={[s.planCard, { flex: 1 }]}>
            <Text style={s.planValue}>{data.pendingContentsCount}</Text>
            <Text style={s.planLabel}>예정 콘텐츠</Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={{ padding: 20, backgroundColor: colors.bg, borderRadius: 6, marginTop: 10 }}>
          <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.6 }}>
            Waide AI가 매달 최적의 키워드와 콘텐츠를 자동으로 분석하고 생성합니다.{"\n"}
            포털에 로그인하여 AI가 추천한 키워드를 승인하고 콘텐츠 발행 현황을 확인하세요.{"\n\n"}
            문의사항이 있으시면 담당자에게 연락해 주세요.
          </Text>
        </View>

        <View style={{ marginTop: 40, alignItems: "center" }}>
          <Text style={{ fontSize: 12, fontWeight: 700, color: colors.primary }}>Waide</Text>
          <Text style={{ fontSize: 8, color: colors.textLight, marginTop: 4 }}>AI Hospitality Aide</Text>
        </View>

        <Footer brandName={brandName} pageNum={4} />
      </Page>
    </Document>
  );
}
