"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Loader2,
  Pen,
  RefreshCw,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { getPortalContentsV2, getPortalKeywordsV2 } from "@/lib/actions/portal-actions";
import {
  getAutoPublishSettings,
  updateAutoPublishSettings,
  getPublications,
  executePublish,
  getClientBlogAccounts,
  createApiKeyAccount,
  testBlogConnection,
  setDefaultAccount,
  type Publication,
  type AutoPublishSettings,
} from "@/lib/actions/publish-actions";
import type { BlogAccountForPublish } from "@/lib/publishers";
import PortalContentsClient from "@/components/portal/portal-contents-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plug,
  Link2,
  Rss,
  Star,
  ToggleLeft,
  ToggleRight,
  ArrowUp,
  ArrowDown,
  Key,
  AlertTriangle,
} from "lucide-react";

// ── 타입 ─────────────────────────────────────────────────
interface ContentItem {
  id: string;
  title: string;
  keyword: string | null;
  publish_status: string;
  published_at: string | null;
  published_url: string | null;
  platform: string | null;
  qc_score: number | null;
  created_at: string;
  body: string | null;
  keyword_id: string | null;
}

type MainTab = "list" | "write" | "auto" | "contents";
type SubTab = "published" | "scheduled" | "draft";

const statusBadge: Record<string, { text: string; color: string }> = {
  pending: { text: "대기", color: "bg-gray-100 text-gray-600" },
  publishing: { text: "발행중", color: "bg-amber-100 text-amber-700" },
  published: { text: "발행됨", color: "bg-emerald-100 text-emerald-700" },
  failed: { text: "실패", color: "bg-red-100 text-red-700" },
};

const platformLabel: Record<string, string> = {
  tistory: "Tistory",
  wordpress: "WordPress",
  medium: "Medium",
  naver: "Naver",
};

interface ExtendedSettings {
  keyword_pool?: string[];
  order_by?: "sequence" | "rank_asc";
  no_duplicate_days?: number;
  schedule?: {
    type: "daily" | "weekly" | "monthly";
    days?: number[]; // 0=일 ~ 6=토 (weekly), 1~28 (monthly)
    time?: string; // "HH:MM"
  };
  confirm_count?: number;
}

interface ActiveKeywordItem {
  id: string;
  keyword: string;
  rank?: number | null;
}

interface PortalBlogUnifiedClientProps {
  clientId: string;
}

