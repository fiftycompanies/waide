"use client";

import { MapPin } from "lucide-react";

interface Props {
  primaryKeyword: string | null;
  placeRankPc: number | null;
  placeRankMo: number | null;
  measuredAt: string | null;
}

export default function PlaceRankCard({ primaryKeyword, placeRankPc, placeRankMo, measuredAt }: Props) {
  const hasData = placeRankPc !== null || placeRankMo !== null;
  const displayRank = placeRankPc ?? placeRankMo;

  return (
    <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-white p-4 min-h-[140px] flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="h-4 w-4 text-emerald-600" />
        <span className="text-xs font-medium text-gray-500">플레이스 순위</span>
      </div>
      {primaryKeyword && (
        <span className="inline-flex self-start items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium mb-2">
          ★ {primaryKeyword}
        </span>
      )}
      {hasData ? (
        <>
          <div className="flex items-end gap-1 flex-1">
            <span className="text-4xl font-bold text-gray-900">{displayRank}</span>
            <span className="text-lg text-gray-400 mb-1">위</span>
          </div>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium">
              PC {placeRankPc != null ? `${placeRankPc}위` : "-"}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 text-[10px] font-medium">
              MO {placeRankMo != null ? `${placeRankMo}위` : "-"}
            </span>
          </div>
          {measuredAt && (
            <p className="text-[10px] text-gray-400 mt-1">수집일: {measuredAt}</p>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold text-gray-200">—</p>
          <p className="text-xs text-gray-400 mt-1">데이터 축적 중</p>
        </div>
      )}
    </div>
  );
}
