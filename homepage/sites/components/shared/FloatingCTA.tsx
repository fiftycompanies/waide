"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

interface FloatingCTAProps {
  phone: string;
  kakaoLink?: string;
  bgColor?: string;
  hoverColor?: string;
}

export default function FloatingCTA({
  phone,
  kakaoLink,
  bgColor = "bg-gray-900",
  hoverColor = "hover:bg-gray-800",
}: FloatingCTAProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="mb-3 bg-white rounded-2xl shadow-2xl p-4 min-w-[200px]"
          >
            <p className="text-sm font-medium text-gray-900 mb-3">
              상담 문의하기
            </p>
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors mb-2"
            >
              <span>📞</span>
              <span>{phone}</span>
            </a>
            {kakaoLink && (
              <a
                href={kakaoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#FEE500] rounded-lg text-sm hover:bg-[#FDD800] transition-colors"
              >
                <span>💬</span>
                <span>카카오톡 상담</span>
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full ${bgColor} ${hoverColor} text-white shadow-lg flex items-center justify-center transition-colors`}
        aria-label="상담 문의"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}
