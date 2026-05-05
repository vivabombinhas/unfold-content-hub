import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface SideSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
  /**
   * width on desktop. Defaults to 'lg' (640px).
   */
  width?: "md" | "lg" | "xl";
  /**
   * Visual theme of the sheet
   */
  tone?: "dark" | "cream";
}

const widths = {
  md: "md:max-w-[520px]",
  lg: "md:max-w-[640px]",
  xl: "md:max-w-[820px]",
};

/**
 * SideSheet — desktop: slide from right; mobile: bottom-sheet with drag handle.
 * SEO-safe: children are always present in the DOM (CSS-hidden when closed),
 * so Google indexes everything inside.
 */
export const SideSheet = ({
  open,
  onClose,
  title,
  eyebrow,
  children,
  width = "lg",
  tone = "dark",
}: SideSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Drag-to-close on mobile
  useEffect(() => {
    if (!open || !isMobile) return;
    const el = sheetRef.current;
    if (!el) return;
    let startY = 0;
    let dy = 0;
    let dragging = false;
    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop > 0) return;
      startY = e.touches[0].clientY;
      dragging = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging) return;
      dy = e.touches[0].clientY - startY;
      if (dy > 0) el.style.transform = `translateY(${dy}px)`;
    };
    const onTouchEnd = () => {
      if (!dragging) return;
      dragging = false;
      el.style.transform = "";
      if (dy > 120) onClose();
      dy = 0;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [open, isMobile, onClose]);

  const toneCls =
    tone === "cream"
      ? "bg-brand-cream text-brand-text-dark"
      : "bg-brand-green-2 text-brand-text-light";

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[120] transition-opacity duration-500",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop with blur + vignette */}
      <button
        aria-label="Fechar"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-500",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "sidesheet-title" : undefined}
        className={cn(
          "absolute flex flex-col shadow-2xl",
          // Mobile: bottom sheet
          "inset-x-0 bottom-0 max-h-[92vh] rounded-t-[20px]",
          // Desktop: right side sheet, full height constrained
          "md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:rounded-none md:w-full",
          widths[width],
          toneCls,
          "transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          open
            ? "translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:translate-x-full",
          "overflow-hidden border-t md:border-t-0 md:border-l border-brand-gold/20"
        )}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-brand-gold/40" />
        </div>

        {/* Header */}
        <header
          className={cn(
            "flex items-start justify-between gap-4 px-6 md:px-10 py-5 md:py-7 border-b",
            tone === "cream" ? "border-brand-text-dark/10" : "border-brand-gold/15"
          )}
        >
          <div className="min-w-0">
            {eyebrow && <span className="eyebrow text-[10px]">{eyebrow}</span>}
            {title && (
              <h2 id="sidesheet-title" className="h-display-3 md:h-display-2 mt-2 text-balance">
                {title}
              </h2>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className={cn(
              "shrink-0 size-10 grid place-items-center rounded-full transition-colors",
              tone === "cream"
                ? "bg-brand-text-dark/5 hover:bg-brand-text-dark/10 text-brand-text-dark"
                : "bg-white/5 hover:bg-white/10 text-brand-text-light"
            )}
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-gold px-6 md:px-10 py-6 md:py-8">
          {children}
        </div>
      </div>
    </div>
  );
};