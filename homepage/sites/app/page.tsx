import Link from "next/link";

const sites = [
  {
    name: "리모델리아",
    nameEn: "REMODELIA",
    path: "/templates/remodeling",
    type: "리모델링",
    tagline: "기대와 설렘이 가득한 리모델링 경험",
    description: "아파트 리모델링 전문 — 모던 미니멀 디자인",
    gradient: "from-gray-900 to-black",
    accent: "bg-[#f5c518]",
    accentText: "text-[#f5c518]",
  },
  {
    name: "벽지마스터",
    nameEn: "WALLPAPER MASTER",
    path: "/templates/wallpaper",
    type: "도배·바닥재",
    tagline: "후회없는 도배, 실무자들이 직접 시공",
    description: "도배·바닥재 시공 전문 — 클린 화이트 테마",
    gradient: "from-teal-700 to-teal-900",
    accent: "bg-[#2a9d8f]",
    accentText: "text-[#2a9d8f]",
  },
  {
    name: "디자인랩",
    nameEn: "DESIGNLAB",
    path: "/templates/premium",
    type: "프리미엄",
    tagline: "공간이 생각과 행동, 삶을 바꿉니다",
    description: "프리미엄 인테리어 디자인 스튜디오 — 다크 럭셔리",
    gradient: "from-neutral-900 to-black",
    accent: "bg-[#c8a45c]",
    accentText: "text-[#c8a45c]",
  },
];

export default function IndexPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="pt-20 pb-16 px-6 text-center">
        <p className="text-sm tracking-[0.3em] text-gray-500 uppercase mb-4">
          Interior Portfolio
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
          인테리어 포트폴리오
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          다양한 컨셉의 인테리어 홈페이지 포트폴리오입니다.
          <br className="hidden md:block" />
          각 사이트를 클릭하여 확인해보세요.
        </p>
      </header>

      {/* Sites Grid */}
      <main className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {sites.map((site) => (
            <Link
              key={site.path}
              href={site.path}
              className="group block"
            >
              <div className="rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1">
                {/* Preview area */}
                <div
                  className={`h-64 bg-gradient-to-br ${site.gradient} relative flex items-center justify-center`}
                >
                  <div className="text-center">
                    <p className="text-[10px] tracking-[0.15em] text-white/30 mb-1">
                      {site.type}
                    </p>
                    <p className="text-xs tracking-[0.2em] text-white/40 mb-2">
                      {site.nameEn}
                    </p>
                    <p className="text-2xl font-bold text-white/90">
                      {site.name}
                    </p>
                  </div>
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-1 ${site.accent}`}
                  />
                </div>

                {/* Info */}
                <div className="p-6 bg-[#141414]">
                  <h2 className="text-xl font-bold mb-1">{site.name}</h2>
                  <p className={`text-sm ${site.accentText} mb-3`}>
                    {site.tagline}
                  </p>
                  <p className="text-sm text-gray-500">{site.description}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-400 group-hover:text-white transition-colors">
                    <span>사이트 보기</span>
                    <span className="group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6 text-center text-sm text-gray-600">
        <p>Interior Portfolio — Built with Next.js & Tailwind CSS</p>
      </footer>
    </div>
  );
}
