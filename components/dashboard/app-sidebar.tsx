"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  BarChart2,
  BarChart3,
  Bot,
  Building2,
  ClipboardList,
  Coins,
  DollarSign,
  FileEdit,
  FilePlus,
  Globe,
  Home,
  Key,
  LayoutDashboard,
  Library,
  Loader2,
  LogOut,
  MessageSquare,
  Package,
  Radio,
  Rocket,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Store,
  Timer,
  Microscope,
  UserCheck,
  UserCog,
} from "lucide-react";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import dynamic from "next/dynamic";
import { adminLogout, getAdminInfo } from "@/lib/actions/admin-actions";
import { portalSignOut } from "@/lib/actions/auth-actions";
const BrandSelector = dynamic(
  () => import("@/components/dashboard/brand-selector").then(m => m.BrandSelector),
  { ssr: false }
);
import type { AiMarketBrand } from "@/lib/actions/brand-actions";
import type { AdminPayload } from "@/lib/auth/admin-session";
import type { UserRole } from "@/lib/auth";

// ── 역할 타입 (어드민 + 고객 통합) ──────────────────────────────────────────
type AppRole = UserRole; // "super_admin" | "admin" | "sales" | "viewer" | "client_owner" | "client_member"

// ── 메뉴 아이템 타입 ──────────────────────────────────────────────────────
interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles: AppRole[]; // 접근 가능한 역할 목록
  badge?: number; // 뱃지 카운트 (알림 등)
}

// ── 사이드바 메뉴 구조 (역할 기반 필터링 지원) ────────────────────────────

const ALL_ADMIN: AppRole[] = ["super_admin", "admin", "sales", "viewer"];
const ADMIN_ONLY: AppRole[] = ["super_admin", "admin", "viewer"];
const SUPER_ADMIN_ONLY: AppRole[] = ["super_admin"];
const CLIENT_ROLES: AppRole[] = ["client_owner", "client_member"];

// ═══ 어드민: 서비스 (SEO & AEO) ═══
const serviceNavItems: NavItem[] = [
  { title: "대시보드",    url: "/dashboard",  icon: LayoutDashboard, roles: ALL_ADMIN },
  { title: "키워드 관리", url: "/keywords",   icon: Key,             roles: ALL_ADMIN },
  { title: "블로그 발행", url: "/contents",   icon: FileEdit,        roles: ALL_ADMIN },
  { title: "성과 분석",   url: "/analytics",  icon: BarChart2,       roles: ALL_ADMIN },
];

// ═══ 어드민: 고객 관리 ═══
const clientMgmtNavItems: NavItem[] = [
  { title: "고객 포트폴리오", url: "/clients",    icon: Building2, roles: ALL_ADMIN },
  { title: "브랜드 관리",     url: "/brands",     icon: Store,     roles: ALL_ADMIN },
  { title: "브랜드 분석",     url: "/brand-analysis", icon: Microscope, roles: ALL_ADMIN },
  { title: "온보딩",          url: "/ops/onboarding", icon: Rocket,    roles: ALL_ADMIN },
  { title: "계정 관리",       url: "/accounts",   icon: UserCog,   roles: ["super_admin", "admin"] },
];

// ═══ 어드민: 비즈니스 ═══
const bizNavItems: NavItem[] = [
  { title: "매출 관리", url: "/ops/revenue",  icon: DollarSign,    roles: ADMIN_ONLY },
  { title: "이탈 관리", url: "/ops/churn",    icon: AlertTriangle, roles: ADMIN_ONLY },
  { title: "상품 관리", url: "/ops/products", icon: Package,       roles: ADMIN_ONLY },
  { title: "포인트 관리", url: "/ops/points", icon: Coins,         roles: ["super_admin", "admin"] },
];

