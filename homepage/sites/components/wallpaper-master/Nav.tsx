"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { navItems } from "@/data/wallpaper-master";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white shadow-md"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[70px] max-w-[1260px] items-center justify-between px-6">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="text-xl font-bold text-wallpaper-blue cursor-pointer"
        >
          벽지마스터
        </button>

        {/* Desktop Links */}
        <ul className="hidden items-center gap-8 md:flex">
          {navItems.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`text-sm transition-colors ${
                  scrolled
                    ? "text-wallpaper-text hover:text-wallpaper-blue"
                    : "text-white hover:text-wallpaper-blue"
                }`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`p-1 md:hidden ${scrolled ? "text-wallpaper-dark" : "text-white"}`}
          aria-label="메뉴 열기"
        >
          {mobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Slide Panel */}
      <div
        className={`fixed inset-0 top-[70px] bg-white transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <ul className="flex flex-col items-center gap-8 pt-16">
          {navItems.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-lg text-wallpaper-text transition-colors hover:text-wallpaper-blue"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#estimate"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-12 items-center rounded-[30px] bg-wallpaper-blue px-8 font-semibold text-white transition-colors hover:bg-wallpaper-blue-dark"
            >
              견적문의
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
