"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink,
  FileText,
  Loader2,
  Radio,
  RefreshCw,
  Send,
  Settings,
} from "lucide-react";
import {
  getAutoPublishSettings,
  updateAutoPublishSettings,
  getPublications,
} from "@/lib/actions/publish-actions";
import { getPortalContentsV2, getPortalPointBalance } from "@/lib/actions/portal-actions";
import { getBlogAccounts } from "@/lib/actions/blog-account-actions";

type TabKey = "pending" | "history" | "auto";

interface Publication {
  id: string;
  content_title: string | null;
  account_name: string | null;
  platform: string;
  publish_type: string;
  status: string;
  external_url: string | null;
  retry_count: number;
  published_at: string | null;
  created_at: string;
}

interface AutoSettings {
  is_enabled: boolean;
  tistory_enabled: boolean;
  wordpress_enabled: boolean;
  medium_enabled: boolean;
  publish_as_draft: boolean;
  add_canonical_url: boolean;
  add_schema_markup: boolean;
}

interface ContentItem {
  id: string;
  title: string | null;
  publish_status: string;
  created_at: string;
  metadata?: { qc_score?: number } | null;
}

export default function PortalPublishPage() {
  const [tab, setTab] = useState<TabKey>("pending");
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [pendingContents, setPendingContents] = useState<ContentItem[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [autoSettings, setAutoSettings] = useState<AutoSettings | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [accounts, setAccounts] = useState<any[]>([]);
  const [pointBalance, setPointBalance] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const cid = el?.getAttribute("content") || "";
    setClientId(cid);
    if (!cid) { setLoading(false); return; }

    Promise.all([
      getPortalContentsV2(cid),
      getPublications({ clientId: cid }),
      getAutoPublishSettings(cid),
      getBlogAccounts(cid),
      getPortalPointBalance(cid),
    ]).then(([contentsData, pubs, settings, accts, points]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allContents = (contentsData as any)?.contents || [];
      setPendingContents(
        allContents.filter((c: ContentItem) =>
          c.publish_status === "approved" || c.publish_status === "ready"
        )
      );
      setPublications(pubs as Publication[]);
      setAutoSettings(settings as AutoSettings | null);
      setAccounts(accts);
      setPointBalance(points);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (field: keyof AutoSettings, value: boolean) => {
    if (!clientId || !autoSettings) return;
    setSaving(true);
    const updated = { ...autoSettings, [field]: value };
    setAutoSettings(updated);
    await updateAutoPublishSettings(clientId, { [field]: value });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "pending", label: "발행 대기", icon: <Send className="h-4 w-4" /> },
    { key: "history", label: "발행 이력", icon: <FileText className="h-4 w-4" /> },
    { key: "auto", label: "자동 발행 설정", icon: <Settings className="h-4 w-4" /> },
  ];

  const platformLabel: Record<string, string> = {
    tistory: "Tistory",
    wordpress: "WordPress",
    medium: "Medium",
    naver: "Naver",
  };

  const statusColors: Record<string, string> = {
    published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    publishing: "bg-blue-50 text-blue-700 border-blue-200",
    pending: "bg-gray-50 text-gray-600 border-gray-200",
  };

  const statusLabel: Record<string, string> = {
    published: "발행완료",
    failed: "실패",
    publishing: "발행중",
    pending: "대기",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">발행 관리</h1>
        <p className="text-sm text-gray-500 mt-1">콘텐츠 발행 대기 · 이력 · 자동 발행 설정</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "pending" && (
        <div className="space-y-4">
          {pointBalance !== null && (
            <div className="text-sm text-gray-500">
              잔여 포인트: <span className="font-bold text-gray-900">{pointBalance}P</span>
            </div>
          )}
          {pendingContents.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center">
              <Send className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">발행 대기 중인 콘텐츠가 없습니다</p>
              <p className="text-xs text-gray-400 mt-1">콘텐츠가 승인되면 여기에 표시됩니다</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 border-b">
                <span>제목</span>
                <span>QC 점수</span>
                <span>생성일</span>
              </div>
              <div className="divide-y">
                {pendingContents.map((c) => (
                  <div key={c.id} className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.title || "(제목 없음)"}</p>
                    <span className="text-xs">
                      {c.metadata?.qc_score != null ? (
                        <span className="text-emerald-600 font-medium">{c.metadata.qc_score}점</span>
                      ) : "—"}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString("ko-KR")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div>
          {publications.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">발행 이력이 없습니다</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 border-b">
                <span>제목</span>
                <span>플랫폼</span>
                <span>상태</span>
                <span>URL</span>
                <span>발행일</span>
              </div>
              <div className="divide-y">
                {publications.map((pub) => (
                  <div key={pub.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-3 items-center hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{pub.content_title || "(제목 없음)"}</p>
                      {pub.account_name && <p className="text-xs text-gray-400">{pub.account_name}</p>}
                    </div>
                    <span className="text-xs">{platformLabel[pub.platform] || pub.platform}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[pub.status] || "bg-gray-50 text-gray-500"}`}>
                      {statusLabel[pub.status] || pub.status}
                    </span>
                    <div>
                      {pub.external_url ? (
                        <a href={pub.external_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> 링크
                        </a>
                      ) : pub.status === "failed" ? (
                        <span className="text-xs text-red-500 flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          {pub.retry_count >= 3 ? "초과" : `${pub.retry_count}/3`}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(pub.published_at || pub.created_at).toLocaleDateString("ko-KR")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "auto" && (
        <div className="space-y-4">
          {/* Master toggle */}
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">자동 발행</h3>
                <p className="text-xs text-gray-500 mt-0.5">QC 통과 시 자동으로 블로그에 발행합니다</p>
              </div>
              <button
                onClick={() => handleToggle("is_enabled", !autoSettings?.is_enabled)}
                disabled={saving}
                className={`relative w-11 h-6 rounded-full transition-colors ${autoSettings?.is_enabled ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoSettings?.is_enabled ? "translate-x-5" : ""}`} />
              </button>
            </div>
          </div>

          {/* Channel toggles */}
          <div className="rounded-xl border bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">채널별 설정</h3>
            {[
              { key: "tistory_enabled" as keyof AutoSettings, label: "Tistory", connected: accounts.some((a) => a.platform === "tistory") },
              { key: "wordpress_enabled" as keyof AutoSettings, label: "WordPress", connected: accounts.some((a) => a.platform === "wordpress") },
              { key: "medium_enabled" as keyof AutoSettings, label: "Medium", connected: accounts.some((a) => a.platform === "medium") },
            ].map((ch) => (
              <div key={ch.key} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">{ch.label}</span>
                  {!ch.connected && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">미연동</span>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(ch.key, !(autoSettings as AutoSettings)?.[ch.key])}
                  disabled={saving || !ch.connected}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    !ch.connected ? "bg-gray-200 cursor-not-allowed" :
                    (autoSettings as AutoSettings)?.[ch.key] ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(autoSettings as AutoSettings)?.[ch.key] ? "translate-x-4" : ""}`} />
                </button>
              </div>
            ))}
          </div>

          {/* Options */}
          <div className="rounded-xl border bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">발행 옵션</h3>
            {[
              { key: "publish_as_draft" as keyof AutoSettings, label: "임시 저장으로 발행", desc: "바로 공개하지 않고 임시글로 저장합니다" },
              { key: "add_canonical_url" as keyof AutoSettings, label: "Canonical URL 추가", desc: "원본 URL 태그를 자동 삽입합니다" },
              { key: "add_schema_markup" as keyof AutoSettings, label: "Schema 마크업 추가", desc: "FAQ/Article 구조화 데이터를 추가합니다" },
            ].map((opt) => (
              <div key={opt.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-700">{opt.label}</p>
                  <p className="text-xs text-gray-400">{opt.desc}</p>
                </div>
                <button
                  onClick={() => handleToggle(opt.key, !(autoSettings as AutoSettings)?.[opt.key])}
                  disabled={saving}
                  className={`relative w-9 h-5 rounded-full transition-colors ${(autoSettings as AutoSettings)?.[opt.key] ? "bg-emerald-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(autoSettings as AutoSettings)?.[opt.key] ? "translate-x-4" : ""}`} />
                </button>
              </div>
            ))}
          </div>

          {accounts.length === 0 && (
            <div className="rounded-xl border border-dashed bg-gray-50 p-6 text-center">
              <Radio className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">연동된 블로그 계정이 없습니다</p>
              <a href="/portal/blog-accounts" className="text-xs text-emerald-600 hover:underline mt-1 inline-block">
                블로그 계정 연동하기 →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
