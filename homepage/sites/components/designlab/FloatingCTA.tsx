"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FloatingCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 200);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Desktop: Pill shape, bottom-right */}
          <motion.a
            href="#contact"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="hidden xl:flex fixed bottom-[2.4rem] right-[2.4rem] z-50 bg-white text-black text-[1.3rem] font-semibold rounded-[99.9rem] px-[2rem] py-[1.2rem] items-center justify-center hover:bg-black hover:text-white transition-colors duration-300"
            style={{ boxShadow: "0 0.8rem 2.4rem rgba(0,0,0,0.2)" }}
          >
            상담 신청하기
          </motion.a>

          {/* Mobile: Full-width bottom bar */}
          <motion.a
            href="#contact"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-black text-white text-[1.3rem] font-semibold text-center py-[1.2rem] border-t border-white/10"
          >
            상담 신청하기
          </motion.a>
        </>
      )}
    </AnimatePresence>
  );
}
