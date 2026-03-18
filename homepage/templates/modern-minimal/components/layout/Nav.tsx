"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Phone } from "lucide-react";

interface NavProps {
  companyName: string;
  logo?: string | null;
  phone: string;
}

const NAV_LINKS = [
  { href: "#portfolio", label: "시공사례" },
  { href: "#services", label: "서비스" },
  { href: "#reviews", label: "고객후기" },
  { href: "/blog", label: "블로그" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "상담신청" },
];

export default function Nav({ companyName, logo, phone }: NavProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border-light">
      <div className="container-wide flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt={companyName} className="h-8 w-auto" />
          ) : (
            <span className="text-xl font-bold text-text">{companyName}</span>
          )}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary"
          >
            <Phone className="h-4 w-4" />
            {phone}
          </a>
          <Link
            href="#contact"
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            무료 상담
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2"
          aria-label="메뉴"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t">
          <nav className="container-wide py-4 flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-text-secondary hover:text-primary py-2"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1.5 text-sm font-medium text-primary py-2"
            >
              <Phone className="h-4 w-4" />
              {phone}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
