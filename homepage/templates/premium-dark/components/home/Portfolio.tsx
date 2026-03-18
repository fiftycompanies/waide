"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Portfolio as PortfolioType } from "@/data/config";

const FILTER_OPTIONS = ["전체", "거실", "주방", "욕실", "침실", "전체 리모델링"];

export default function Portfolio({ portfolios }: { portfolios: PortfolioType[] }) {
  const [filter, setFilter] = useState("전체");
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const filtered = filter === "전체"
    ? portfolios
    : portfolios.filter((p) => p.space_type === filter);

  const openLightbox = (portfolio: PortfolioType, imageIndex: number = 0) => {
    setLightbox({ images: portfolio.image_urls, index: imageIndex });
  };

  const closeLightbox = () => setLightbox(null);

  const prevImage = () => {
    if (!lightbox) return;
    setLightbox({
      ...lightbox,
      index: lightbox.index === 0 ? lightbox.images.length - 1 : lightbox.index - 1,
    });
  };

  const nextImage = () => {
    if (!lightbox) return;
    setLightbox({
      ...lightbox,
      index: lightbox.index === lightbox.images.length - 1 ? 0 : lightbox.index + 1,
    });
  };

  return (
    <section id="portfolio" className="section-padding">
      <div className="container-wide" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <div className="w-10 h-px bg-primary mx-auto mb-6" />
          <h2
            className="text-3xl md:text-5xl font-bold tracking-wide"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            PORTFOLIO
          </h2>
          <p className="text-text-secondary mt-4 max-w-lg mx-auto text-sm tracking-wide">
            엄선된 프리미엄 시공 사례를 확인해보세요
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-5 py-2 text-xs font-medium tracking-wider transition-all duration-300 ${
                filter === opt
                  ? "border border-primary text-primary bg-primary/10"
                  : "border border-border text-text-muted hover:border-text-muted hover:text-text-secondary"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Fullscreen Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <button
                  onClick={() => openLightbox(item)}
                  className="group block w-full relative aspect-[4/3] overflow-hidden cursor-pointer"
                >
                  {item.image_urls[0] ? (
                    <>
                      <img
                        src={item.image_urls[0]}
                        alt={item.title || "시공 사례"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-bg/0 group-hover:bg-bg/60 transition-all duration-500 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 text-center">
                          <p className="text-primary text-xs tracking-widest mb-2">VIEW</p>
                          <h3
                            className="text-text font-semibold text-lg"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {item.title || "시공 사례"}
                          </h3>
                          <div className="flex items-center gap-2 mt-2 justify-center text-xs text-text-secondary">
                            {item.space_type && <span>{item.space_type}</span>}
                            {item.area_pyeong && <span>{item.area_pyeong}평</span>}
                          </div>
                        </div>
                      </div>
                      {item.is_featured && (
                        <span className="absolute top-3 left-3 px-2 py-1 bg-primary text-bg text-[10px] font-medium tracking-wider">
                          FEATURED
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-bg-muted flex items-center justify-center text-text-muted text-sm">
                      사진 준비중
                    </div>
                  )}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-text-muted py-12 text-sm">
            해당 카테고리의 시공 사례가 없습니다
          </p>
        )}
      </div>

      {/* Fullscreen Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-sm flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 w-10 h-10 border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-text transition-colors"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 border border-border flex items-center justify-center text-text-muted hover:text-primary hover:border-primary transition-colors"
              aria-label="이전"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <img
              src={lightbox.images[lightbox.index]}
              alt={`이미지 ${lightbox.index + 1}`}
              className="max-h-[85vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 border border-border flex items-center justify-center text-text-muted hover:text-primary hover:border-primary transition-colors"
              aria-label="다음"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <p className="absolute bottom-6 text-xs text-text-muted tracking-widest">
              {lightbox.index + 1} / {lightbox.images.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
