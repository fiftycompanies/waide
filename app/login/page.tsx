"use client";

import { useActionState, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react";
import { login, signup, type AuthState } from "@/lib/actions/auth-actions";
import { Logo, LogoIcon } from "@/components/logo";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  // Form states using useActionState
  const [loginState, loginAction, isLoginPending] = useActionState<AuthState | null, FormData>(
    login,
    null
  );
  const [signupState, signupAction, isSignupPending] = useActionState<AuthState | null, FormData>(
    signup,
    null
  );

  return (
    <Card className="w-full max-w-md relative bg-background/95 backdrop-blur-sm border-border/50 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <CardDescription className="text-base">
          24시간 쉬지 않는 AI 지배인
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="signup">회원가입</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <form action={loginAction} className="space-y-4">
              {/* Error Alert */}
              {loginState?.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginState.error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="login-email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="hello@example.com"
                    className="pl-10"
                    required
                  />
                </div>
                {loginState?.fieldErrors?.email && (
                  <p className="text-sm text-destructive">
                    {loginState.fieldErrors.email[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
                {loginState?.fieldErrors?.password && (
                  <p className="text-sm text-destructive">
                    {loginState.fieldErrors.password[0]}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                disabled={isLoginPending}
              >
                {isLoginPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    로그인 중...
                  </>
                ) : (
                  "로그인"
                )}
              </Button>
            </form>
          </TabsContent>

          {/* Signup Tab */}
          <TabsContent value="signup">
            <form action={signupAction} className="space-y-4">
              {/* Success Alert (email verification) */}
              {signupState?.success && signupState?.error && (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription>{signupState.error}</AlertDescription>
                </Alert>
              )}

              {/* Error Alert */}
              {!signupState?.success && signupState?.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{signupState.error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="signup-name">이름 (선택)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    placeholder="홍길동"
                    className="pl-10"
                  />
                </div>
                {signupState?.fieldErrors?.fullName && (
                  <p className="text-sm text-destructive">
                    {signupState.fieldErrors.fullName[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="hello@example.com"
                    className="pl-10"
                    required
                  />
                </div>
                {signupState?.fieldErrors?.email && (
                  <p className="text-sm text-destructive">
                    {signupState.fieldErrors.email[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="최소 6자 이상"
                    className="pl-10"
                    required
                  />
                </div>
                {signupState?.fieldErrors?.password && (
                  <p className="text-sm text-destructive">
                    {signupState.fieldErrors.password[0]}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                disabled={isSignupPending}
              >
                {isSignupPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    가입 중...
                  </>
                ) : (
                  "회원가입"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground">
        <p>
          계속 진행하면{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            이용약관
          </Link>{" "}
          및{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            개인정보처리방침
          </Link>
          에 동의하게 됩니다.
        </p>
      </CardFooter>
    </Card>
  );
}

function LoginFallback() {
  return (
    <Card className="w-full max-w-md relative bg-background/95 backdrop-blur-sm border-border/50 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <CardDescription className="text-base">
          24시간 쉬지 않는 AI 지배인
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-slate-500/10 to-transparent rounded-full blur-3xl" />
      </div>

      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
