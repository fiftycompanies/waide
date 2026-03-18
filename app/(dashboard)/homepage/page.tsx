"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Globe,
  Loader2,
  Plus,
  Search,
  Eye,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import {
  getHomepageProjects,
  getHomepageDashboardStats,
  type HomepageProject,
  type HomepageDashboardStats,
} from "@/lib/actions/homepage-actions";

// ── Status Badge ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  collecting: { label: "자료 수집", color: "bg-yellow-100 text-yellow-700" },
  building: { label: "빌드 중", color: "bg-blue-100 text-blue-700" },
  preview: { label: "프리뷰", color: "bg-purple-100 text-purple-700" },
  live: { label: "라이브", color: "bg-emerald-100 text-emerald-700" },
  suspended: { label: "중단", color: "bg-gray-100 text-gray-600" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

// ── Stats Cards ─────────────────────────────────────────────────────────────

function StatsCards({ stats }: { stats: HomepageDashboardStats }) {
  const cards = [
    { label: "전체 프로젝트", value: stats.total_projects, color: "text-foreground" },
    { label: "라이브", value: stats.live_count, color: "text-emerald-600" },
    { label: "자료 수집", value: stats.collecting_count, color: "text-yellow-600" },
    { label: "빌드 중", value: stats.building_count, color: "text-blue-600" },
    { label: "신규 상담", value: stats.new_inquiries, color: "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="border rounded-lg p-4 bg-card">
          <p className="text-xs text-muted-foreground">{card.label}</p>
          <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Project Card ────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: HomepageProject }) {
  return (
    <div className="border rounded-lg bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{project.project_name}</span>
          </div>
          {project.client_name && (
            <p className="text-xs text-muted-foreground mt-0.5 ml-6">{project.client_name}</p>
          )}
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="grid grid-cols-4 gap-3 text-center text-xs mb-3">
        <div>
          <p className="text-muted-foreground mb-0.5">템플릿</p>
          <span className="font-medium">{project.template_id}</span>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">방문수</p>
          <span className="font-bold text-sm">{project.total_visits.toLocaleString()}</span>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">상담</p>
          <span className="font-bold text-sm">{project.total_inquiries}</span>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">서브도메인</p>
          <span className="font-medium truncate">{project.subdomain || "--"}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>
          생성: {new Date(project.created_at).toLocaleDateString("ko-KR")}
        </span>
        <div className="flex items-center gap-3">
          {project.vercel_deployment_url && (
            <a
              href={project.vercel_deployment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> 프리뷰
            </a>
          )}
          <Link
            href={`/homepage/${project.id}`}
            className="text-primary font-medium hover:underline"
          >
            상세보기 →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Status Filter Tab ───────────────────────────────────────────────────────

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function HomepagePage() {
  const [projects, setProjects] = useState<HomepageProject[]>([]);
  const [stats, setStats] = useState<HomepageDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const [projectList, dashboardStats] = await Promise.all([
        getHomepageProjects(),
        getHomepageDashboardStats(),
      ]);
      setProjects(projectList);
      setStats(dashboardStats);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filtered = projects.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.project_name.toLowerCase().includes(q) ||
        (p.client_name?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">홈페이지 프로젝트</h1>
          <p className="text-sm text-muted-foreground mt-1">
            인테리어 업체 홈페이지를 생성하고 관리합니다
          </p>
        </div>
        <Link
          href="/homepage/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          새 프로젝트
        </Link>
      </div>

      {/* Stats */}
      {stats && <StatsCards stats={stats} />}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterTab label="전체" active={!statusFilter} onClick={() => setStatusFilter(undefined)} />
        <FilterTab label="자료 수집" active={statusFilter === "collecting"} onClick={() => setStatusFilter("collecting")} />
        <FilterTab label="빌드 중" active={statusFilter === "building"} onClick={() => setStatusFilter("building")} />
        <FilterTab label="프리뷰" active={statusFilter === "preview"} onClick={() => setStatusFilter("preview")} />
        <FilterTab label="라이브" active={statusFilter === "live"} onClick={() => setStatusFilter("live")} />

        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="프로젝트 검색..."
            className="h-9 pl-9 pr-3 rounded-lg border bg-background text-sm w-48"
          />
        </div>
      </div>

      {/* Project List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Globe className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {projects.length === 0
              ? "등록된 홈페이지 프로젝트가 없습니다"
              : "검색 결과가 없습니다"}
          </p>
        </div>
      )}

      {isPending && (
        <div className="text-center py-4">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
        </div>
      )}
    </div>
  );
}
