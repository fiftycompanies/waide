"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface BeforeAfterSliderProps {
  beforeColor: string;
  afterColor: string;
  beforeLabel?: string;
  afterLabel?: string;
  title: string;
  height?: string;
}

export default function BeforeAfterSlider({
  beforeColor,
  afterColor,
  beforeLabel = "BEFORE",
  afterLabel = "AFTER",
  title,
  height = "aspect-[16/9]",
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 2));
    else if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 2));
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${height} max-w-4xl mx-auto rounded-2xl overflow-hidden cursor-col-resize select-none touch-none`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label={`${title} 시공 전후 비교 슬라이더`}
      aria-valuenow={Math.round(position)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* After (full background) */}
      <div className={`absolute inset-0 ${afterColor} flex items-center justify-center`}>
        <span className="text-white/30 text-2xl font-bold">시공 후</span>
      </div>

      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <div
          className={`${beforeColor} h-full flex items-center justify-center`}
          style={{
            width: containerWidth ? `${containerWidth}px` : "100vw",
          }}
        >
          <span className="text-white/30 text-2xl font-bold">시공 전</span>
        </div>
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M6 10L2 10M2 10L5 7M2 10L5 13M14 10L18 10M18 10L15 7M18 10L15 13"
              stroke="#666"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 z-20">
        <span className="px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-medium backdrop-blur-sm">
          {beforeLabel}
        </span>
      </div>
      <div className="absolute top-4 right-4 z-20">
        <span className="px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-medium backdrop-blur-sm">
          {afterLabel}
        </span>
      </div>
    </div>
  );
}
