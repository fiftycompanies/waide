"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Plug,
  RefreshCw,
  Rss,
  Settings2,
  Star,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  getClientBlogAccounts,
  createApiKeyAccount,
  testBlogConnection,
  setDefaultAccount,
  getAutoPublishSettings,
  updateAutoPublishSettings,
  getPublications,
  type Publication,
  type AutoPublishSettings,
} from "@/lib/actions/publish-actions";
import type { BlogAccountForPublish } from "@/lib/publishers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ── 상태 배지 ────────────────────────────────────────────────────────
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
};

// ── 메인 컴포넌트 ────────────────────────────────────────────────────
export function PortalBlogClient() {
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(true);

  // 섹션 1: 블로그 계정
  const [accounts, setAccounts] = useState<BlogAccountForPublish[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  // 섹션 2: 자동 발행 설정
  const [settings, setSettings] = useState<AutoPublishSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // 섹션 3: 발행 이력
  const [publications, setPublications] = useState<Publication[]>([]);

  // 모달
  const [connectModal, setConnectModal] = useState<"wordpress" | "medium" | null>(null);
  const [connectForm, setConnectForm] = useState({ accountName: "", blogUrl: "", apiKey: "", apiSecret: "" });
  const [connectError, setConnectError] = useState("");
  const [connecting, setConnecting] = useState(false);

  // 초기 로딩
  useEffect(() => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const cid = el?.getAttribute("content") || "";
    setClientId(cid);
    if (!cid) { setLoading(false); return; }

    Promise.all([
      getClientBlogAccounts(cid),
      getAutoPublishSettings(cid),
      getPublications({ clientId: cid, limit: 50 }),
    ]).then(([accs, sets, pubs]) => {
      setAccounts(accs);
      setSettings(sets);
      setPublications(pubs);
      setLoading(false);
    });
  }, []);

  // ── Tistory OAuth 시작 ──
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

  // ── API 키 계정 생성 (WordPress / Medium) ──
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
      // 새로고침
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

  // ── 연동 테스트 ──
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

  // ── 기본 계정 설정 ──
  const handleSetDefault = async (accountId: string) => {
    await setDefaultAccount(accountId, clientId);
    const accs = await getClientBlogAccounts(clientId);
    setAccounts(accs);
  };

  // ── 자동 발행 설정 업데이트 ──
  const handleSettingsUpdate = async (updates: Partial<AutoPublishSettings>) => {
    setSavingSettings(true);
    await updateAutoPublishSettings(clientId, updates);
    const newSettings = await getAutoPublishSettings(clientId);
    setSettings(newSettings);
    setSavingSettings(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">블로그 관리</h1>
        <p className="text-sm text-gray-500 mt-1">블로그 계정 연결, 자동 발행 설정, 발행 이력을 관리하세요</p>
      </div>

      {/* ════ 섹션 1: 블로그 계정 ════ */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">블로그 계정</h2>
          </div>
        </div>

        {/* 연결 버튼들 */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={handleTistoryConnect}
            className="px-4 py-2 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium border border-orange-200 hover:bg-orange-100 transition-colors"
          >
            + Tistory 연결
          </button>
          <button
            onClick={() => { setConnectModal("wordpress"); setConnectError(""); setConnectForm({ accountName: "", blogUrl: "", apiKey: "", apiSecret: "" }); }}
            className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            + WordPress 연결
          </button>
          <button
            onClick={() => { setConnectModal("medium"); setConnectError(""); setConnectForm({ accountName: "", blogUrl: "", apiKey: "", apiSecret: "" }); }}
            className="px-4 py-2 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            + Medium 연결
          </button>
        </div>

        {/* 계정 목록 */}
        {accounts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Rss className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">연결된 블로그 계정이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
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
                  {acc.blog_url && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{acc.blog_url}</p>
                  )}
                  {testResult?.id === acc.id && (
                    <p className={`text-xs mt-1 ${testResult.ok ? "text-emerald-600" : "text-red-500"}`}>{testResult.msg}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!acc.is_default && (
                    <button
                      onClick={() => handleSetDefault(acc.id)}
                      className="text-xs text-gray-500 hover:text-emerald-600 px-2 py-1 rounded border hover:border-emerald-300 transition-colors"
                    >
                      기본 설정
                    </button>
                  )}
                  <button
                    onClick={() => handleTest(acc)}
                    disabled={testingId === acc.id}
                    className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded border hover:border-blue-300 transition-colors disabled:opacity-50"
                  >
                    {testingId === acc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════ 섹션 2: 자동 발행 설정 ════ */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">자동 발행 설정</h2>
          {savingSettings && <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-auto" />}
        </div>

        <div className="space-y-4">
          {/* 마스터 토글 */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">자동 발행 활성화</p>
              <p className="text-xs text-gray-500">콘텐츠 검수 통과 시 자동으로 블로그에 발행합니다</p>
            </div>
            <button
              onClick={() => handleSettingsUpdate({ is_enabled: !settings?.is_enabled })}
              className="text-emerald-600"
            >
              {settings?.is_enabled ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8 text-gray-300" />}
            </button>
          </div>

          {settings?.is_enabled && (
            <>
              <hr />
              {/* 채널별 토글 */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">채널별 ON/OFF</p>
                {(["tistory", "wordpress", "medium"] as const).map((platform) => {
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
              {/* 옵션 */}
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

      {/* ════ 섹션 3: 발행 이력 ════ */}
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
                {publications.map((pub) => {
                  const badge = statusBadge[pub.status] || statusBadge.pending;
                  return (
                    <tr key={pub.id} className="border-b last:border-0">
                      <td className="py-3 pr-3 max-w-[200px] truncate text-gray-900">
                        {pub.content_title || "-"}
                      </td>
                      <td className="py-3 pr-3 text-gray-600">
                        {platformLabel[pub.platform] || pub.platform}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                          {badge.text}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-gray-500">
                        {pub.published_at ? new Date(pub.published_at).toLocaleDateString("ko-KR") : "-"}
                      </td>
                      <td className="py-3">
                        {pub.external_url ? (
                          <a href={pub.external_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════ WordPress / Medium 연결 모달 ════ */}
      <Dialog open={!!connectModal} onOpenChange={(open) => { if (!open) setConnectModal(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {connectModal === "wordpress" ? "WordPress 연결" : "Medium 연결"}
            </DialogTitle>
            <DialogDescription>
              {connectModal === "wordpress"
                ? "WordPress 사이트 URL과 앱 비밀번호를 입력하세요"
                : "Medium Integration Token을 입력하세요"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">계정명</label>
              <input
                value={connectForm.accountName}
                onChange={(e) => setConnectForm({ ...connectForm, accountName: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="내 블로그"
              />
            </div>

            {connectModal === "wordpress" && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">사이트 URL</label>
                  <input
                    value={connectForm.blogUrl}
                    onChange={(e) => setConnectForm({ ...connectForm, blogUrl: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://myblog.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">사용자명</label>
                  <input
                    value={connectForm.apiKey}
                    onChange={(e) => setConnectForm({ ...connectForm, apiKey: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">앱 비밀번호</label>
                  <input
                    type="password"
                    value={connectForm.apiSecret}
                    onChange={(e) => setConnectForm({ ...connectForm, apiSecret: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="xxxx xxxx xxxx xxxx"
                  />
                </div>
              </>
            )}

            {connectModal === "medium" && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Integration Token</label>
                <input
                  value={connectForm.apiKey}
                  onChange={(e) => setConnectForm({ ...connectForm, apiKey: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="토큰을 붙여넣으세요"
                />
              </div>
            )}

            {connectError && (
              <p className="text-sm text-red-500">{connectError}</p>
            )}

            <button
              onClick={handleCreateApiAccount}
              disabled={connecting || !connectForm.accountName}
              className="w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "연결하기"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
