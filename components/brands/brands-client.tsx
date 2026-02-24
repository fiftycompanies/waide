"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Building2,
  Home,
  Pencil,
  Trash2,
  Globe,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  getBrandList,
  createBrand,
  updateBrand,
  deleteBrand,
  type BrandDetail,
} from "@/lib/actions/brand-actions";
import { NaverApiKeyDialog } from "@/components/brands/naver-api-key-dialog";
import { BrandStyleDialog } from "@/components/brands/brand-style-dialog";

// ── 타입 정의 ─────────────────────────────────────────────────

interface BrandsClientProps {
  brands: BrandDetail[];
  workspaceId: string;
  companyBrands: Array<{ id: string; name: string }>;
}

interface EditState {
  name: string;
  company_name: string;
  website_url: string;
  client_type: string;
  parent_id: string | null;
}

type BrandType = "company" | "sub_client";

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// ── 메인 컴포넌트 ──────────────────────────────────────────────

export function BrandsClient({
  brands: initialBrands,
  workspaceId,
  companyBrands,
}: BrandsClientProps) {
  const [brands, setBrands] = useState<BrandDetail[]>(initialBrands);
  const [isPending, startTransition] = useTransition();

  // 아코디언: 펼쳐진 본사 ID Set
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 생성 폼 상태
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createType, setCreateType] = useState<BrandType>("company");
  const [createParentId, setCreateParentId] = useState<string>("");
  const [createForm, setCreateForm] = useState({
    name: "",
    companyName: "",
    websiteUrl: "",
  });

  // 편집 상태
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState>({
    name: "",
    company_name: "",
    website_url: "",
    client_type: "company",
    parent_id: null,
  });

  // 삭제 확인
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // ── 헬퍼 ──────────────────────────────────────────────────────

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreateForSubClient(parentId: string) {
    setCreateType("sub_client");
    setCreateParentId(parentId);
    setCreateForm({ name: "", companyName: "", websiteUrl: "" });
    setCreateError(null);
    setShowCreate(true);
    // 해당 부모 펼치기
    setExpandedIds((prev) => new Set([...prev, parentId]));
  }

  function startEdit(brand: BrandDetail) {
    setEditId(brand.id);
    setEditForm({
      name: brand.name,
      company_name: brand.company_name ?? "",
      website_url: brand.website_url ?? "",
      client_type: brand.client_type,
      parent_id: brand.parent_id,
    });
  }

  // ── CRUD 핸들러 ───────────────────────────────────────────────

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!workspaceId) {
      setCreateError("워크스페이스가 없습니다. 온보딩을 먼저 완료하세요.");
      return;
    }
    if (createType === "sub_client" && !createParentId) {
      setCreateError("상위 본사를 선택하세요.");
      return;
    }

    startTransition(async () => {
      const result = await createBrand({
        name: createForm.name,
        companyName: createForm.companyName,
        websiteUrl: createForm.websiteUrl,
        clientType: createType,
        parentId: createType === "sub_client" ? createParentId : null,
        workspaceId,
      });
      if (result.success) {
        toast.success(
          createType === "company" ? "본사 브랜드가 생성되었습니다." : "하위 업체가 추가되었습니다."
        );
        setShowCreate(false);
        setCreateForm({ name: "", companyName: "", websiteUrl: "" });
        setCreateParentId("");
        const updated = await getBrandList();
        setBrands(updated);
      } else {
        setCreateError(result.error ?? "생성 실패");
      }
    });
  }

  function handleEditSave(id: string) {
    startTransition(async () => {
      const result = await updateBrand(id, {
        name: editForm.name.trim(),
        company_name: editForm.company_name.trim() || editForm.name.trim(),
        website_url: editForm.website_url.trim() || undefined,
        client_type: editForm.client_type,
      });
      if (result.success) {
        setBrands((prev) =>
          prev.map((b) =>
            b.id === id
              ? {
                  ...b,
                  name: editForm.name.trim(),
                  company_name: editForm.company_name.trim() || editForm.name.trim(),
                  website_url: editForm.website_url.trim() || null,
                  client_type: editForm.client_type,
                }
              : b
          )
        );
        setEditId(null);
        toast.success("브랜드가 수정되었습니다.");
      } else {
        toast.error(result.error ?? "수정 실패");
      }
    });
  }

  function handleDelete() {
    if (!deleteTargetId) return;
    const target = brands.find((b) => b.id === deleteTargetId);
    if (!target || deleteConfirm !== target.name) return;

    startTransition(async () => {
      const result = await deleteBrand(deleteTargetId);
      if (result.success) {
        setBrands((prev) =>
          prev.map((b) =>
            b.id === deleteTargetId ? { ...b, is_active: false } : b
          )
        );
        toast.success("비활성화되었습니다.");
        setDeleteTargetId(null);
        setDeleteConfirm("");
      } else {
        toast.error(result.error ?? "비활성화 실패");
      }
    });
  }

  // ── 데이터 분류 ───────────────────────────────────────────────

  const activeBrands = brands.filter((b) => b.is_active);
  const inactiveBrands = brands.filter((b) => !b.is_active);

  // 본사(최상위) 브랜드 — parent_id 없음
  const topLevelBrands = activeBrands.filter((b) => !b.parent_id);
  // 하위 업체 — parent_id 있음
  const subClientMap = activeBrands
    .filter((b) => b.parent_id)
    .reduce<Record<string, BrandDetail[]>>((acc, b) => {
      const pid = b.parent_id!;
      if (!acc[pid]) acc[pid] = [];
      acc[pid].push(b);
      return acc;
    }, {});

  const deleteTarget = brands.find((b) => b.id === deleteTargetId);

  // ── 렌더 ──────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-violet-500" />
            브랜드 목록 ({topLevelBrands.length}개 본사 · {activeBrands.filter((b) => b.parent_id).length}개 하위)
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setCreateType("company");
              setCreateParentId("");
              setCreateForm({ name: "", companyName: "", websiteUrl: "" });
              setCreateError(null);
              setShowCreate((v) => !v);
            }}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            브랜드 추가
          </Button>
        </CardHeader>

        {/* ── 생성 폼 ─────────────────────────────────────────── */}
        {showCreate && (
          <div className="px-6 pb-4">
            <form
              onSubmit={handleCreate}
              className="rounded-lg border border-dashed border-violet-300 bg-violet-50/30 p-4 space-y-4"
            >
              <p className="text-sm font-semibold text-violet-800">
                {createType === "sub_client" ? "하위 업체 추가" : "새 브랜드 추가"}
              </p>

              {createError && (
                <Alert variant="destructive">
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}

              {/* Task 1-1: 타입 라디오 */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">브랜드 유형</Label>
                <div className="flex gap-3">
                  <label
                    className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      createType === "company"
                        ? "border-violet-500 bg-violet-50"
                        : "border-border hover:border-violet-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="clientType"
                      value="company"
                      checked={createType === "company"}
                      onChange={() => { setCreateType("company"); setCreateParentId(""); }}
                      className="h-4 w-4 accent-violet-600"
                    />
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-1">
                        🏢 본사 / 플랫폼
                      </p>
                      <p className="text-xs text-muted-foreground">최상위 브랜드</p>
                    </div>
                  </label>

                  <label
                    className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      createType === "sub_client"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-border hover:border-emerald-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="clientType"
                      value="sub_client"
                      checked={createType === "sub_client"}
                      onChange={() => setCreateType("sub_client")}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-1">
                        🏠 하위 업체
                      </p>
                      <p className="text-xs text-muted-foreground">본사 소속 업체</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Task 1-2: 하위 업체 선택 시 부모 선택 */}
              {createType === "sub_client" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    상위 본사 선택 <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={createParentId}
                    onChange={(e) => setCreateParentId(e.target.value)}
                    className={selectCls}
                    required
                  >
                    <option value="">본사를 선택하세요...</option>
                    {companyBrands.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.name}
                      </option>
                    ))}
                  </select>
                  {companyBrands.length === 0 && (
                    <p className="text-xs text-amber-600">
                      먼저 본사 브랜드를 추가하세요.
                    </p>
                  )}
                </div>
              )}

              {/* 공통 입력 필드 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">
                    {createType === "sub_client" ? "업체명" : "브랜드명"}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={createForm.name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder={createType === "sub_client" ? "예: 강남점" : "예: 스타벅스 코리아"}
                    required
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">회사명</Label>
                  <Input
                    value={createForm.companyName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, companyName: e.target.value }))}
                    placeholder="공식 법인명 (선택)"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">웹사이트 URL</Label>
                  <Input
                    value={createForm.websiteUrl}
                    onChange={(e) => setCreateForm((p) => ({ ...p, websiteUrl: e.target.value }))}
                    placeholder="https://..."
                    type="url"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className={`text-xs ${
                    createType === "company"
                      ? "bg-violet-600 hover:bg-violet-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {isPending ? "생성 중..." : createType === "sub_client" ? "하위 업체 추가" : "본사 생성"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => { setShowCreate(false); setCreateError(null); }}
                >
                  취소
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── 브랜드 목록 ─────────────────────────────────────── */}
        <CardContent className="pt-0 space-y-1">
          {topLevelBrands.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              브랜드가 없습니다. 상단 버튼으로 본사 브랜드를 추가하세요.
            </div>
          )}

          {topLevelBrands.map((brand) => {
            const subs = subClientMap[brand.id] ?? [];
            const isExpanded = expandedIds.has(brand.id);
            const isCompany = brand.client_type === "company";

            return (
              <div key={brand.id}>
                {/* ── 본사 행 ──────────────────────────────────── */}
                <div className="rounded-lg border border-border/40 bg-background">
                  {editId === brand.id ? (
                    /* 편집 모드 */
                    <div className="p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">브랜드명</Label>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                            className="h-7 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">회사명</Label>
                          <Input
                            value={editForm.company_name}
                            onChange={(e) => setEditForm((p) => ({ ...p, company_name: e.target.value }))}
                            className="h-7 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">웹사이트</Label>
                          <Input
                            value={editForm.website_url}
                            onChange={(e) => setEditForm((p) => ({ ...p, website_url: e.target.value }))}
                            className="h-7 text-sm"
                            type="url"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditSave(brand.id)}
                          disabled={isPending}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="h-3 w-3 mr-1" />저장
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditId(null)}
                          className="h-7 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* 뷰 모드 */
                    <div className="flex items-center gap-2 p-3">
                      {/* 아코디언 토글 (하위 업체 있을 때만) */}
                      <button
                        onClick={() => toggleExpand(brand.id)}
                        className={`flex h-7 w-7 items-center justify-center rounded transition-colors shrink-0 ${
                          subs.length > 0
                            ? "hover:bg-muted text-muted-foreground"
                            : "invisible"
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      {/* 아이콘 */}
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                          isCompany
                            ? "bg-violet-500/10"
                            : "bg-slate-500/10"
                        }`}
                      >
                        <span className="text-base">{isCompany ? "🏢" : "🏠"}</span>
                      </div>

                      {/* 이름 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm truncate ${isCompany ? "font-bold" : "font-medium"}`}>
                            {brand.name}
                          </p>
                          {isCompany && (
                            <Badge className="text-xs bg-violet-500/10 text-violet-700 border-violet-200 shrink-0">
                              본사
                            </Badge>
                          )}
                          {subs.length > 0 && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              하위 {subs.length}개
                            </span>
                          )}
                        </div>
                        {brand.website_url && (
                          <a
                            href={brand.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5 w-fit"
                          >
                            <Globe className="h-3 w-3" />
                            {brand.website_url.replace(/^https?:\/\//, "").split("/")[0]}
                          </a>
                        )}
                      </div>

                      <span className="text-xs text-muted-foreground hidden md:block shrink-0">
                        {new Date(brand.created_at).toLocaleDateString("ko-KR")}
                      </span>

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Task 3: 하위 업체 추가 버튼 (본사에만 표시) */}
                        {isCompany && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCreateForSubClient(brand.id)}
                            className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            title="하위 업체 추가"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            하위 추가
                          </Button>
                        )}
                        <NaverApiKeyDialog clientId={brand.id} clientName={brand.name} />
                        <BrandStyleDialog clientId={brand.id} clientName={brand.name} />
                        <button
                          onClick={() => startEdit(brand)}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="수정"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setDeleteTargetId(brand.id); setDeleteConfirm(""); }}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-red-500"
                          title="비활성화"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 하위 업체 목록 (아코디언) ────────────────── */}
                {isExpanded && subs.length > 0 && (
                  <div className="ml-8 mt-1 space-y-1">
                    {subs.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-lg border border-border/30 bg-muted/20"
                      >
                        {editId === sub.id ? (
                          <div className="p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">업체명</Label>
                                <Input
                                  value={editForm.name}
                                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                  className="h-7 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">회사명</Label>
                                <Input
                                  value={editForm.company_name}
                                  onChange={(e) => setEditForm((p) => ({ ...p, company_name: e.target.value }))}
                                  className="h-7 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">웹사이트</Label>
                                <Input
                                  value={editForm.website_url}
                                  onChange={(e) => setEditForm((p) => ({ ...p, website_url: e.target.value }))}
                                  className="h-7 text-sm"
                                  type="url"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditSave(sub.id)}
                                disabled={isPending}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <Check className="h-3 w-3 mr-1" />저장
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditId(null)}
                                className="h-7 text-xs"
                              >
                                <X className="h-3 w-3 mr-1" />취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2.5">
                            <span className="text-muted-foreground text-sm shrink-0 w-4">└</span>
                            <Home className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{sub.name}</p>
                              {sub.website_url && (
                                <a
                                  href={sub.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5 w-fit"
                                >
                                  <Globe className="h-3 w-3" />
                                  {sub.website_url.replace(/^https?:\/\//, "").split("/")[0]}
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => startEdit(sub)}
                                className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => { setDeleteTargetId(sub.id); setDeleteConfirm(""); }}
                                className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* 비활성 브랜드 */}
          {inactiveBrands.length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                비활성 브랜드 {inactiveBrands.length}개 보기
              </summary>
              <div className="mt-2 space-y-2">
                {inactiveBrands.map((brand) => (
                  <div
                    key={brand.id}
                    className="flex items-center gap-3 rounded-lg border border-border/20 bg-muted/30 p-3 opacity-60"
                  >
                    <span className="text-base">{brand.parent_id ? "🏠" : "🏢"}</span>
                    <span className="text-sm truncate flex-1">{brand.name}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          await updateBrand(brand.id, { is_active: true });
                          const updated = await getBrandList();
                          setBrands(updated);
                          toast.success("브랜드가 활성화되었습니다.");
                        });
                      }}
                    >
                      활성화
                    </Button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* ── 삭제 확인 모달 ─────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold text-red-600">브랜드 비활성화</h2>
            <p className="text-sm text-muted-foreground">
              <strong>{deleteTarget.name}</strong>을 비활성화합니다. 확인을 위해 브랜드명{" "}
              <strong className="text-foreground">{deleteTarget.name}</strong>을 입력하세요.
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={deleteTarget.name}
              className="border-red-300 focus-visible:ring-red-400"
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteConfirm !== deleteTarget.name || isPending}
                className="flex-1"
              >
                {isPending ? "처리 중..." : "비활성화"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setDeleteTargetId(null); setDeleteConfirm(""); }}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
