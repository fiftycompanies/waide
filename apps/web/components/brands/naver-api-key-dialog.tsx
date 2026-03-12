"use client";

import { useState, useEffect, useTransition } from "react";
import { Key, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  getClientApiKeys,
  updateClientApiKeys,
  type ClientNaverApiKeys,
} from "@/lib/actions/brand-actions";

interface NaverApiKeyDialogProps {
  clientId: string;
  clientName: string;
}

export function NaverApiKeyDialog({ clientId, clientName }: NaverApiKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [form, setForm] = useState<ClientNaverApiKeys>({
    naver_ad_api_key: null,
    naver_ad_secret_key: null,
    naver_ad_customer_id: null,
  });

  const hasKeys = Boolean(form.naver_ad_api_key && form.naver_ad_secret_key && form.naver_ad_customer_id);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getClientApiKeys(clientId).then((keys) => {
        setForm(keys);
        setLoading(false);
      });
    }
  }, [open, clientId]);

  function handleSave() {
    startTransition(async () => {
      const result = await updateClientApiKeys(clientId, {
        naver_ad_api_key: form.naver_ad_api_key?.trim() || null,
        naver_ad_secret_key: form.naver_ad_secret_key?.trim() || null,
        naver_ad_customer_id: form.naver_ad_customer_id?.trim() || null,
      });
      if (result.success) {
        toast.success("API 키가 저장되었습니다.");
        setOpen(false);
      } else {
        toast.error(result.error ?? "저장 실패");
      }
    });
  }

  function handleClear() {
    startTransition(async () => {
      const result = await updateClientApiKeys(clientId, {
        naver_ad_api_key: null,
        naver_ad_secret_key: null,
        naver_ad_customer_id: null,
      });
      if (result.success) {
        setForm({ naver_ad_api_key: null, naver_ad_secret_key: null, naver_ad_customer_id: null });
        toast.success("API 키가 삭제되었습니다.");
      } else {
        toast.error(result.error ?? "삭제 실패");
      }
    });
  }

  function mask(val: string | null): string {
    if (!val) return "";
    if (showSecrets) return val;
    if (val.length <= 8) return "*".repeat(val.length);
    return val.slice(0, 4) + "*".repeat(Math.min(val.length - 8, 20)) + val.slice(-4);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={`p-1.5 rounded hover:bg-muted transition-colors ${
            hasKeys ? "text-emerald-600" : "text-muted-foreground hover:text-foreground"
          }`}
          title={hasKeys ? "네이버 광고 API 설정됨" : "네이버 광고 API 설정"}
        >
          <Key className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-4 w-4 text-violet-500" />
            네이버 광고 API 설정
          </DialogTitle>
          <DialogDescription>
            {clientName}의 키워드 검색량 조회에 사용할 API 키를 설정합니다.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {!hasKeys && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  미설정 — 검색량 조회 시 DataLab 트렌드 데이터로 대체됩니다.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="api_key" className="text-xs font-semibold">
                  API Key (Access License)
                </Label>
                <Input
                  id="api_key"
                  type={showSecrets ? "text" : "password"}
                  value={showSecrets ? (form.naver_ad_api_key ?? "") : mask(form.naver_ad_api_key)}
                  onChange={(e) => setForm((p) => ({ ...p, naver_ad_api_key: e.target.value }))}
                  placeholder="0100000000..."
                  className="h-8 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="secret_key" className="text-xs font-semibold">
                  Secret Key
                </Label>
                <Input
                  id="secret_key"
                  type={showSecrets ? "text" : "password"}
                  value={showSecrets ? (form.naver_ad_secret_key ?? "") : mask(form.naver_ad_secret_key)}
                  onChange={(e) => setForm((p) => ({ ...p, naver_ad_secret_key: e.target.value }))}
                  placeholder="AQAAAA..."
                  className="h-8 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customer_id" className="text-xs font-semibold">
                  Customer ID
                </Label>
                <Input
                  id="customer_id"
                  type={showSecrets ? "text" : "password"}
                  value={showSecrets ? (form.naver_ad_customer_id ?? "") : mask(form.naver_ad_customer_id)}
                  onChange={(e) => setForm((p) => ({ ...p, naver_ad_customer_id: e.target.value }))}
                  placeholder="2616971"
                  className="h-8 text-sm font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSecrets((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showSecrets ? "숨기기" : "보기"}
              </button>

              <p className="text-xs text-muted-foreground">
                발급:{" "}
                <a
                  href="https://searchad.naver.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  searchad.naver.com
                </a>
                {" > 설정 > API 관리"}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                size="sm"
              >
                {isPending ? "저장 중..." : "저장"}
              </Button>
              {hasKeys && (
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={isPending}
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  키 삭제
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
