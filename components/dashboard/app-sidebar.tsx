"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Activity,
  BarChart2,
  Bot,
  Building2,
  CalendarClock,
  FileEdit,
  GitBranch,
  Key,
  LayoutDashboard,
  Library,
  Loader2,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
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
import { adminLogout, getAdminInfo } from "@/lib/actions/admin-actions";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import type { AiMarketBrand } from "@/lib/actions/brand-actions";
import type { AdminPayload } from "@/lib/auth/admin-session";

// ── AI 마케터 파이프라인 기반 네비게이션 ───────────────────────────────────
const primaryNavItems = [
  { title: "대시보드",      url: "/dashboard",     icon: LayoutDashboard },
  { title: "브랜드 관리",   url: "/brands",        icon: Building2 },
  { title: "블로그 계정",   url: "/blog-accounts", icon: Users },
  { title: "소스 라이브러리", url: "/sources",      icon: Library },
  { title: "키워드 관리",   url: "/keywords",      icon: Key },
  { title: "캠페인",        url: "/campaigns",     icon: Target },
  { title: "콘텐츠 에디터", url: "/ops/contents",  icon: FileEdit },
  { title: "성과 분석",     url: "/analytics",                     icon: BarChart2 },
  { title: "발행 추천",     url: "/analytics/recommendations",     icon: Sparkles },
];

const opsNavItems = [
  { title: "Jobs 모니터링", url: "/ops/jobs",             icon: GitBranch },
  { title: "에이전트 로그", url: "/ops",                  icon: Activity },
  { title: "에이전트 설정", url: "/ops/agent-settings",   icon: Bot },
  { title: "SERP 스케줄러", url: "/ops/serp-settings",    icon: BarChart2 },
  { title: "자동 스케줄러", url: "/ops/scheduler",        icon: CalendarClock },
];

interface AppSidebarProps {
  brands?: AiMarketBrand[];
  selectedClientId?: string | null;
}

export function AppSidebar({ brands = [], selectedClientId = null }: AppSidebarProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [admin, setAdmin] = useState<AdminPayload | null>(null);

  useEffect(() => {
    getAdminInfo().then(setAdmin);
  }, []);

  const handleSignOut = () => {
    startTransition(async () => {
      await adminLogout();
    });
  };

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === url;
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  const initials = admin?.displayName?.charAt(0).toUpperCase()
    ?? admin?.username?.charAt(0).toUpperCase()
    ?? "A";

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
        {/* 메인 워크플로우 */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2">
            워크플로우
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
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

        {/* 에이전트 운영 모니터링 */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2">
            에이전트 운영
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {opsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
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
                  {admin?.role === "super_admin" ? "슈퍼 어드민" : admin?.role === "viewer" ? "뷰어" : "어드민"}
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
            {admin?.role === "super_admin" && (
              <DropdownMenuItem asChild>
                <Link href="/settings/admins">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  어드민 관리
                </Link>
              </DropdownMenuItem>
            )}
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
