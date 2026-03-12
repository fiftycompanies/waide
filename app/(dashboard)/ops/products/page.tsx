"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
  type ProductFeature,
  type ProductInput,
} from "@/lib/actions/product-actions";

// ── Feature Editor ─────────────────────────────────────────────────────────

function FeatureEditor({
  features,
  onChange,
}: {
  features: ProductFeature[];
  onChange: (features: ProductFeature[]) => void;
}) {
  const addFeature = () => {
    onChange([...features, { key: "", label: "", value: "" }]);
  };

  const removeFeature = (index: number) => {
    onChange(features.filter((_, i) => i !== index));
  };

  const updateFeature = (
    index: number,
    field: keyof ProductFeature,
    val: string,
  ) => {
    const updated = [...features];
    updated[index] = { ...updated[index], [field]: val };
    // auto-generate key from label
    if (field === "label" && !updated[index].key) {
      updated[index].key = val
        .replace(/[^a-zA-Z0-9가-힣]/g, "_")
        .toLowerCase();
    }
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground block">포함 기능</label>
      {features.map((f, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={f.label}
            onChange={(e) => updateFeature(i, "label", e.target.value)}
            className="flex-1 h-9 px-3 rounded-md border bg-background text-sm"
            placeholder="기능명 (예: 블로그 발행)"
          />
          <input
            value={f.value}
            onChange={(e) => updateFeature(i, "value", e.target.value)}
            className="w-32 h-9 px-3 rounded-md border bg-background text-sm"
            placeholder="내용 (예: 4건/월)"
          />
          <button
            type="button"
            onClick={() => removeFeature(i)}
            className="p-1 text-red-400 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addFeature}
        className="flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Plus className="h-3 w-3" /> 기능 추가
      </button>
    </div>
  );
}

// ── Product Modal ─────────────────────────────────────────────────────────

function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Partial<Product> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!product?.id;
  const [form, setForm] = useState<ProductInput>({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: product?.price ?? 0,
    features: product?.features ?? [],
    is_public: product?.is_public ?? true,
    sort_order: product?.sort_order ?? 0,
    highlight_label: product?.highlight_label ?? "",
  });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) return;

    startTransition(async () => {
      const result = isEdit
        ? await updateProduct(product!.id!, form)
        : await createProduct(form);

      if (result.success) {
        toast.success(isEdit ? "수정되었습니다." : "상품이 등록되었습니다.");
        onSaved();
        onClose();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 max-w-lg w-full shadow-xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {isEdit ? "상품 수정" : "새 상품 등록"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                상품명 *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                required
                placeholder="패키지 A"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Slug * <span className="text-xs">(URL용)</span>
              </label>
              <input
                value={form.slug}
                onChange={(e) =>
                  setForm({
                    ...form,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "-"),
                  })
                }
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm font-mono"
                required
                disabled={isEdit}
                placeholder="package-a"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                월 가격 (원) *
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: parseInt(e.target.value) || 0 })
                }
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                min={0}
                step={10000}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                뱃지
              </label>
              <input
                value={form.highlight_label || ""}
                onChange={(e) =>
                  setForm({ ...form, highlight_label: e.target.value })
                }
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                placeholder="인기, 추천"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              설명
            </label>
            <textarea
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none h-20"
              placeholder="상품 설명"
            />
          </div>

          <FeatureEditor
            features={form.features}
            onChange={(features) => setForm({ ...form, features })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                정렬 순서
              </label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sort_order: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={form.is_public}
                onChange={(e) =>
                  setForm({ ...form, is_public: e.target.checked })
                }
                className="h-4 w-4 rounded border"
                id="is_public"
              />
              <label htmlFor="is_public" className="text-sm">
                고객에게 노출
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : isEdit ? (
              "수정 저장"
            ) : (
              "등록"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Product> | null | "new">(null);
  const [isPending, startTransition] = useTransition();

  const fetchProducts = () => {
    startTransition(async () => {
      const data = await getProducts();
      setProducts(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = (product: Product) => {
    if (!confirm(`"${product.name}" 상품을 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result.success) {
        toast.success("삭제되었습니다.");
        fetchProducts();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">상품 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            서비스 패키지를 등록하고 관리합니다
          </p>
        </div>
        <button
          onClick={() => setModal("new")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          <Plus className="h-4 w-4" />새 상품 등록
        </button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-3 px-4 font-medium">상품명</th>
              <th className="text-left py-3 px-4 font-medium">Slug</th>
              <th className="text-right py-3 px-4 font-medium">월 가격</th>
              <th className="text-center py-3 px-4 font-medium">기능 수</th>
              <th className="text-center py-3 px-4 font-medium">고객 수</th>
              <th className="text-center py-3 px-4 font-medium">공개</th>
              <th className="text-center py-3 px-4 font-medium">액션</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  불러오는 중...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  등록된 상품이 없습니다
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="border-t hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{product.name}</span>
                      {product.highlight_label && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-700 font-medium">
                          {product.highlight_label}
                        </span>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">
                        {product.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <code className="px-2 py-0.5 rounded bg-muted text-xs font-mono">
                      {product.slug}
                    </code>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {product.price > 0
                      ? `${product.price.toLocaleString()}원`
                      : "무료"}
                  </td>
                  <td className="py-3 px-4 text-center text-muted-foreground">
                    {product.features.length}개
                  </td>
                  <td className="py-3 px-4 text-center font-medium">
                    {product.subscription_count ?? 0}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.is_public
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {product.is_public ? "공개" : "비공개"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setModal(product)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="수정"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal !== null && (
        <ProductModal
          product={modal === "new" ? {} : modal}
          onClose={() => setModal(null)}
          onSaved={fetchProducts}
        />
      )}
    </div>
  );
}
