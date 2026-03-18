import {
  Settings,
  Key,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">설정</h1>
        <p className="text-muted-foreground">
          계정 및 워크스페이스 설정을 관리합니다
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/settings/account">
          <Card className="border-border/40 hover:border-border transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Key className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base">계정 설정</CardTitle>
                  <CardDescription>비밀번호 변경</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/admins">
          <Card className="border-border/40 hover:border-border transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                  <ShieldCheck className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="text-base">어드민 관리</CardTitle>
                  <CardDescription>관리자 계정 관리</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Coming Soon */}
      <Card className="border-border/40 border-dashed">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Wrench className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">추가 설정 준비 중</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            테마, 알림, 팀 관리 등의 기능이 빠른 시일 내에 제공될 예정입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
