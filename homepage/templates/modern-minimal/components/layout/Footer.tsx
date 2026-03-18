import Link from "next/link";
import { Instagram, Youtube, MapPin, Phone, Clock } from "lucide-react";
import type { CompanyConfig } from "@/data/config";

export default function Footer({ company }: { company: CompanyConfig }) {
  return (
    <footer className="bg-bg-muted border-t border-border py-16">
      <div className="container-wide">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-bold mb-3">{company.name}</h3>
            <p className="text-sm text-text-secondary mb-4">{company.description}</p>
            <div className="space-y-2 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{company.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:${company.phone}`} className="hover:text-primary">
                  {company.phone}
                </a>
              </div>
              {company.operatingHours && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>{company.operatingHours}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-3">바로가기</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li><Link href="#portfolio" className="hover:text-primary">시공사례</Link></li>
              <li><Link href="#services" className="hover:text-primary">서비스</Link></li>
              <li><Link href="#reviews" className="hover:text-primary">고객후기</Link></li>
              <li><Link href="/blog" className="hover:text-primary">블로그</Link></li>
              <li><Link href="#contact" className="hover:text-primary">상담신청</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold mb-3">SNS</h4>
            <div className="flex items-center gap-3">
              {company.instagram && (
                <a href={company.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white border hover:border-primary transition-colors">
                  <Instagram className="h-5 w-5 text-text-secondary" />
                </a>
              )}
              {company.youtube && (
                <a href={company.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white border hover:border-primary transition-colors">
                  <Youtube className="h-5 w-5 text-text-secondary" />
                </a>
              )}
              {company.naverPlace && (
                <a href={company.naverPlace} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white border hover:border-primary transition-colors text-xs font-bold text-text-secondary">
                  N
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-text-muted">
          <p>&copy; {new Date().getFullYear()} {company.name}. All rights reserved.</p>
          {company.businessNumber && (
            <p>사업자등록번호: {company.businessNumber}</p>
          )}
        </div>
      </div>
    </footer>
  );
}
