import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineExpandProps {
  question: string;
  children: React.ReactNode;
  /**
   * Visual tone — adapts to dark or cream backgrounds.
   */
  tone?: "dark" | "cream";
  defaultOpen?: boolean;
}

/**
 * Editorial accordion item — gold rule, smooth height transition,
 * +/− icon. Always rendered in the DOM for SEO.
 */
export const InlineExpand = ({ question, children, tone = "dark", defaultOpen = false }: InlineExpandProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | "auto">(defaultOpen ? "auto" : 0);

  useEffect(() => {
    if (!ref.current) return;
    if (open) {
      setH(ref.current.scrollHeight);
      const t = setTimeout(() => setH("auto"), 600);
      return () => clearTimeout(t);
    } else {
      // measure first to allow transition from auto -> 0
      setH(ref.current.scrollHeight);
      requestAnimationFrame(() => setH(0));
    }
  }, [open]);

  const isDark = tone === "dark";

  return (
    <div
      className={cn(
        "border-b transition-colors",
        isDark ? "border-brand-gold/15" : "border-brand-text-dark/10"
      )}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center justify-between gap-6 py-6 text-left group transition-colors",
          isDark ? "hover:text-brand-gold" : "hover:text-brand-green"
        )}
      >
        <span
          className={cn(
            "font-display text-lg md:text-xl leading-snug text-balance",
            isDark ? "text-brand-text-light" : "text-brand-text-dark"
          )}
        >
          {question}
        </span>
        <span
          className={cn(
            "shrink-0 size-9 grid place-items-center rounded-full border transition-all duration-500",
            isDark
              ? "border-brand-gold/40 text-brand-gold group-hover:border-brand-gold group-hover:bg-brand-gold/10"
              : "border-brand-green/30 text-brand-green group-hover:border-brand-green group-hover:bg-brand-green group-hover:text-brand-cream",
            open && "rotate-45"
          )}
        >
          <Plus className="size-4" strokeWidth={1.5} />
        </span>
      </button>
      <div
        style={{
          height: typeof h === "number" ? `${h}px` : "auto",
          transition: "height 500ms cubic-bezier(0.22,1,0.36,1)",
          overflow: "hidden",
        }}
        aria-hidden={!open}
      >
        <div
          ref={ref}
          className={cn(
            "pb-6 pr-16 text-[15px] leading-[1.75]",
            isDark ? "text-brand-text-soft" : "text-brand-text-dark/80"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
};