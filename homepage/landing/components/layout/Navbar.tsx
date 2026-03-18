"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "#service", label: "서비스" },
  { href: "#why-blog", label: "왜 홈페이지 블로그?" },
  { href: "#process", label: "진행 프로세스" },
  { href: "#pricing", label: "가격" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-border-light"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center"
            >
              <span
                className={`text-xl lg:text-2xl font-extrabold tracking-tight transition-colors duration-300`}
              >
                <span className="text-accent">WIDE</span>
                <span
                  className={`${
                    scrolled ? "text-primary" : "text-white"
                  } transition-colors duration-300`}
                >
                  WILD
                </span>
              </span>
            </a>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    scrolled
                      ? "text-text-secondary hover:text-primary hover:bg-surface-alt"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => handleNavClick("#contact")}
                className={`ml-3 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  scrolled
                    ? "bg-accent text-white hover:bg-accent-hover shadow-sm"
                    : "bg-white text-primary hover:bg-white/90"
                }`}
              >
                상담 신청
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                scrolled
                  ? "text-primary hover:bg-surface-alt"
                  : "text-white hover:bg-white/10"
              }`}
              aria-label="메뉴 열기"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 md:hidden bg-white/95 backdrop-blur-md shadow-lg border-b border-border"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="block w-full text-left px-4 py-3 rounded-lg text-text-secondary hover:text-primary hover:bg-surface-alt text-sm font-medium transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => handleNavClick("#contact")}
                className="block w-full mt-2 px-4 py-3 rounded-lg bg-accent text-white text-sm font-semibold text-center hover:bg-accent-hover transition-colors"
              >
                상담 신청
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