export default function PortalBlogUnifiedClient({ clientId }: PortalBlogUnifiedClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as MainTab) || "list";

  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);
  const [loading, setLoading] = useState(true);

  // 블로그 목록 데이터
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [subTab, setSubTab] = useState<SubTab>("published");

  // 자동발행 데이터
  const [accounts, setAccounts] = useState<BlogAccountForPublish[]>([]);
  const [settings, setSettings] = useState<AutoPublishSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [publications, setPublications] = useState<Publication[]>([]);

  // 블로그 연결 모달
  const [connectModal, setConnectModal] = useState<"wordpress" | "medium" | null>(null);
  const [connectForm, setConnectForm] = useState({ accountName: "", blogUrl: "", apiKey: "", apiSecret: "" });
  const [connectError, setConnectError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  // 재발행 확인
  const [republishId, setRepublishId] = useState<string | null>(null);
  const [republishing, setRepublishing] = useState(false);

  // 삭제 확인
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 키워드 풀 + 스케줄 설정
  const [allKeywords, setAllKeywords] = useState<ActiveKeywordItem[]>([]);
  const [keywordPool, setKeywordPool] = useState<string[]>([]);
  const [orderBy, setOrderBy] = useState<"sequence" | "rank_asc">("sequence");
  const [noDuplicateDays, setNoDuplicateDays] = useState(30);
  const [scheduleType, setScheduleType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [savingExtSettings, setSavingExtSettings] = useState(false);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }

    Promise.all([
      getPortalContentsV2(clientId),
      getClientBlogAccounts(clientId),
      getAutoPublishSettings(clientId),
      getPublications({ clientId, limit: 50 }),
      getPortalKeywordsV2(clientId).catch(() => null),
    ]).then(([c, accs, sets, pubs, kwData]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = Array.isArray(c) ? c : (c as any)?.contents ?? [];
      setContents(items as ContentItem[]);
      setAccounts(accs);
      setSettings(sets);
      setPublications(pubs);

      // 키워드 로드
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kws = ((kwData as any)?.activeKeywords || []) as ActiveKeywordItem[];
      setAllKeywords(kws);

      // Extended settings 복원 (settings JSONB)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ext = ((sets as any)?.settings || {}) as ExtendedSettings;
      if (ext.keyword_pool) setKeywordPool(ext.keyword_pool);
      if (ext.order_by) setOrderBy(ext.order_by);
      if (ext.no_duplicate_days != null) setNoDuplicateDays(ext.no_duplicate_days);
      if (ext.schedule?.type) setScheduleType(ext.schedule.type);
      if (ext.schedule?.days) setScheduleDays(ext.schedule.days);
      if (ext.schedule?.time) setScheduleTime(ext.schedule.time);

      setLoading(false);
    });
  }, [clientId]);

  // ── 탭 전환 시 URL 동기화 ──
  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    if (tab === "write") {
      router.push("/portal/blog/write");
      return;
    }
    const url = tab === "list" ? "/portal/blog" : `/portal/blog?tab=${tab}`;
    window.history.replaceState(null, "", url);
  };

  // ── 블로그 목록 필터 ──
  const publishedContents = contents.filter(c => c.publish_status === "published");
  const scheduledContents = contents.filter(c => c.publish_status === "scheduled");
  const draftContents = contents.filter(c => c.publish_status === "draft");

  const currentSubList = subTab === "published" ? publishedContents
    : subTab === "scheduled" ? scheduledContents
    : draftContents;

  // ── 자동발행 핸들러 ──
  const handleSettingsUpdate = async (updates: Partial<AutoPublishSettings>) => {
    setSavingSettings(true);
    await updateAutoPublishSettings(clientId, updates);
    const newSettings = await getAutoPublishSettings(clientId);
    setSettings(newSettings);
    setSavingSettings(false);
  };

  // Extended settings 저장
  const handleSaveExtendedSettings = async () => {
    setSavingExtSettings(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentSettings = ((settings as any)?.settings || {}) as ExtendedSettings;
    const newExtSettings: ExtendedSettings = {
      ...currentSettings,
      keyword_pool: keywordPool,
      order_by: orderBy,
      no_duplicate_days: noDuplicateDays,
      schedule: {
        type: scheduleType,
        days: scheduleDays,
        time: scheduleTime,
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateAutoPublishSettings(clientId, { settings: newExtSettings } as any);
    const newSettings = await getAutoPublishSettings(clientId);
    setSettings(newSettings);
    setSavingExtSettings(false);
  };

  // 자동발행 ON 전환 시 컨펌-3 모달 표시
  const handleAutoPublishToggle = async () => {
    if (!settings?.is_enabled) {
      // 켜려고 할 때 → 모달 표시
      setConfirmModalOpen(true);
    } else {
      // 끄기
      await handleSettingsUpdate({ is_enabled: false });
    }
  };

  const handleConfirmAutoPublish = async () => {
    setConfirmModalOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentSettings = ((settings as any)?.settings || {}) as ExtendedSettings;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateAutoPublishSettings(clientId, {
      is_enabled: true,
      settings: { ...currentSettings, confirm_count: 0 },
    } as any);
    const newSettings = await getAutoPublishSettings(clientId);
    setSettings(newSettings);
  };

  // 키워드 풀 관리
  const toggleKeywordInPool = (kwId: string) => {
    setKeywordPool(prev =>
      prev.includes(kwId) ? prev.filter(id => id !== kwId) : [...prev, kwId]
    );
  };

  const moveKeywordInPool = (kwId: string, dir: "up" | "down") => {
    setKeywordPool(prev => {
      const idx = prev.indexOf(kwId);
      if (idx < 0) return prev;
      const newIdx = dir === "up" ? Math.max(0, idx - 1) : Math.min(prev.length - 1, idx + 1);
      if (newIdx === idx) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  // 요일 토글
  const toggleDay = (day: number) => {
    setScheduleDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleTistoryConnect = () => {
    const tistoryClientId = process.env.NEXT_PUBLIC_TISTORY_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_TISTORY_REDIRECT_URI || `${window.location.origin}/api/auth/tistory/callback`;
    if (!tistoryClientId) {
      alert("Tistory 연동 설정이 되어 있지 않습니다.");
      return;
    }
    const state = `${clientId}:portal`;
    window.location.href = `https://www.tistory.com/oauth/authorize?client_id=${tistoryClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
  };

  const handleCreateApiAccount = async () => {
    if (!connectModal) return;
    setConnectError("");
    setConnecting(true);
    try {
      const result = await createApiKeyAccount({
        clientId,
        platform: connectModal,
        accountName: connectForm.accountName,
        blogUrl: connectForm.blogUrl || undefined,
        apiKey: connectForm.apiKey || undefined,
        apiSecret: connectForm.apiSecret || undefined,
      });
      if (!result.success) {
        setConnectError(result.error || "연결에 실패했습니다.");
        return;
      }
      const accs = await getClientBlogAccounts(clientId);
      setAccounts(accs);
      setConnectModal(null);
      setConnectForm({ accountName: "", blogUrl: "", apiKey: "", apiSecret: "" });
    } catch {
      setConnectError("오류가 발생했습니다.");
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async (acc: BlogAccountForPublish) => {
    setTestingId(acc.id);
    setTestResult(null);
    try {
      const result = await testBlogConnection({
        platform: acc.platform,
        accessToken: acc.access_token || undefined,
        apiKey: acc.api_key || undefined,
        apiSecret: acc.api_secret || undefined,
        blogUrl: acc.blog_url || undefined,
      });
      setTestResult({ id: acc.id, msg: result.info || result.error || "", ok: result.success });
    } catch {
      setTestResult({ id: acc.id, msg: "테스트 실패", ok: false });
    } finally {
      setTestingId(null);
    }
  };

  const handleSetDefault = async (accountId: string) => {
    await setDefaultAccount(accountId, clientId);
    const accs = await getClientBlogAccounts(clientId);
    setAccounts(accs);
  };

  // ── 재발행 ──
  const handleRepublish = async (contentId: string) => {
    setRepublishing(true);
    const defaultAccount = accounts.find(a => a.is_default);
    if (!defaultAccount) {
      alert("기본 블로그 계정을 먼저 설정해주세요.");
      setRepublishing(false);
      setRepublishId(null);
      return;
    }
    await executePublish({
      contentId,
      clientId,
      blogAccountId: defaultAccount.id,
      platform: defaultAccount.platform as "tistory" | "wordpress" | "medium",
      publishType: "manual",
    });
    const pubs = await getPublications({ clientId, limit: 50 });
    setPublications(pubs);
    setRepublishId(null);
    setRepublishing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const mainTabs: { key: MainTab; label: string; icon: typeof BookOpen }[] = [
    { key: "list", label: "블로그 목록", icon: BookOpen },
    { key: "write", label: "AI 작성", icon: Pen },
    { key: "auto", label: "자동발행 설정", icon: Settings2 },
    { key: "contents", label: "콘텐츠 관리", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">블로그 관리</h1>
        <p className="text-sm text-gray-500 mt-1">블로그 발행, 자동 발행, 콘텐츠를 한 곳에서 관리하세요</p>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {mainTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ 탭 1: 블로그 목록 ═══ */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {/* 서브탭 */}
          <div className="flex gap-2 border-b">
            {([
              { key: "published" as SubTab, label: "발행완료", count: publishedContents.length },
              { key: "scheduled" as SubTab, label: "예약", count: scheduledContents.length },
              { key: "draft" as SubTab, label: "초안", count: draftContents.length },
            ]).map(st => (
              <button
                key={st.key}
                onClick={() => setSubTab(st.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  subTab === st.key
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {st.label}
                {st.count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-200 text-gray-600">{st.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* 목록 */}
          {currentSubList.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {subTab === "published" && "발행된 콘텐츠가 없습니다"}
                {subTab === "scheduled" && "예약된 콘텐츠가 없습니다"}
                {subTab === "draft" && "초안이 없습니다"}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">제목</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">키워드</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600 hidden md:table-cell">플랫폼</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600 hidden md:table-cell">
                        {subTab === "scheduled" ? "예약일" : "날짜"}
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSubList.map(item => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900 line-clamp-1">{item.title || "제목 없음"}</span>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          {item.keyword ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">{item.keyword}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center hidden md:table-cell">
                          {item.platform ? (
                            <span className="text-xs text-gray-600 flex items-center justify-center gap-1">
                              <Globe className="h-3 w-3" />
                              {platformLabel[item.platform] || item.platform}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center hidden md:table-cell text-xs text-gray-500">
                          {item.published_at
                            ? new Date(item.published_at).toLocaleDateString("ko-KR")
                            : item.created_at
                            ? new Date(item.created_at).toLocaleDateString("ko-KR")
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {subTab === "published" && (
                              <>
                                <button
                                  onClick={() => router.push(`/portal/blog/${item.id}`)}
                                  className="px-2.5 py-1 rounded text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                                  title="상세 보기"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setRepublishId(item.id)}
                                  className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                  title="재발행"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            {subTab === "scheduled" && (
                              <button
                                onClick={() => {
                                  // updateContent not directly available, use through server action
                                  // For now, redirect to edit
                                  router.push(`/portal/blog/write?post_id=${item.id}&mode=edit`);
                                }}
                                className="px-2.5 py-1 rounded text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors flex items-center gap-1"
                                title="예약 취소"
                              >
                                <Clock className="h-3.5 w-3.5" />
                                <span>예약취소</span>
                              </button>
                            )}
                            {subTab === "draft" && (
                              <>
                                <button
                                  onClick={() => router.push(`/portal/blog/write?post_id=${item.id}&mode=edit`)}
                                  className="px-2.5 py-1 rounded text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                  title="이어쓰기"
                                >
                                  <Pen className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(item.id)}
                                  className="px-2.5 py-1 rounded text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                  title="삭제"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ 탭 3: 자동발행 설정 ═══ */}
      {activeTab === "auto" && (
        <div className="space-y-6">
          {/* 블로그 계정 */}
          <div className="rounded-xl border bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Plug className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-900">블로그 계정</h2>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={handleTistoryConnect} className="px-4 py-2 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium border border-orange-200 hover:bg-orange-100 transition-colors">+ Tistory 연결</button>
              <button onClick={() => { setConnectModal("wordpress"); setConnectError(""); setConnectForm({ accountName: "", blogUrl: "", apiKey: "", apiSecret: "" }); }} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium border border-blue-200 hover:bg-blue-100 transition-colors">+ WordPress 연결</button>
              <button onClick={() => { setConnectModal("medium"); setConnectError(""); setConnectForm({ accountName: "", blogUrl: "", apiKey: "", apiSecret: "" }); }} className="px-4 py-2 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-100 transition-colors">+ Medium 연결</button>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Rss className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">연결된 블로그 계정이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map(acc => (
                  <div key={acc.id} className="flex items-center gap-4 p-4 rounded-lg border bg-gray-50">
                    <div className="h-10 w-10 rounded-full bg-white border flex items-center justify-center shrink-0">
                      <Globe className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{acc.account_name || acc.blog_url || acc.platform}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{platformLabel[acc.platform] || acc.platform}</span>
                        {acc.is_default && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                            <Star className="h-3 w-3" /> 기본
                          </span>
                        )}
                      </div>
                      {acc.blog_url && <p className="text-xs text-gray-400 truncate mt-0.5">{acc.blog_url}</p>}
                      {testResult?.id === acc.id && (
                        <p className={`text-xs mt-1 ${testResult.ok ? "text-emerald-600" : "text-red-500"}`}>{testResult.msg}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!acc.is_default && (
                        <button onClick={() => handleSetDefault(acc.id)} className="text-xs text-gray-500 hover:text-emerald-600 px-2 py-1 rounded border hover:border-emerald-300 transition-colors">기본 설정</button>
                      )}
                      <button onClick={() => handleTest(acc)} disabled={testingId === acc.id} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded border hover:border-blue-300 transition-colors disabled:opacity-50">
                        {testingId === acc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 자동 발행 설정 */}
          <div className="rounded-xl border bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">자동 발행 설정</h2>
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-auto" />}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">자동 발행 활성화</p>
                  <p className="text-xs text-gray-500">콘텐츠 검수 통과 시 자동으로 블로그에 발행합니다</p>
                </div>
                <button onClick={handleAutoPublishToggle} className="text-emerald-600">
                  {settings?.is_enabled ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8 text-gray-300" />}
                </button>
              </div>

              {settings?.is_enabled && (
                <>
                  <hr />
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">채널별 ON/OFF</p>
                    {(["tistory", "wordpress", "medium"] as const).map(platform => {
                      const key = `${platform}_enabled` as keyof AutoPublishSettings;
                      return (
                        <div key={platform} className="flex items-center justify-between pl-4">
                          <span className="text-sm text-gray-600">{platformLabel[platform]}</span>
                          <button onClick={() => handleSettingsUpdate({ [key]: !settings?.[key] })}>
                            {settings?.[key] ? <ToggleRight className="h-6 w-6 text-emerald-600" /> : <ToggleLeft className="h-6 w-6 text-gray-300" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <hr />
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">발행 옵션</p>
                    {[
                      { key: "publish_as_draft" as const, label: "임시글로 발행", desc: "바로 공개하지 않고 임시 저장합니다" },
                      { key: "add_canonical_url" as const, label: "캐노니컬 URL 추가", desc: "원본 출처 URL을 콘텐츠에 포함합니다" },
                      { key: "add_schema_markup" as const, label: "Schema 마크업 추가", desc: "구조화 데이터를 콘텐츠에 추가합니다" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between pl-4">
                        <div>
                          <span className="text-sm text-gray-600">{label}</span>
                          <p className="text-xs text-gray-400">{desc}</p>
                        </div>
                        <button onClick={() => handleSettingsUpdate({ [key]: !settings?.[key] })}>
                          {settings?.[key] ? <ToggleRight className="h-6 w-6 text-emerald-600" /> : <ToggleLeft className="h-6 w-6 text-gray-300" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 키워드 풀 설정 */}
          {settings?.is_enabled && (
            <div className="rounded-xl border bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <Key className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-gray-900">키워드 풀 설정</h2>
                {savingExtSettings && <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-auto" />}
              </div>

              <div className="space-y-4">
                {/* 키워드 선택 */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">발행 키워드 선택</p>
                  {allKeywords.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">활성 키워드가 없습니다</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {allKeywords.map(kw => (
                        <button
                          key={kw.id}
                          onClick={() => toggleKeywordInPool(kw.id)}
                          className={`p-2 rounded-lg border text-left text-sm transition-colors ${
                            keywordPool.includes(kw.id)
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 hover:border-gray-300 text-gray-700"
                          }`}
                        >
                          <span className="font-medium">{kw.keyword}</span>
                          {kw.rank && <span className="ml-1 text-xs text-gray-400">{kw.rank}위</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 선택된 키워드 순서 */}
                {keywordPool.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">발행 순서 ({keywordPool.length}개 선택)</p>
                    <div className="space-y-1">
                      {keywordPool.map((kwId, idx) => {
                        const kw = allKeywords.find(k => k.id === kwId);
                        return (
                          <div key={kwId} className="flex items-center gap-2 py-1.5 px-3 bg-gray-50 rounded-lg">
                            <span className="text-xs text-gray-400 font-mono w-5">{idx + 1}</span>
                            <span className="text-sm text-gray-900 flex-1">{kw?.keyword || kwId}</span>
                            <button onClick={() => moveKeywordInPool(kwId, "up")} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => moveKeywordInPool(kwId, "down")} disabled={idx === keywordPool.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 발행 방식 */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">발행 방식</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrderBy("sequence")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        orderBy === "sequence" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      순서대로
                    </button>
                    <button
                      onClick={() => setOrderBy("rank_asc")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        orderBy === "rank_asc" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      순위 낮은 순
                    </button>
                  </div>
                </div>

                {/* 중복 방지 */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">중복 방지</p>
                    <p className="text-xs text-gray-400">{noDuplicateDays}일 이내 같은 키워드 재발행 방지</p>
                  </div>
                  <select
                    value={noDuplicateDays}
                    onChange={e => setNoDuplicateDays(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg border text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={7}>7일</option>
                    <option value={14}>14일</option>
                    <option value={30}>30일</option>
                    <option value={60}>60일</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 발행 주기 설정 */}
          {settings?.is_enabled && (
            <div className="rounded-xl border bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">발행 주기</h2>
              </div>

              <div className="space-y-4">
                {/* 주기 타입 */}
                <div className="flex gap-2">
                  {([
                    { key: "daily" as const, label: "매일" },
                    { key: "weekly" as const, label: "주 N회" },
                    { key: "monthly" as const, label: "월 N회" },
                  ]).map(t => (
                    <button
                      key={t.key}
                      onClick={() => { setScheduleType(t.key); setScheduleDays([]); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        scheduleType === t.key ? "bg-indigo-100 text-indigo-700 border border-indigo-200" : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* 요일 선택 (weekly) */}
                {scheduleType === "weekly" && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">발행 요일 선택</p>
                    <div className="flex gap-1.5">
                      {["일", "월", "화", "수", "목", "금", "토"].map((label, idx) => (
                        <button
                          key={idx}
                          onClick={() => toggleDay(idx)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                            scheduleDays.includes(idx) ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 날짜 선택 (monthly) */}
                {scheduleType === "monthly" && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">발행 날짜 선택 (1~28일)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                            scheduleDays.includes(day) ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 시간 */}
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">발행 시간</span>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* 저장 버튼 */}
                <button
                  onClick={handleSaveExtendedSettings}
                  disabled={savingExtSettings}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingExtSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  키워드 풀 + 발행 주기 저장
                </button>
              </div>
            </div>
          )}

          {/* 발행 이력 */}
          <div className="rounded-xl border bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">발행 이력</h2>
            </div>
            {publications.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">아직 발행 이력이 없습니다</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">콘텐츠</th>
                      <th className="pb-2 font-medium">플랫폼</th>
                      <th className="pb-2 font-medium">상태</th>
                      <th className="pb-2 font-medium">발행일</th>
                      <th className="pb-2 font-medium">링크</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publications.map(pub => {
                      const badge = statusBadge[pub.status] || statusBadge.pending;
                      return (
                        <tr key={pub.id} className="border-b last:border-0">
                          <td className="py-3 pr-3 max-w-[200px] truncate text-gray-900">{pub.content_title || "-"}</td>
                          <td className="py-3 pr-3 text-gray-600">{platformLabel[pub.platform] || pub.platform}</td>
                          <td className="py-3 pr-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>{badge.text}</span>
                          </td>
                          <td className="py-3 pr-3 text-gray-500">{pub.published_at ? new Date(pub.published_at).toLocaleDateString("ko-KR") : "-"}</td>
                          <td className="py-3">
                            {pub.external_url ? (
                              <a href={pub.external_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : <span className="text-gray-300">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ 탭 4: 콘텐츠 관리 ═══ */}
      {activeTab === "contents" && <PortalContentsClient />}

      {/* ═══ 재발행 확인 다이얼로그 ═══ */}
      <Dialog open={!!republishId} onOpenChange={open => { if (!open) setRepublishId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>재발행 확인</DialogTitle>
            <DialogDescription>이 콘텐츠를 기본 블로그에 다시 발행하시겠습니까?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setRepublishId(null)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
            <button onClick={() => republishId && handleRepublish(republishId)} disabled={republishing} className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">
              {republishing ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "재발행"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ WordPress / Medium 연결 모달 ═══ */}
      <Dialog open={!!connectModal} onOpenChange={open => { if (!open) setConnectModal(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{connectModal === "wordpress" ? "WordPress 연결" : "Medium 연결"}</DialogTitle>
            <DialogDescription>{connectModal === "wordpress" ? "WordPress 사이트 URL과 앱 비밀번호를 입력하세요" : "Medium Integration Token을 입력하세요"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">계정명</label>
              <input value={connectForm.accountName} onChange={e => setConnectForm({ ...connectForm, accountName: e.target.value })} className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="내 블로그" />
            </div>
            {connectModal === "wordpress" && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">사이트 URL</label>
                  <input value={connectForm.blogUrl} onChange={e => setConnectForm({ ...connectForm, blogUrl: e.target.value })} className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="https://myblog.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">사용자명</label>
                  <input value={connectForm.apiKey} onChange={e => setConnectForm({ ...connectForm, apiKey: e.target.value })} className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="admin" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">앱 비밀번호</label>
                  <input type="password" value={connectForm.apiSecret} onChange={e => setConnectForm({ ...connectForm, apiSecret: e.target.value })} className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="xxxx xxxx xxxx xxxx" />
                </div>
              </>
            )}
            {connectModal === "medium" && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Integration Token</label>
                <input value={connectForm.apiKey} onChange={e => setConnectForm({ ...connectForm, apiKey: e.target.value })} className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="토큰을 붙여넣으세요" />
              </div>
            )}
            {connectError && <p className="text-sm text-red-500">{connectError}</p>}
            <button onClick={handleCreateApiAccount} disabled={connecting || !connectForm.accountName} className="w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "연결하기"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ 자동발행 컨펌-3 모달 ═══ */}
      <Dialog open={confirmModalOpen} onOpenChange={open => { if (!open) setConfirmModalOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              자동발행 활성화
            </DialogTitle>
            <DialogDescription>자동발행을 켜시겠습니까?</DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-800 font-medium mb-1">처음 3건 컨펌 안내</p>
              <p className="text-sm text-amber-700">
                자동발행을 켜면, 처음 3건은 발행 전 알림을 받고 직접 확인 후 발행됩니다.
                3건 이후부터는 완전 자동으로 발행됩니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmModalOpen(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                취소
              </button>
              <button onClick={handleConfirmAutoPublish} className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
                자동발행 켜기
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
