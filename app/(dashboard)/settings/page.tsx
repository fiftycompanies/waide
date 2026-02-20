"use client";

import { useState } from "react";
import {
  Bell,
  CreditCard,
  Globe,
  Key,
  Moon,
  Palette,
  Save,
  Shield,
  Sun,
  User,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    language: "ko",
  });

  const handleSave = () => {
    setIsLoading(true);
    // Mock save
    setTimeout(() => {
      toast.success("설정이 저장되었습니다.");
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">설정</h1>
        <p className="text-muted-foreground">
          계정 및 워크스페이스 설정을 관리합니다
        </p>
      </div>

      {/* Profile Settings */}
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <User className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <CardTitle>프로필</CardTitle>
              <CardDescription>개인 정보를 관리합니다</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                placeholder="홍길동"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "저장 중..." : "변경사항 저장"}
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Palette className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle>모양새</CardTitle>
              <CardDescription>테마와 언어를 설정합니다</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>테마</Label>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 justify-start gap-2">
                <Sun className="h-4 w-4" />
                라이트
              </Button>
              <Button variant="outline" className="flex-1 justify-start gap-2">
                <Moon className="h-4 w-4" />
                다크
              </Button>
              <Button
                variant="default"
                className="flex-1 justify-start gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500"
              >
                <Globe className="h-4 w-4" />
                시스템
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">언어</Label>
            <select
              id="language"
              className="w-full p-2 rounded-md border border-border bg-background"
              value={formData.language}
              onChange={(e) =>
                setFormData({ ...formData, language: e.target.value })
              }
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Bell className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle>알림</CardTitle>
              <CardDescription>알림 설정을 관리합니다</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: "마케팅 이메일", description: "프로모션 및 업데이트" },
              { label: "제품 알림", description: "새로운 기능 및 변경사항" },
              { label: "보안 알림", description: "계정 보안 관련 알림" },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={index === 2}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Subscription */}
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <CreditCard className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <CardTitle>요금제</CardTitle>
                <CardDescription>
                  현재 구독 정보를 확인하고 관리합니다
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-600">FREE</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg border border-border/40 bg-muted/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">무료 플랜</p>
                <p className="text-sm text-muted-foreground">
                  월 10개 콘텐츠 생성 가능
                </p>
              </div>
              <Button variant="outline">업그레이드</Button>
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">사용량: </span>
                <span className="font-medium">3 / 10</span>
              </div>
              <div>
                <span className="text-muted-foreground">갱신일: </span>
                <span className="font-medium">2026년 3월 1일</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <Shield className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <CardTitle>보안</CardTitle>
              <CardDescription>계정 보안 설정을 관리합니다</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">비밀번호 변경</p>
              <p className="text-sm text-muted-foreground">
                비밀번호를 주기적으로 변경하세요
              </p>
            </div>
            <Button variant="outline">
              <Key className="h-4 w-4 mr-2" />
              변경
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-red-500">계정 삭제</p>
              <p className="text-sm text-muted-foreground">
                모든 데이터가 영구적으로 삭제됩니다
              </p>
            </div>
            <Button variant="destructive">삭제</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
