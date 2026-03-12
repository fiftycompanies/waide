"use client";

import { useState } from "react";
import {
  Crown,
  Mail,
  MoreVertical,
  Plus,
  Shield,
  User,
  UserPlus,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// Mock team members data
const mockTeamMembers = [
  {
    id: "1",
    name: "나",
    email: "me@example.com",
    role: "OWNER",
    avatarUrl: null,
    joinedAt: new Date().toISOString(),
  },
];

const roleConfig = {
  OWNER: {
    label: "소유자",
    color: "bg-amber-500/10 text-amber-600",
    icon: Crown,
  },
  ADMIN: {
    label: "관리자",
    color: "bg-violet-500/10 text-violet-600",
    icon: Shield,
  },
  MEMBER: {
    label: "멤버",
    color: "bg-slate-500/10 text-slate-600",
    icon: User,
  },
};

export default function TeamPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }

    // Mock invite - in production, this would call a server action
    toast.success(`${inviteEmail}에게 초대장을 보냈습니다!`);
    setInviteEmail("");
    setIsInviteOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">팀 관리</h1>
          <p className="text-muted-foreground">
            워크스페이스 멤버를 관리하고 초대합니다
          </p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
              <UserPlus className="h-4 w-4 mr-2" />
              멤버 초대
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>팀원 초대</DialogTitle>
              <DialogDescription>
                이메일 주소를 입력하여 새 팀원을 초대하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일 주소</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                취소
              </Button>
              <Button onClick={handleInvite}>
                <Mail className="h-4 w-4 mr-2" />
                초대 보내기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/40">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <User className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockTeamMembers.length}</p>
                <p className="text-xs text-muted-foreground">총 멤버</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Crown className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {mockTeamMembers.filter((m) => m.role === "OWNER").length}
                </p>
                <p className="text-xs text-muted-foreground">소유자</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Plus className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">무제한</p>
                <p className="text-xs text-muted-foreground">초대 가능</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle>팀 멤버</CardTitle>
          <CardDescription>
            워크스페이스에 참여 중인 모든 멤버 목록입니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTeamMembers.map((member) => {
              const roleInfo =
                roleConfig[member.role as keyof typeof roleConfig] ||
                roleConfig.MEMBER;
              const RoleIcon = roleInfo.icon;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${roleInfo.color} gap-1`}>
                      <RoleIcon className="h-3 w-3" />
                      {roleInfo.label}
                    </Badge>
                    {member.role !== "OWNER" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>역할 변경</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500">
                            멤버 제거
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      <Card className="border-border/40 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <Mail className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center">
            대기 중인 초대가 없습니다
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
