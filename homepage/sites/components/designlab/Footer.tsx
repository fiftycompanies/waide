import { footerLinks } from "@/data/designlab";

export default function Footer() {
  return (
    <footer className="bg-black">
      {/* Top Divider */}
      <div className="px-4 xl:px-[5.6rem] max-w-[176rem] mx-auto">
        <div className="border-t border-white/10" />
      </div>

      <div className="px-4 xl:px-[5.6rem] max-w-[176rem] mx-auto py-16 xl:py-20">
        {/* 4 Columns */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-8 xl:gap-12 mb-16 xl:mb-20">
          {/* Column 1: Navigation */}
          <div>
            <p className="text-white text-[1.2rem] font-semibold mb-6">
              네비게이션
            </p>
            <nav className="flex flex-col gap-3">
              {footerLinks.navigation.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-designlab-gray text-[1.2rem] font-normal hover:text-white transition-colors duration-300"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Column 2: Customer Service */}
          <div>
            <p className="text-white text-[1.2rem] font-semibold mb-6">
              고객센터
            </p>
            <div className="space-y-2">
              <p className="text-white text-[1.2rem] font-normal">
                {footerLinks.customerService.phone}
              </p>
              <p className="text-designlab-gray text-[1.2rem] font-normal">
                {footerLinks.customerService.hours}
              </p>
              <p className="text-designlab-gray text-[1.2rem] font-normal">
                {footerLinks.customerService.holiday}
              </p>
            </div>
          </div>

          {/* Column 3: Usage Info */}
          <div>
            <p className="text-white text-[1.2rem] font-semibold mb-6">
              이용안내
            </p>
            <nav className="flex flex-col gap-3">
              {footerLinks.usageInfo.map((link) =>
                link.href ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-designlab-gray text-[1.2rem] font-normal hover:text-white transition-colors duration-300"
                  >
                    {link.label}
                  </a>
                ) : (
                  <span
                    key={link.label}
                    className="text-designlab-gray text-[1.2rem] font-normal cursor-default"
                  >
                    {link.label}
                  </span>
                )
              )}
            </nav>
          </div>

          {/* Column 4: Company Info */}
          <div>
            <p className="text-white text-[1.2rem] font-semibold mb-6">
              회사정보
            </p>
            <div className="space-y-2">
              <p className="text-designlab-gray text-[1.2rem] font-normal">
                대표: {footerLinks.companyInfo.ceo}
              </p>
              <p className="text-designlab-gray text-[1.2rem] font-normal">
                {footerLinks.companyInfo.address}
              </p>
              <p className="text-designlab-gray text-[1.2rem] font-normal">
                사업자등록번호: {footerLinks.companyInfo.businessNumber}
              </p>
              <p className="text-designlab-gray text-[1.2rem] font-normal">
                {footerLinks.companyInfo.email}
              </p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 pt-8">
          <p className="text-designlab-gray/60 text-[1.2rem] font-normal">
            &copy; 2024 designlab. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
