"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Loader2,
  MessageSquare,
  Phone,
  User,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/service";
import {
  updateInquiryStatus,
  type HomepageInquiry,
  type InquiryStatus,
} from "@/lib/actions/homepage-actions";

// ── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "신규", color: "bg-red-100 text-red-700" },
  contacted: { label: "연락됨", color: "bg-blue-100 text-blue-700" },
  consulting: { label: "상담 중", color: "bg-purple-100 text-purple-700" },
  contracted: { label: "계약", color: "bg-emerald-100 text-emerald-700" },
  lost: { label: "이탈", color: "bg-gray-100 text-gray-600" },
};

const STATUS_OPTIONS: InquiryStatus[] = ["new", "contacted", "consulting", "contracted", "lost"];

// ── Main Page ───────────────────────────────────────────────────────────────

export default function AllInquiriesPage() {
  const [inquiries, setInquiries] = useState<(HomepageInquiry & { project_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "all">("all");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadInquiries();
  }, []);

  const loadInquiries = async () => {
    try {
      const res = await fetch("/api/homepage/inquiries");
      if (res.ok) {
        const data = await res.json();
        setInquiries(data);
      }
    } catch {
      // Fallback: 직접 서버 액션으로 로드 불가 (전체 프로젝트 걸쳐야 하므로)
    }
    setLoading(false);
  };

  const handleStatusChange = (inquiryId: string, newStatus: InquiryStatus) => {
    startTransition(async () => {
      const result = await updateInquiryStatus(inquiryId, newStatus);
      if (result.success) {
        setInquiries((prev) =>
          prev.map((inq) =>
            inq.id === inquiryId ? { ...inq, status: newStatus } : inq,
          ),
        );
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filtered = statusFilter === "all"
    ? inquiries
    : inquiries.filter((inq) => inq.status === statusFilter);

  const counts = {
    all: inquiries.length,
    new: inquiries.filter((i) => i.status === "new").length,
    contacted: inquiries.filter((i) => i.status === "contacted").length,
    consulting: inquiries.filter((i) => i.status === "consulting").length,
    contracted: inquiries.filter((i) => i.status === "contracted").length,
    lost: inquiries.filter((i) => i.status === "lost").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">상담 신청 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          전체 홈페이지에서 접수된 상담 신청을 관리합니다
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3">
        {(["all", ...STATUS_OPTIONS] as const).map((key) => {
          const config = key === "all"
            ? { label: "전체", color: "" }
            : STATUS_CONFIG[key];
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`border rounded-lg p-3 text-center transition-colors ${
                statusFilter === key ? "ring-2 ring-primary border-primary" : "hover:bg-muted/50"
              }`}
            >
              <p className="text-xs text-muted-foreground">{config.label}</p>
              <p className="text-xl font-bold mt-1">{counts[key]}</p>
            </button>
          );
        })}
      </div>

      {/* Inquiry List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((inq) => {
            const config = STATUS_CONFIG[inq.status] || { label: inq.status, color: "" };
            return (
              <div key={inq.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{inq.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {inq.phone}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={inq.status}
                      onChange={(e) => handleStatusChange(inq.id, e.target.value as InquiryStatus)}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 ${config.color}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  {inq.space_type && <span>{inq.space_type}</span>}
                  {inq.area_pyeong && <span>{inq.area_pyeong}평</span>}
                  {inq.budget_range && <span>{inq.budget_range}</span>}
                  {inq.project_name && (
                    <Link
                      href={`/homepage/${inq.project_id}`}
                      className="text-primary hover:underline"
                    >
                      {inq.project_name}
                    </Link>
                  )}
                </div>

                {inq.message && (
                  <p className="text-sm text-muted-foreground">{inq.message}</p>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(inq.created_at).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">상담 신청이 없습니다</p>
        </div>
      )}
    </div>
  );
}
