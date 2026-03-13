"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
  Star,
} from "lucide-react";
import {
  getBlogAccounts,
  createBlogAccount,
  deleteBlogAccount,
} from "@/lib/actions/blog-account-actions";
import {
  testBlogConnection,
  setDefaultAccount,
} from "@/lib/actions/publish-actions";

interface BlogAccount {
  id: string;
  client_id: string;
  account_name: string;
  platform: string;
  blog_url: string | null;
  blog_score: string | null;
  is_active: boolean;
  auth_type?: string;
  is_default?: boolean;
  last_published_at?: string | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  naver: "네이버 블로그",
  tistory: "Tistory",
  wordpress: "WordPress",
  medium: "Medium",
  brunch: "Brunch",
};

const PLATFORM_COLORS: Record<string, string> = {
  naver: "bg-green-50 text-green-700 border-green-200",
  tistory: "bg-orange-50 text-orange-700 border-orange-200",
  wordpress: "bg-blue-50 text-blue-700 border-blue-200",
  medium: "bg-gray-100 text-gray-700 border-gray-300",
  brunch: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export default function PortalBlogAccountsPage() {
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [accounts, setAccounts] = useState<BlogAccount[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, boolean | null>>({});

  // Add form state
  const [formName, setFormName] = useState("");
  const [formPlatform, setFormPlatform] = useState("naver");
  const [formUrl, setFormUrl] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const loadAccounts = async (cid: string) => {
    const data = await getBlogAccounts(cid);
    setAccounts(data as BlogAccount[]);
  };

  useEffect(() => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const cid = el?.getAttribute("content") || "";
    setClientId(cid);
    if (!cid) { setLoading(false); return; }
    loadAccounts(cid).then(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!clientId || !formName.trim()) return;
    setAddLoading(true);
    await createBlogAccount({
      clientId,
      accountName: formName.trim(),
      platform: formPlatform,
      blogUrl: formUrl.trim() || undefined,
    });
    await loadAccounts(clientId);
    setShowAdd(false);
    setFormName("");
    setFormUrl("");
    setAddLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 계정을 삭제하시겠습니까?")) return;
    await deleteBlogAccount(id);
    await loadAccounts(clientId);
  };

  const handleTest = async (acct: BlogAccount) => {
    setTestingId(acct.id);
    setTestResult((prev) => ({ ...prev, [acct.id]: null }));
    try {
      const result = await testBlogConnection({
        platform: acct.platform,
        blogUrl: acct.blog_url || undefined,
      });
      setTestResult((prev) => ({ ...prev, [acct.id]: result.success }));
    } catch {
      setTestResult((prev) => ({ ...prev, [acct.id]: false }));
    }
    setTestingId(null);
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultAccount(id, clientId);
    await loadAccounts(clientId);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">블로그 계정</h1>
          <p className="text-sm text-gray-500 mt-1">발행에 사용할 블로그 계정을 관리합니다</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          계정 추가
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">새 블로그 계정</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">플랫폼</label>
              <select
                value={formPlatform}
                onChange={(e) => setFormPlatform(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">계정명</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="블로그 이름"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">블로그 URL</label>
              <input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">취소</button>
            <button
              onClick={handleAdd}
              disabled={addLoading || !formName.trim()}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {addLoading ? "추가 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* Account list */}
      {accounts.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <Smartphone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">등록된 블로그 계정이 없습니다</p>
          <p className="text-xs text-gray-400 mt-1">계정을 추가하면 콘텐츠를 자동으로 발행할 수 있습니다</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((acct) => (
            <div key={acct.id} className="rounded-xl border bg-white p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PLATFORM_COLORS[acct.platform] || "bg-gray-50 text-gray-600"}`}>
                    {PLATFORM_LABELS[acct.platform] || acct.platform}
                  </span>
                  {acct.is_default && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 flex items-center gap-0.5">
                      <Star className="h-3 w-3" /> 기본
                    </span>
                  )}
                  {acct.blog_score && (
                    <span className="text-xs font-bold text-gray-600">등급 {acct.blog_score}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900">{acct.account_name}</p>
                {acct.blog_url && (
                  <a href={acct.blog_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                    <Globe className="h-3 w-3" /> {acct.blog_url}
                  </a>
                )}
                {acct.last_published_at && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    마지막 발행: {new Date(acct.last_published_at).toLocaleDateString("ko-KR")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Test connection */}
                <button
                  onClick={() => handleTest(acct)}
                  disabled={testingId === acct.id}
                  className="p-2 rounded-lg border text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                  title="연동 테스트"
                >
                  {testingId === acct.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : testResult[acct.id] === true ? (
                    <Wifi className="h-4 w-4 text-emerald-500" />
                  ) : testResult[acct.id] === false ? (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  ) : (
                    <Wifi className="h-4 w-4" />
                  )}
                </button>
                {/* Set default */}
                {!acct.is_default && (
                  <button
                    onClick={() => handleSetDefault(acct.id)}
                    className="p-2 rounded-lg border text-gray-400 hover:text-amber-600 hover:border-amber-200 transition-colors"
                    title="기본 계정으로 설정"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                {/* Delete */}
                <button
                  onClick={() => handleDelete(acct.id)}
                  className="p-2 rounded-lg border text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                  title="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
