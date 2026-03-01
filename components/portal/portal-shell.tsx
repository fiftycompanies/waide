"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import {
  BarChart2,
  FileText,
  Home,
  Key,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { portalSignOut } from "@/lib/actions/auth-actions";

const navItems = [
  { title: "대시보드", url: "/portal", icon: Home },
  { title: "키워드 관리", url: "/portal/keywords", icon: Key },
  { title: "콘텐츠 현황", url: "/portal/contents", icon: FileText },
  { title: "월간 리포트", url: "/portal/reports", icon: BarChart2 },
  { title: "설정", url: "/portal/settings", icon: Settings },
];

interface PortalShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userId: string;
  clientId: string;
  brandName: string;
}

export function PortalShell({
  children,
  userName,
  userEmail,
  userId,
  clientId,
  brandName,
}: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isActive = (url: string) => {
    if (url === "/portal") return pathname === url;
    return pathname.startsWith(url);
  };

  const handleLogout = () => {
    startTransition(async () => {
      await portalSignOut();
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/portal">
                <Logo size="sm" variant="dark" />
              </Link>
              {brandName && (
                <span className="hidden sm:block text-sm font-medium text-gray-600 border-l pl-4">
                  {brandName}
                </span>
              )}
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.url}
                  href={item.url}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive(item.url)
                      ? "bg-emerald-50 text-emerald-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              ))}
            </nav>

            {/* User menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={isPending}
                className="p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="로그아웃"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white md:hidden">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.url}
              href={item.url}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${
                isActive(item.url)
                  ? "text-emerald-600 font-medium"
                  : "text-gray-400"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          ))}
        </div>
      </nav>

      {/* Hidden meta for client pages to read clientId/userId */}
      <meta name="portal-client-id" content={clientId} />
      <meta name="portal-user-id" content={userId} />

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  );
}
