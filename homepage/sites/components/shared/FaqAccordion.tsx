"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

export default function FaqAccordion({
  items,
  accentColor = "bg-gray-100",
}: {
  items: FaqItem[];
  accentColor?: string;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="border border-gray-200 rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className={`w-full flex items-center justify-between p-5 text-left hover:${accentColor} transition-colors`}
          >
            <span className="font-medium pr-4">{item.q}</span>
            <ChevronDown
              className={`h-5 w-5 text-gray-400 shrink-0 transition-transform duration-200 ${
                openIdx === i ? "rotate-180" : ""
              }`}
            />
          </button>
          <AnimatePresence>
            {openIdx === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">
                  {item.a}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
