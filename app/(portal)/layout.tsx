import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/portal-shell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // 미인증 → 로그인
  if (!user) {
    redirect("/login");
  }

  // client_id 없는 사용자 → 대기 안내
  if (!user.client_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-2xl">⏳</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">계정 활성화 대기 중</h2>
          <p className="text-gray-600 text-sm">
            관리자가 계정을 활성화하면 포털을 이용할 수 있습니다.
            분석을 먼저 진행하시면 바로 프로젝트를 시작할 수 있어요.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <a
              href="/"
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              무료 분석 받기
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PortalShell
      userName={user.name || ""}
      userEmail={user.email || ""}
      userId={user.id}
      clientId={user.client_id}
      brandName={user.client_brand_name || ""}
    >
      {children}
    </PortalShell>
  );
}
