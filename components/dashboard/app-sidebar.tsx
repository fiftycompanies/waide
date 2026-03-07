"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  BarChart2,
  Bot,
  Building2,
  ClipboardList,
  DollarSign,
  FileEdit,
  Key,
  LayoutDashboard,
  Library,
  Loader2,
  LogOut,
  Package,
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
  UserCheck,
  UserCog,
} from "lucide-react";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
const BrandSelector = dynamic(
  () => import("@/components/dashboard/brand-selector").then(m => m.BrandSelector),
  { ssr: false }
);
import type { AiMarketBrand } from "@/lib/actions/brand-actions";
import type { AdminPayload } from "@/lib/auth/admin-session";

// ── 역할 타입 ─────────────────────────────────────────────────────────────
type AdminRole = AdminPayload["role"];

// ── 메뉴 아이템 타입 ──────────────────────────────────────────────────────
interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles: AdminRole[]; // 접근 가능한 역할 목록
}

// ── 사이드바 메뉴 구조 (역할 기반 필터링 지원) ────────────────────────────

const ALL_ROLES: AdminRole[] = ["super_admin", "admin", "sales", "viewer"];
const ADMIN_ONLY: AdminRole[] = ["super_admin", "admin", "viewer"];
const SUPER_ADMIN_ONLY: AdminRole[] = ["super_admin"];

// ═══ 서비스 (SEO & AEO) ═══
const serviceNavItems: NavItem[] = [
  { title: "대시보드",    url: "/dashboard",  icon: LayoutDashboard, roles: ALL_ROLES },
  { title: "키워드 관리", url: "/keywords",   icon: Key,             roles: ALL_ROLES },
  { title: "콘텐츠 관리", url: "/contents",   icon: FileEdit,        roles: ALL_ROLES },
  { title: "발행 관리",   url: "/publish",    icon: Send,            roles: ADMIN_ONLY },
  { title: "성과 분석",   url: "/analytics",  icon: BarChart2,       roles: ALL_ROLES },
];

// ═══ 고객 관리 ═══
const clientMgmtNavItems: NavItem[] = [
  { title: "고객 포트폴리오", url: "/clients",    icon: Building2, roles: ALL_ROLES },
  { title: "브랜드 관리",     url: "/brands",     icon: Store,     roles: ALL_ROLES },
  { title: "온보딩",          url: "/ops/onboarding", icon: Rocket,    roles: ALL_ROLES },
  { title: "계정 관리",       url: "/accounts",   icon: UserCog,   roles: ["super_admin", "admin"] },
];

// ═══ 비즈니스 ═══
const bizNavItems: NavItem[] = [
  { title: "매출 관리", url: "/ops/revenue",  icon: DollarSign,    roles: ADMIN_ONLY },
  { title: "이탈 관리", url: "/ops/churn",    icon: AlertTriangle, roles: ADMIN_ONLY },
  { title: "상품 관리", url: "/ops/products", icon: Package,       roles: ADMIN_ONLY },
];

// ═══ 영업 CRM ═══
const crmNavItems: NavItem[] = [
  { title: "분석 로그", url: "/ops/analysis-logs", icon: ClipboardList, roles: ALL_ROLES },
  { title: "영업사원",  url: "/ops/sales-agents",  icon: UserCheck,     roles: ADMIN_ONLY },
];

// ═══ 리소스 ═══
const resourceNavItems: NavItem[] = [
  { title: "블로그 계정",     url: "/ops/blog-accounts", icon: Smartphone, roles: ADMIN_ONLY },
  { title: "소스 라이브러리", url: "/ops/sources",       icon: Library,    roles: ADMIN_ONLY },
  { title: "자동 스케줄러",   url: "/ops/scheduler",     icon: Timer,      roles: ADMIN_ONLY },
];

// ═══ 설정 ═══
const settingsNavItems: NavItem[] = [
  { title: "에이전트 설정", url: "/settings/agents",      icon: Bot,               roles: ADMIN_ONLY },
  { title: "점수 가중치",   url: "/ops/scoring-settings", icon: SlidersHorizontal, roles: ADMIN_ONLY },
  { title: "SERP 설정",     url: "/ops/serp-settings",    icon: Search,            roles: ADMIN_ONLY },
  { title: "API 설정",      url: "/ops/settings",         icon: Settings,          roles: ADMIN_ONLY },
  { title: "에러 로그",     url: "/ops/error-logs",       icon: ShieldAlert,       roles: ["super_admin", "admin"] },
  { title: "어드민 관리",   url: "/settings/admins",      icon: ShieldCheck,       roles: SUPER_ADMIN_ONLY },
];

// ── 역할 라벨 매핑 ────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  super_admin: "슈퍼 어드민",
  admin: "어드민",
  sales: "영업",
  viewer: "뷰어",
};

interface AppSidebarProps {
  brands?: AiMarketBrand[];
  selectedClientId?: string | null;
  adminRole?: string | null;
}

export function AppSidebar({ brands = [], selectedClientId = null, adminRole = null }: AppSidebarProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [admin, setAdmin] = useState<AdminPayload | null>(null);

  useEffect(() => {
    getAdminInfo().then(setAdmin);
  }, []);

  // 서버에서 전달받은 role 우선, 폴백으로 클라이언트 조회
  const currentRole: AdminRole = (adminRole as AdminRole) || admin?.role || "viewer";

  const handleSignOut = () => {
    startTransition(async () => {
      await adminLogout();
    });
  };

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === url;
    // /ops exact match
    if (url === "/ops") return pathname === "/ops";
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  const initials = admin?.displayName?.charAt(0).toUpperCase()
    ?? admin?.username?.charAt(0).toUpperCase()
    ?? "A";

  // 역할에 따라 메뉴 항목 필터링
  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => item.roles.includes(currentRole));

  const navGroups = [
    { label: "서비스", items: filterByRole(serviceNavItems), separator: false },
    { label: "고객 관리", items: filterByRole(clientMgmtNavItems), separator: true },
    { label: "비즈니스", items: filterByRole(bizNavItems), separator: false },
    { label: "영업 CRM", items: filterByRole(crmNavItems), separator: false },
    { label: "리소스", items: filterByRole(resourceNavItems), separator: false },
    { label: "설정", items: filterByRole(settingsNavItems), separator: false },
  ].filter((g) => g.items.length > 0);

  return (
    <Sidebar className="border-r border-border/40">
      {/* Logo */}
      <SidebarHeader className="border-b border-border/40 p-4 pb-3">
        <Link href="/dashboard">
          <Logo size="md" />
        </Link>
      </SidebarHeader>

      {/* 글로벌 브랜드 셀렉터 */}
      <div className="border-b border-border/40 pt-3">
        <BrandSelector brands={brands} selectedClientId={selectedClientId} />
      </div>

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
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
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

      {/* 어드민 프로필 */}
      <SidebarFooter className="border-t border-border/40 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">
                  {admin?.displayName || admin?.username || "어드민"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {ROLE_LABELS[currentRole] || "어드민"}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/settings/account">
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
