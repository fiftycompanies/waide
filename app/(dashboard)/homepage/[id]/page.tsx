"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Eye,
  ExternalLink,
  FileEdit,
  FileText,
  Globe,
  Image,
  Key,
  Loader2,
  MessageSquare,
  Pencil,
  Rocket,
  Settings,
  Star,
} from "lucide-react";
import DeployPanel from "@/components/homepage/deploy-panel";
import BlogManager from "@/components/homepage/blog-manager";
import KeywordManager from "@/components/homepage/keyword-manager";
import DashboardView from "@/components/homepage/dashboard-view";
import {
  getHomepageProject,
  getHomepageMaterial,
  getHomepagePortfolios,
  getHomepageReviews,
  getHomepageInquiries,
  type HomepageProject,
  type HomepageMaterial,
  type HomepagePortfolio,
  type HomepageReview,
  type HomepageInquiry,
} from "@/lib/actions/homepage-actions";

// ── Status Badge ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  collecting: { label: "자료 수집", color: "bg-yellow-100 text-yellow-700" },
  building: { label: "빌드 중", color: "bg-blue-100 text-blue-700" },
  preview: { label: "프리뷰", color: "bg-purple-100 text-purple-700" },
  live: { label: "라이브", color: "bg-emerald-100 text-emerald-700" },
  suspended: { label: "중단", color: "bg-gray-100 text-gray-600" },
};

// ── Tab Button ──────────────────────────────────────────────────────────────

type Tab = "overview" | "materials" | "portfolios" | "reviews" | "inquiries" | "deploy" | "blog" | "keywords" | "dashboard";

function TabButton({
  label,
  icon: Icon,
  tab,
  currentTab,
  count,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  tab: Tab;
  currentTab: Tab;
  count?: number;
  onClick: (tab: Tab) => void;
}) {
  return (
    <button
      onClick={() => onClick(tab)}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
        currentTab === tab
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-bold">
          {count}
        </span>
      )}
    </button>
  );
}

// ── Overview Tab ────────────────────────────────────────────────────────────

