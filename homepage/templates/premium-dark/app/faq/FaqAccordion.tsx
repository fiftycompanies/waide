"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import type { FaqItem } from "@/data/config";

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="border-t border-border">
      {items.map((item, i) => (
        <div key={i} className="border-b border-border">
          <button
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="w-full flex items-center justify-between py-6 text-left hover:text-primary transition-colors duration-300"
          >
            <span className="font-medium pr-4 text-sm tracking-wide">{item.q}</span>
            {openIdx === i ? (
              <Minus className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Plus className="h-4 w-4 text-text-muted shrink-0" />
            )}
          </button>
          <AnimatePresence>
            {openIdx === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="pb-6 text-sm text-text-muted leading-relaxed">{item.a}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