// ═══ 어드민: 영업 CRM ═══
const crmNavItems: NavItem[] = [
  { title: "분석 로그", url: "/ops/analysis-logs",  icon: ClipboardList, roles: ALL_ADMIN },
  { title: "마케팅 상담", url: "/ops/consultations", icon: MessageSquare, roles: ["super_admin", "admin", "sales"] },
  { title: "영업사원",  url: "/ops/sales-agents",   icon: UserCheck,     roles: ADMIN_ONLY },
];

// ═══ 어드민: 홈페이지 ═══
const homepageNavItems: NavItem[] = [
  { title: "홈페이지 프로젝트", url: "/homepage",           icon: Globe,          roles: ALL_ADMIN },
  { title: "제작 신청",         url: "/homepage/requests",  icon: FilePlus,       roles: ADMIN_ONLY },
  { title: "상담 문의",         url: "/homepage/inquiries", icon: MessageSquare,  roles: [...ALL_ADMIN, ...CLIENT_ROLES] },
];

// ═══ 어드민: 리소스 ═══
const resourceNavItems: NavItem[] = [
  { title: "블로그 계정",     url: "/ops/blog-accounts", icon: Smartphone, roles: ADMIN_ONLY },
  { title: "소스 라이브러리", url: "/ops/sources",       icon: Library,    roles: ADMIN_ONLY },
  { title: "자동 스케줄러",   url: "/ops/scheduler",     icon: Timer,      roles: ADMIN_ONLY },
];

// ═══ 어드민: 설정 ═══
const settingsNavItems: NavItem[] = [
  { title: "에이전트 설정", url: "/settings/agents",      icon: Bot,               roles: ADMIN_ONLY },
  { title: "점수 가중치",   url: "/ops/scoring-settings", icon: SlidersHorizontal, roles: ADMIN_ONLY },
  { title: "SERP 설정",     url: "/ops/serp-settings",    icon: Search,            roles: ADMIN_ONLY },
  { title: "AEO 설정",      url: "/ops/aeo-settings",     icon: Radio,             roles: ["super_admin", "admin"] },
  { title: "API 설정",      url: "/ops/settings",         icon: Settings,          roles: ADMIN_ONLY },
  { title: "에러 로그",     url: "/ops/error-logs",       icon: ShieldAlert,       roles: ["super_admin", "admin"] },
  { title: "어드민 관리",   url: "/settings/admins",      icon: ShieldCheck,       roles: SUPER_ADMIN_ONLY },
];

// ═══ 고객 메뉴 (어드민 경로 공유) ═══
const clientNavItems: NavItem[] = [
  { title: "대시보드",      url: "/dashboard",           icon: Home,           roles: CLIENT_ROLES },
  { title: "홈페이지",      url: "/homepage",            icon: Globe,          roles: CLIENT_ROLES },
  { title: "상담 문의",     url: "/homepage/inquiries",  icon: MessageSquare,  roles: CLIENT_ROLES },
  { title: "키워드 관리",   url: "/keywords",            icon: Key,            roles: CLIENT_ROLES },
  { title: "블로그 발행",   url: "/contents",            icon: FileEdit,       roles: CLIENT_ROLES },
  { title: "성과 분석",     url: "/analytics",           icon: BarChart3,      roles: CLIENT_ROLES },
  { title: "브랜드 분석",   url: "/brand-analysis",      icon: Microscope,     roles: CLIENT_ROLES },
  { title: "블로그 계정",   url: "/blog-accounts",       icon: Smartphone,     roles: CLIENT_ROLES },
  { title: "설정",          url: "/settings",            icon: Settings,       roles: CLIENT_ROLES },
];

// ── 역할 라벨 매핑 ────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  super_admin: "슈퍼 어드민",
  admin: "어드민",
  sales: "영업",
  viewer: "뷰어",
  client_owner: "브랜드 관리자",
  client_member: "멤버",
};

// ── 어드민 역할 판별 ──────────────────────────────────────────────────────
function isAdminAppRole(role: AppRole): boolean {
  return ALL_ADMIN.includes(role);
}

interface AppSidebarProps {
  brands?: AiMarketBrand[];
  selectedClientId?: string | null;
  adminRole?: string | null;
  // 고객 사용자 props (dashboard layout에서 전달)
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  brandName?: string | null;
}

