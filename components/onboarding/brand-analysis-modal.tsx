"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Loader2, Link2 } from "lucide-react";
import { linkAnalysisToExistingClient } from "@/lib/actions/refinement-actions";

interface BrandAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  clients?: Array<{ id: string; name: string }>;
  presetClientId?: string;
}

export function BrandAnalysisModal({
  open,
  onClose,
  clients,
  presetClientId,
}: BrandAnalysisModalProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [selectedClientId, setSelectedClientId] = useState(presetClientId || "");
  const [linkToClient, setLinkToClient] = useState(!!presetClientId);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError("URL을 입력해주세요.");
      return;
    }
    setAnalyzing(true);
    setError("");

    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await resp.json();

      if (data.error) {
        setError(data.error);
        setAnalyzing(false);
        return;
      }

      const analysisId = data.id;

      // 기존 고객에 연결
      if (linkToClient && selectedClientId && analysisId) {
        await linkAnalysisToExistingClient(analysisId, selectedClientId);
      }

      // 분석 결과 페이지로 이동
      if (data.existing) {
        router.push(`/analysis/${analysisId}`);
      } else {
        router.push(`/analysis/loading?url=${encodeURIComponent(url.trim())}&id=${analysisId}`);
      }
      onClose();
    } catch {
      setError("분석 요청 중 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {presetClientId ? "브랜드 추가 분석" : "새 브랜드 분석"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              네이버 플레이스 URL
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleAnalyze())
                }
                placeholder="https://naver.me/... 또는 place.naver.com/..."
                className="w-full h-10 pl-10 pr-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          </div>

          {/* 고객 연결 옵션 (clients 목록이 있을 때만) */}
          {!presetClientId && clients && clients.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={linkToClient}
                  onChange={(e) => setLinkToClient(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="flex items-center gap-1 text-gray-700">
                  <Link2 className="h-3.5 w-3.5" />
                  기존 고객에 연결
                </span>
              </label>
              {linkToClient && (
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">고객 선택...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">
              {error}
            </p>
          )}

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full h-10 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                분석 시작 중...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                AI 분석 시작
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
