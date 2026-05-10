import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface BeforeAfterProps {
  before: string;
  after: string;
  beforeAlt?: string;
  afterAlt?: string;
  className?: string;
}

/**
 * Editorial before/after slider — touch + mouse, premium handle.
 */
export const BeforeAfter = ({ before, after, beforeAlt = "Antes", afterAlt = "Depois", className }: BeforeAfterProps) => {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const next = ((clientX - r.left) / r.width) * 100;
    setPos(Math.max(0, Math.min(100, next)));
  }, []);

  return (
    <div
      ref={ref}
      className={cn("relative w-full aspect-[4/5] overflow-hidden bg-brand-graphite select-none touch-none cursor-ew-resize", className)}
      onMouseDown={(e) => {
        dragging.current = true;
        move(e.clientX);
      }}
      onMouseMove={(e) => dragging.current && move(e.clientX)}
      onMouseUp={() => (dragging.current = false)}
      onMouseLeave={() => (dragging.current = false)}
      onTouchStart={(e) => move(e.touches[0].clientX)}
      onTouchMove={(e) => move(e.touches[0].clientX)}
    >
      <img
        src={after}
        alt={afterAlt}
        width={600}
        height={750}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img
          src={before}
          alt={beforeAlt}
          width={600}
          height={750}
          className="absolute inset-0 h-full object-cover"
          style={{ width: ref.current?.getBoundingClientRect().width || "100%", maxWidth: "none" }}
          loading="lazy"
        />
      </div>

      {/* Labels */}
      <span className="absolute top-4 left-4 text-[10px] font-body font-semibold uppercase tracking-[0.2em] bg-black/60 text-brand-text-light px-3 py-1.5 backdrop-blur-sm">
        Antes
      </span>
      <span className="absolute top-4 right-4 text-[10px] font-body font-semibold uppercase tracking-[0.2em] bg-brand-gold text-brand-green px-3 py-1.5">
        Depois
      </span>

      {/* Divider + handle */}
      <div
        className="absolute top-0 bottom-0 w-px bg-brand-gold pointer-events-none"
        style={{ left: `${pos}%` }}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-12 rounded-full bg-brand-gold border-2 border-brand-cream grid place-items-center shadow-[var(--shadow-gold)]"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};