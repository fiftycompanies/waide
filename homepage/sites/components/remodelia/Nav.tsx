"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { navItems } from "@/data/remodelia";

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
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
    <header
      className={`fixed top-0 left-0 right-0 z-[4] bg-white transition-shadow duration-300 ${
        scrolled ? "shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : ""
      }`}
    >
      <div className="max-w-[1920px] mx-auto px-5 md:px-10 h-[65px] flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="text-[#13130A] font-bold text-[18px] tracking-tight shrink-0 cursor-pointer"
        >
          리모델리아
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[14px] text-[#13130A] hover:opacity-60 transition-opacity"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#contact"
            className="ml-2 inline-flex items-center justify-center h-[50px] px-5 bg-[#13130A] text-white text-[14px] font-bold rounded-full hover:bg-[#2a2a1a] transition-colors"
          >
            상담신청
          </a>
        </nav>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-[#13130A] p-1"
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Full-screen Overlay */}
      <div
        className={`fixed inset-0 top-[65px] bg-white z-[3] transition-opacity duration-300 md:hidden ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <nav className="flex flex-col items-center gap-8 pt-16 px-6">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="text-[18px] text-[#13130A] hover:opacity-60 transition-opacity"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center justify-center h-[50px] px-8 bg-[#13130A] text-white text-[14px] font-bold rounded-full hover:bg-[#2a2a1a] transition-colors"
          >
            상담신청
          </a>
        </nav>
      </div>
    </header>
  );
}
