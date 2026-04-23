import { useEffect, useState } from "react";
import { MessageCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Medal } from "./Medal";

/**
 * Desktop: floating WhatsApp FAB bottom-right.
 * Mobile: bottom bar with medal + CTA, auto-hides on scroll down.
 */
export const FloatingCTA = () => {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 200) {
        setHidden(false);
      } else if (y > lastY + 8) {
        setHidden(true);
      } else if (y < lastY - 8) {
        setHidden(false);
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Desktop FAB */}
      <a
        href="https://wa.me/5541999999999"
        target="_blank"
        rel="noopener"
        aria-label="Falar pelo WhatsApp"
        className="hidden md:flex fixed bottom-8 right-8 z-[90] size-16 items-center justify-center rounded-full bg-brand-gold text-brand-green shadow-[0_12px_40px_-8px_rgba(201,169,97,0.5)] hover:scale-110 hover:shadow-[0_16px_50px_-8px_rgba(201,169,97,0.7)] transition-all duration-500"
      >
        <MessageCircle className="size-6" strokeWidth={1.8} />
        <span className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-400 ring-2 ring-brand-black" aria-hidden />
      </a>

      {/* Mobile bottom bar */}
      <div
        className={cn(
          "md:hidden fixed bottom-0 inset-x-0 z-[90] bg-brand-green/95 backdrop-blur-md border-t border-brand-gold/20 px-4 py-3 transition-transform duration-500",
          hidden ? "translate-y-full" : "translate-y-0"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0 size-11">
            <Medal size={44} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-gold leading-none">30 anos</p>
            <p className="text-xs text-brand-text-soft mt-1 truncate">Tradição · Curitiba · desde 1995</p>
          </div>
          <a
            href="https://wa.me/5541999999999"
            className="shrink-0 inline-flex items-center gap-2 bg-brand-gold text-brand-green px-4 py-2.5 text-[10px] font-body font-semibold uppercase tracking-[0.15em]"
          >
            <Calendar className="size-3.5" strokeWidth={2} />
            Agendar
          </a>
        </div>
      </div>
    </>
  );
};