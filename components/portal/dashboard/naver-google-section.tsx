"use client";

import { useState } from "react";
import Link from "next/link";
import { PenLine, Settings } from "lucide-react";
import PlaceRankCard from "./place-rank-card";
import StatCard from "./stat-card";
import KeywordFilter from "./keyword-filter";
import ExposureTable from "./exposure-table";

interface Keyword {
  id: string;
  keyword: string;
  is_primary: boolean;
}

interface PlaceRank {
  place_rank_pc: number | null;
  place_rank_mo: number | null;
  measured_at: string;
}

interface PlaceHistory {
  measured_at: string;
  visitor_review_count: number | null;
  blog_review_count: number | null;
  bookmark_count: number | null;
}

interface VisibilityData {
  keyword_id: string;
  rank_pc: number | null;
  rank_mo: number | null;
  rank_google: number | null;
  naver_mention_count: number;
  google_mention_count: number;
  measured_at: string;
}

interface Props {
  keywords: Keyword[];
  primaryKeyword: Keyword | null;
  placeRank: PlaceRank | null;
  placeHistory: PlaceHistory[];
  visibilityByKeyword: VisibilityData[];
  brandName: string;
}

export default function NaverGoogleSection({
  keywords,
  primaryKeyword,
  placeRank,
  placeHistory,
  visibilityByKeyword,
  brandName,
}: Props) {
  const [selectedKwId, setSelectedKwId] = useState<string | null>(null);

  // Build keyword id → name map
  const kwMap = Object.fromEntries(keywords.map((k) => [k.id, k.keyword]));

  // Place stats for StatCards (oldest-first array)
  const latest =
    placeHistory.length > 0 ? placeHistory[placeHistory.length - 1] : null;
  const previous =
    placeHistory.length > 1 ? placeHistory[placeHistory.length - 2] : null;

  // History for mini charts (last 15 days)
  const last15 = placeHistory.slice(-15);

  const reviewHistory = last15.map((p) => ({
    date: p.measured_at,
    value: p.visitor_review_count,
  }));
  const blogHistory = last15.map((p) => ({
    date: p.measured_at,
    value: p.blog_review_count,
  }));
  const bookmarkHistory = last15.map((p) => ({
    date: p.measured_at,
    value: p.bookmark_count,
  }));

  // Full 30 days for modal
  const reviewFull = placeHistory.map((p) => ({
    date: p.measured_at,
    value: p.visitor_review_count,
  }));
  const blogFull = placeHistory.map((p) => ({
    date: p.measured_at,
    value: p.blog_review_count,
  }));
  const bookmarkFull = placeHistory.map((p) => ({
    date: p.measured_at,
    value: p.bookmark_count,
  }));

  // Filter visibility data by selected keyword
  const filteredVisibility = selectedKwId
    ? visibilityByKeyword.filter((v) => v.keyword_id === selectedKwId)
    : visibilityByKeyword;

  // Build rows for exposure tables
  const naverRows = filteredVisibility.map((v) => ({
    keyword_id: v.keyword_id,
    keyword: kwMap[v.keyword_id] || "-",
    rank: v.rank_pc,
    mentionCount: v.naver_mention_count ?? 0,
  }));

  const googleRows = filteredVisibility.map((v) => ({
    keyword_id: v.keyword_id,
    keyword: kwMap[v.keyword_id] || "-",
    rank: v.rank_google,
    mentionCount: v.google_mention_count ?? 0,
  }));

  // Last collected date
  const lastCollected =
    visibilityByKeyword.length > 0
      ? visibilityByKeyword.reduce(
          (max, v) => (v.measured_at > max ? v.measured_at : max),
          visibilityByKeyword[0].measured_at,
        )
      : placeHistory.length > 0
        ? placeHistory[placeHistory.length - 1].measured_at
        : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            {brandName} 현황
          </h2>
          {lastCollected && (
            <p className="text-[10px] text-gray-400">
              마지막 수집: {lastCollected}
            </p>
          )}
        </div>
        <Link
          href="/portal/blog/write"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-medium hover:from-violet-700 hover:to-purple-700 transition-colors shadow-sm"
        >
          <PenLine className="h-3.5 w-3.5" />
          블로그 발행
        </Link>
      </div>

      {/* Keyword Filter */}
      {keywords.length > 0 && (
        <KeywordFilter
          keywords={keywords}
          selectedId={selectedKwId}
          onSelect={setSelectedKwId}
        />
      )}

      {/* ── Naver Section ── */}
      <div>
        <p className="text-xs font-medium text-gray-400 tracking-wider mb-2">
          네이버 현황
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PlaceRankCard
            primaryKeyword={primaryKeyword?.keyword || null}
            placeRankPc={placeRank?.place_rank_pc ?? null}
            placeRankMo={placeRank?.place_rank_mo ?? null}
            measuredAt={placeRank?.measured_at ?? null}
          />
          <StatCard
            title="방문자 리뷰"
            currentValue={latest?.visitor_review_count ?? null}
            previousValue={previous?.visitor_review_count ?? null}
            history={reviewHistory}
            fullHistory={reviewFull}
            color="#10b981"
          />
          <StatCard
            title="블로그 리뷰"
            currentValue={latest?.blog_review_count ?? null}
            previousValue={previous?.blog_review_count ?? null}
            history={blogHistory}
            fullHistory={blogFull}
            color="#3b82f6"
          />
          <StatCard
            title="저장수"
            currentValue={latest?.bookmark_count ?? null}
            previousValue={previous?.bookmark_count ?? null}
            history={bookmarkHistory}
            fullHistory={bookmarkFull}
            color="#f59e0b"
          />
        </div>
      </div>

      {/* Naver Exposure Table */}
      <ExposureTable
        title="네이버 블로그 노출 현황"
        rows={naverRows}
        platform="naver"
      />

      {/* ── Google Section ── */}
      <ExposureTable
        title="구글 노출 현황"
        rows={googleRows}
        platform="google"
      />

      {/* Link to keyword management */}
      <div className="flex justify-end">
        <Link
          href="/portal/keywords"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Settings className="h-3 w-3" />
          키워드 관리
        </Link>
      </div>
    </div>
  );
}