export function AppSidebar({
  brands = [],
  selectedClientId = null,
  adminRole = null,
  userName = null,
  userEmail = null,
  userRole = null,
  brandName = null,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [admin, setAdmin] = useState<AdminPayload | null>(null);

  // userRole prop이 있으면 (포털에서 전달) 그것을 사용, 없으면 기존 어드민 로직
  const currentRole: AppRole = (userRole as AppRole)
    || (adminRole as AppRole)
    || admin?.role
    || "client_member";

  const isClientUser = CLIENT_ROLES.includes(currentRole);

  useEffect(() => {
    // 어드민 역할일 때만 getAdminInfo 호출
    if (!isClientUser && !userRole) {
      getAdminInfo().then(setAdmin);
    }
  }, [isClientUser, userRole]);

  const handleSignOut = () => {
    startTransition(async () => {
      if (isClientUser) {
        await portalSignOut();
        router.push("/login");
        router.refresh();
      } else {
        await adminLogout();
      }
    });
  };

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === url;
    if (url === "/ops") return pathname === "/ops";
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  // 프로필 표시 정보
  const displayName = isClientUser
    ? (userName || userEmail || "사용자")
    : (admin?.displayName || admin?.username || "어드민");
  const displayEmail = isClientUser
    ? (userEmail || "")
    : (admin?.username || "");
  const initials = displayName.charAt(0).toUpperCase();

  // 역할에 따라 메뉴 항목 필터링
  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => item.roles.includes(currentRole));

  // 어드민/고객에 따라 메뉴 그룹 구성
  const navGroups = isClientUser
    ? [
        { label: "메뉴", items: filterByRole(clientNavItems), separator: false },
      ].filter((g) => g.items.length > 0)
    : [
        { label: "서비스", items: filterByRole(serviceNavItems), separator: false },
        { label: "고객 관리", items: filterByRole(clientMgmtNavItems), separator: true },
        { label: "홈페이지", items: filterByRole(homepageNavItems), separator: false },
        { label: "비즈니스", items: filterByRole(bizNavItems), separator: false },
        { label: "영업 CRM", items: filterByRole(crmNavItems), separator: false },
        { label: "리소스", items: filterByRole(resourceNavItems), separator: false },
        { label: "설정", items: filterByRole(settingsNavItems), separator: false },
      ].filter((g) => g.items.length > 0);

  const homeUrl = "/dashboard";
  const settingsUrl = isClientUser ? "/settings" : "/settings/account";

  return (
    <Sidebar className="border-r border-border/40">
      {/* Logo */}
      <SidebarHeader className="border-b border-border/40 p-4 pb-3">
        <Link href={homeUrl}>
          <Logo size="md" />
        </Link>
        {/* 고객: 브랜드명 표시 */}
        {isClientUser && brandName && (
          <span className="text-xs text-muted-foreground truncate mt-1">
            {brandName}
          </span>
        )}
      </SidebarHeader>

      {/* 어드민 전용: 글로벌 브랜드 셀렉터 */}
      {!isClientUser && (
        <div className="border-b border-border/40 pt-3">
          <BrandSelector brands={brands} selectedClientId={selectedClientId} />
        </div>
      )}

      <SidebarContent className="px-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            {group.separator && (
              <div className="mx-3 border-t border-border/40" />
            )}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        className="transition-colors"
                      >
                        <Link href={item.url} className="relative">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        ))}
      </SidebarContent>

      {/* 프로필 */}
      <SidebarFooter className="border-t border-border/40 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className={`text-white text-xs font-bold ${
                  isClientUser
                    ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                    : "bg-gradient-to-br from-amber-500 to-orange-500"
                }`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {ROLE_LABELS[currentRole] || currentRole}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href={settingsUrl}>
                <Settings className="h-4 w-4 mr-2" />
                계정 설정
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isPending}
              className="text-red-500 focus:text-red-500"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
