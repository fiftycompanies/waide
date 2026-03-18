"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Phone } from "lucide-react";

interface NavProps {
  companyName: string;
  logo?: string | null;
  phone: string;
}

const NAV_LINKS = [
  { href: "#portfolio", label: "PORTFOLIO" },
  { href: "#services", label: "SERVICE" },
  { href: "#reviews", label: "REVIEWS" },
  { href: "/blog", label: "BLOG" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "CONTACT" },
];

export default function Nav({ companyName, logo, phone }: NavProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-bg/95 backdrop-blur-lg border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container-wide flex items-center justify-between h-20">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt={companyName} className="h-8 w-auto" />
          ) : (
            <span
              className="text-xl font-semibold tracking-wide text-text"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {companyName}
            </span>
          )}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-medium tracking-widest text-text-secondary hover:text-primary transition-colors duration-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
            {phone}
          </a>
          <Link
            href="#contact"
            className="px-5 py-2.5 border border-primary text-primary text-xs font-medium tracking-wider hover:bg-primary hover:text-bg transition-all duration-300"
          >
            CONSULTATION
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-text"
          aria-label="메뉴"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-bg border-t border-border">
          <nav className="container-wide py-6 flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-xs font-medium tracking-widest text-text-secondary hover:text-primary py-2 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1.5 text-xs font-medium text-primary py-2"
            >
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
