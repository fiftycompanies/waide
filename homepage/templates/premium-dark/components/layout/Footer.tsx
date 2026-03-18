import Link from "next/link";
import { Instagram, Youtube, MapPin, Phone, Clock } from "lucide-react";
import type { CompanyConfig } from "@/data/config";

export default function Footer({ company }: { company: CompanyConfig }) {
  return (
    <footer className="bg-bg border-t border-border py-20">
      <div className="container-wide">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Company Info */}
          <div>
            <h3
              className="text-lg font-semibold mb-4 tracking-wide"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {company.name}
            </h3>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              {company.description}
            </p>
            <div className="space-y-3 text-sm text-text-muted">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span>{company.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <a href={`tel:${company.phone}`} className="hover:text-primary transition-colors">
                  {company.phone}
                </a>
              </div>
              {company.operatingHours && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  <span>{company.operatingHours}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-medium tracking-widest text-text-secondary mb-4">
              NAVIGATION
            </h4>
            <ul className="space-y-3 text-sm text-text-muted">
              <li><Link href="#portfolio" className="hover:text-primary transition-colors">시공사례</Link></li>
              <li><Link href="#services" className="hover:text-primary transition-colors">서비스</Link></li>
              <li><Link href="#reviews" className="hover:text-primary transition-colors">고객후기</Link></li>
              <li><Link href="/blog" className="hover:text-primary transition-colors">블로그</Link></li>
              <li><Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link href="#contact" className="hover:text-primary transition-colors">상담신청</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-xs font-medium tracking-widest text-text-secondary mb-4">
              SOCIAL
            </h4>
            <div className="flex items-center gap-3">
              {company.instagram && (
                <a href={company.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-border flex items-center justify-center hover:border-primary transition-colors">
                  <Instagram className="h-4 w-4 text-text-muted" />
                </a>
              )}
              {company.youtube && (
                <a href={company.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-border flex items-center justify-center hover:border-primary transition-colors">
                  <Youtube className="h-4 w-4 text-text-muted" />
                </a>
              )}
              {company.naverPlace && (
                <a href={company.naverPlace} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-border flex items-center justify-center hover:border-primary transition-colors text-xs font-bold text-text-muted">
                  N
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-text-muted">
          <p>&copy; {new Date().getFullYear()} {company.name}. All rights reserved.</p>
          {company.businessNumber && (
            <p>사업자등록번호: {company.businessNumber}</p>
          )}
        </div>
      </div>
    </footer>
  );
}