function OverviewContent({
  project,
  material,
  portfolioCount,
  reviewCount,
  inquiryCount,
}: {
  project: HomepageProject;
  material: HomepageMaterial | null;
  portfolioCount: number;
  reviewCount: number;
  inquiryCount: number;
}) {
  const config = STATUS_CONFIG[project.status] || { label: project.status, color: "" };

  return (
    <div className="space-y-4">
      {/* Status & Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-3 bg-card">
          <p className="text-xs text-muted-foreground">상태</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
        <div className="border rounded-lg p-3 bg-card">
          <p className="text-xs text-muted-foreground">방문수</p>
          <p className="text-xl font-bold mt-1">{project.total_visits.toLocaleString()}</p>
        </div>
        <div className="border rounded-lg p-3 bg-card">
          <p className="text-xs text-muted-foreground">상담 신청</p>
          <p className="text-xl font-bold mt-1">{inquiryCount}</p>
        </div>
        <div className="border rounded-lg p-3 bg-card">
          <p className="text-xs text-muted-foreground">포트폴리오</p>
          <p className="text-xl font-bold mt-1">{portfolioCount}건</p>
        </div>
      </div>

      {/* Project Info */}
      <div className="border rounded-lg p-4 bg-card space-y-3">
        <h3 className="font-semibold">프로젝트 정보</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">템플릿:</span>{" "}
            <span className="font-medium">{project.template_id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">서브도메인:</span>{" "}
            <span className="font-medium">{project.subdomain || "미설정"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">커스텀 도메인:</span>{" "}
            <span className="font-medium">{project.custom_domain || "미설정"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">생성일:</span>{" "}
            <span className="font-medium">
              {new Date(project.created_at).toLocaleDateString("ko-KR")}
            </span>
          </div>
        </div>
      </div>

      {/* Material Summary */}
      <div className="border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">자료 수집 현황</h3>
          <Link
            href={`/homepage/${project.id}/collect`}
            className="text-sm text-primary hover:underline"
          >
            자료 수집 →
          </Link>
        </div>
        {material ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">업체명:</span>{" "}
              <span className="font-medium">{material.company_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">대표:</span>{" "}
              <span className="font-medium">{material.owner_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">연락처:</span>{" "}
              <span className="font-medium">{material.phone}</span>
            </div>
            <div>
              <span className="text-muted-foreground">완료 여부:</span>{" "}
              <span className={`font-medium ${material.is_complete ? "text-emerald-600" : "text-yellow-600"}`}>
                {material.is_complete ? "완료" : "미완료"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">아직 자료가 수집되지 않았습니다.</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          href={`/homepage/${project.id}/collect`}
          className="border rounded-lg p-3 hover:bg-muted/50 transition-colors text-center text-sm"
        >
          <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
          자료 수집
        </Link>
        {project.vercel_deployment_url && (
          <a
            href={project.vercel_deployment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="border rounded-lg p-3 hover:bg-muted/50 transition-colors text-center text-sm"
          >
            <ExternalLink className="h-5 w-5 mx-auto mb-1 text-primary" />
            프리뷰 열기
          </a>
        )}
        <Link
          href={`/homepage/${project.id}/collect`}
          className="border rounded-lg p-3 hover:bg-muted/50 transition-colors text-center text-sm"
        >
          <Image className="h-5 w-5 mx-auto mb-1 text-primary" />
          포트폴리오
        </Link>
        <Link
          href={`/homepage/${project.id}/collect`}
          className="border rounded-lg p-3 hover:bg-muted/50 transition-colors text-center text-sm"
        >
          <Settings className="h-5 w-5 mx-auto mb-1 text-primary" />
          SEO 설정
        </Link>
      </div>
    </div>
  );
}

// ── Portfolios Tab ──────────────────────────────────────────────────────────

function PortfoliosContent({ portfolios }: { portfolios: HomepagePortfolio[] }) {
  if (portfolios.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Image className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">등록된 포트폴리오가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {portfolios.map((p) => (
        <div key={p.id} className="border rounded-lg overflow-hidden bg-card">
          {p.image_urls[0] ? (
            <img
              src={p.image_urls[0]}
              alt={p.title || "포트폴리오"}
              className="w-full h-40 object-cover"
            />
          ) : (
            <div className="w-full h-40 bg-muted flex items-center justify-center">
              <Image className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="p-3">
            <p className="font-medium text-sm">{p.title || "제목 없음"}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {p.space_type && <span>{p.space_type}</span>}
              {p.area_pyeong && <span>{p.area_pyeong}평</span>}
              {p.style && <span>{p.style}</span>}
            </div>
            {p.is_featured && (
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700">
                Featured
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Reviews Tab ─────────────────────────────────────────────────────────────

function ReviewsContent({ reviews }: { reviews: HomepageReview[] }) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Star className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">등록된 후기가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{r.customer_name}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
                    }`}
                  />
                ))}
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleDateString("ko-KR")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{r.content}</p>
          {r.project_type && (
            <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] bg-muted">
              {r.project_type}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Inquiries Tab ───────────────────────────────────────────────────────────

const INQUIRY_STATUS: Record<string, { label: string; color: string }> = {
  new: { label: "신규", color: "bg-red-100 text-red-700" },
  contacted: { label: "연락됨", color: "bg-blue-100 text-blue-700" },
  consulting: { label: "상담 중", color: "bg-purple-100 text-purple-700" },
  contracted: { label: "계약", color: "bg-emerald-100 text-emerald-700" },
  lost: { label: "이탈", color: "bg-gray-100 text-gray-600" },
};

function InquiriesContent({ inquiries }: { inquiries: HomepageInquiry[] }) {
  if (inquiries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">상담 신청이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inquiries.map((inq) => {
        const statusConfig = INQUIRY_STATUS[inq.status] || { label: inq.status, color: "" };
        return (
          <div key={inq.id} className="border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{inq.name}</span>
                <span className="text-xs text-muted-foreground">{inq.phone}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {inq.space_type && <span>{inq.space_type}</span>}
              {inq.area_pyeong && <span>{inq.area_pyeong}평</span>}
              {inq.budget_range && <span>{inq.budget_range}</span>}
            </div>
            {inq.message && (
              <p className="text-sm text-muted-foreground mt-2">{inq.message}</p>
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
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function HomepageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<HomepageProject | null>(null);
  const [material, setMaterial] = useState<HomepageMaterial | null>(null);
  const [portfolios, setPortfolios] = useState<HomepagePortfolio[]>([]);
  const [reviews, setReviews] = useState<HomepageReview[]>([]);
  const [inquiries, setInquiries] = useState<HomepageInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<Tab>("overview");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!id) return;
    startTransition(async () => {
      const [proj, mat, ports, revs, inqs] = await Promise.all([
        getHomepageProject(id),
        getHomepageMaterial(id),
        getHomepagePortfolios(id),
        getHomepageReviews(id),
        getHomepageInquiries(id),
      ]);
      setProject(proj);
      setMaterial(mat);
      setPortfolios(ports);
      setReviews(revs);
      setInquiries(inqs);
      setLoading(false);
    });
  }, [id]);

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/homepage" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{project.project_name}</h1>
            {(() => {
              const s = STATUS_CONFIG[project.status];
              return s ? (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                  {s.label}
                </span>
              ) : null;
            })()}
          </div>
          {project.client_name && (
            <p className="text-sm text-muted-foreground">{project.client_name}</p>
          )}
        </div>
        {project.vercel_deployment_url && (
          <a
            href={project.vercel_deployment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            프리뷰
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-1 overflow-x-auto">
        <TabButton label="개요" icon={Globe} tab="overview" currentTab={currentTab} onClick={setCurrentTab} />
        <TabButton label="자료" icon={FileText} tab="materials" currentTab={currentTab} onClick={setCurrentTab} />
        <TabButton label="포트폴리오" icon={Image} tab="portfolios" currentTab={currentTab} count={portfolios.length} onClick={setCurrentTab} />
        <TabButton label="후기" icon={Star} tab="reviews" currentTab={currentTab} count={reviews.length} onClick={setCurrentTab} />
        <TabButton label="상담" icon={MessageSquare} tab="inquiries" currentTab={currentTab} count={inquiries.length} onClick={setCurrentTab} />
        <TabButton label="배포" icon={Rocket} tab="deploy" currentTab={currentTab} onClick={setCurrentTab} />
        <TabButton label="블로그" icon={FileEdit} tab="blog" currentTab={currentTab} onClick={setCurrentTab} />
        <TabButton label="키워드" icon={Key} tab="keywords" currentTab={currentTab} onClick={setCurrentTab} />
        <TabButton label="대시보드" icon={BarChart3} tab="dashboard" currentTab={currentTab} onClick={setCurrentTab} />
      </div>

      {/* Tab Content */}
      {currentTab === "overview" && (
        <OverviewContent
          project={project}
          material={material}
          portfolioCount={portfolios.length}
          reviewCount={reviews.length}
          inquiryCount={inquiries.length}
        />
      )}
      {currentTab === "materials" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">수집 자료</h3>
            <Link
              href={`/homepage/${id}/collect`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Pencil className="h-3 w-3" /> 수정
            </Link>
          </div>
          {material ? (
            <div className="border rounded-lg p-4 bg-card">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">업체명:</span> {material.company_name}</div>
                <div><span className="text-muted-foreground">대표:</span> {material.owner_name}</div>
                <div><span className="text-muted-foreground">전화:</span> {material.phone}</div>
                <div><span className="text-muted-foreground">주소:</span> {material.address}</div>
                <div className="col-span-2"><span className="text-muted-foreground">소개:</span> {material.description}</div>
                <div><span className="text-muted-foreground">서비스 지역:</span> {material.service_regions.join(", ") || "미입력"}</div>
                <div><span className="text-muted-foreground">서비스 유형:</span> {material.service_types.join(", ") || "미입력"}</div>
                <div><span className="text-muted-foreground">카카오:</span> {material.kakao_link || "미입력"}</div>
                <div><span className="text-muted-foreground">인스타그램:</span> {material.instagram_url || "미입력"}</div>
                <div><span className="text-muted-foreground">네이버 플레이스:</span> {material.naver_place_url || "미입력"}</div>
                <div><span className="text-muted-foreground">영업시간:</span> {material.operating_hours || "미입력"}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">아직 자료가 수집되지 않았습니다</p>
              <Link
                href={`/homepage/${id}/collect`}
                className="inline-block mt-2 text-sm text-primary hover:underline"
              >
                자료 수집 시작 →
              </Link>
            </div>
          )}
        </div>
      )}
      {currentTab === "portfolios" && <PortfoliosContent portfolios={portfolios} />}
      {currentTab === "reviews" && <ReviewsContent reviews={reviews} />}
      {currentTab === "inquiries" && <InquiriesContent inquiries={inquiries} />}
      {currentTab === "deploy" && <DeployPanel projectId={id} />}
      {currentTab === "blog" && <BlogManager projectId={id} />}
      {currentTab === "keywords" && (
        <KeywordManager
          projectId={id}
          serviceRegions={material?.service_regions || []}
          serviceTypes={material?.service_types || []}
        />
      )}
      {currentTab === "dashboard" && <DashboardView projectId={id} />}
    </div>
  );
}
