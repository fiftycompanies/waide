import Link from "next/link";
import { Logo } from "@/components/logo";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="waide-dark min-h-screen">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#2a2a2a]/60 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-3.5">
          <nav className="flex items-center justify-between">
            <Link href="/">
              <Logo variant="light" size="md" />
            </Link>
            <Link
              href="/login"
              className="text-sm text-[#666666] hover:text-white transition-colors"
            >
              로그인
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="pt-[57px]">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] py-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#666666] text-sm">
              &copy; 2026 Waide. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-[#666666]">
              <span className="hover:text-[#a0a0a0] cursor-pointer transition-colors">이용약관</span>
              <span className="hover:text-[#a0a0a0] cursor-pointer transition-colors">개인정보처리방침</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
