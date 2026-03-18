"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/data/config";

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="border border-border-light rounded-3xl overflow-hidden bg-surface">
          <button
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-bg-soft transition-colors"
          >
            <span className="font-medium pr-4" style={{ fontFamily: "var(--font-heading)" }}>
              {item.q}
            </span>
            <ChevronDown className={`h-5 w-5 text-text-muted shrink-0 transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {openIdx === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-5 pb-5 text-sm text-text-secondary leading-relaxed">{item.a}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
