"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { registerPublishUrl } from "@/lib/actions/portal-write-actions";

interface PublishUrlModalProps {
  contentId: string;
  contentTitle: string;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const platformOptions = [
  { value: "naver", label: "네이버 블로그" },
  { value: "tistory", label: "티스토리" },
  { value: "wordpress", label: "워드프레스" },
  { value: "medium", label: "미디엄" },
  { value: "brunch", label: "브런치" },
];

export default function PublishUrlModal({
  contentId,
  contentTitle,
  clientId,
  onClose,
  onSuccess,
}: PublishUrlModalProps) {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("naver");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!url.trim()) {
      setError("발행 URL을 입력해주세요");
      return;
    }
    try {
      new URL(url.trim());
    } catch {
      setError("올바른 URL 형식이 아닙니다");
      return;
    }

    setSubmitting(true);
    setError("");

    const result = await registerPublishUrl({
      contentId,
      clientId,
      url: url.trim(),
      platform,
    });

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "등록에 실패했습니다");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">발행 완료 URL 등록</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-700">{contentTitle}</span> 콘텐츠의 발행 URL을 등록하세요.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">발행 URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(""); }}
              placeholder="https://blog.naver.com/..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">발행 채널</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
            >
              {platformOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                등록 중...
              </>
            ) : (
              "저장"
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            URL 등록 후 순위 추적이 자동으로 시작됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
