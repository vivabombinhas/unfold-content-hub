import { useEffect, useState } from "react";
import { Menu, X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Medal } from "./Medal";

const navItems = [
  { label: "Procedimentos", href: "#procedimentos" },
  { label: "Casos", href: "#casos" },
  { label: "Equipe", href: "#equipe" },
  { label: "Cursos", href: "#cursos" },
  { label: "Contato", href: "#contato" },
];

export const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Breadcrumb bar */}
      <div className="bg-brand-green-2 border-b border-brand-gold/15 relative z-[99] hidden md:block">
        <div className="container-editorial">
          <nav
            aria-label="Breadcrumb"
            className="py-2.5 text-[10px] font-body font-medium uppercase tracking-[0.18em] text-brand-text-soft"
          >
            <a href="/" className="hover:text-brand-gold transition-colors">Início</a>
            <span className="mx-3 text-brand-gold/50">/</span>
            <a href="#procedimentos" className="hover:text-brand-gold transition-colors">Procedimentos</a>
            <span className="mx-3 text-brand-gold/50">/</span>
            <span className="text-brand-gold">Botox Masculino</span>
          </nav>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-[100] border-b border-brand-gold/15 transition-all duration-500",
          scrolled
            ? "bg-brand-green/95 shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
            : "bg-brand-green/85",
          "backdrop-blur-md"
        )}
      >
        <div
          className={cn(
            "container-editorial flex items-center justify-between gap-6 transition-all duration-500",
            scrolled ? "py-2.5" : "py-4"
          )}
        >
          {/* Brand */}
          <a href="/" className="flex items-center gap-3 shrink-0">
            <svg viewBox="0 0 44 48" className="w-10 h-11 shrink-0" aria-hidden>
              <path
                d="M22 2 L40 11 L40 28 C40 38 32 44 22 46 C12 44 4 38 4 28 L4 11 Z"
                fill="hsl(168 59% 9%)"
                stroke="hsl(41 49% 58%)"
                strokeWidth="1.2"
              />
              <text x="22" y="28" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontWeight="600" fontSize="18" fill="hsl(41 49% 58%)">
                E
              </text>
              <text x="22" y="38" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontSize="4.5" letterSpacing="1.5" fill="hsl(41 49% 58%)">
                BATEL
              </text>
            </svg>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-display font-semibold text-base md:text-lg uppercase tracking-[0.22em] text-brand-text-light">
                Estética Batel
              </span>
              <span className="text-[9px] tracking-[0.28em] uppercase text-brand-gold mt-0.5">
                Curitiba · desde 1995
              </span>
            </div>
            {/* Mini medal — appears on scroll */}
            <div
              className={cn(
                "transition-all duration-500 ml-2 hidden md:block",
                scrolled ? "opacity-100 scale-100 w-9" : "opacity-0 scale-75 w-0 overflow-hidden"
              )}
            >
              <Medal size={36} />
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="relative px-3 py-2 text-[10px] font-body font-semibold uppercase tracking-[0.15em] text-brand-text-light hover:text-brand-gold transition-colors after:content-[''] after:absolute after:left-1/2 after:bottom-0 after:-translate-x-1/2 after:w-0 after:h-px after:bg-brand-gold after:transition-all after:duration-500 hover:after:w-5"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <a
            href="https://wa.me/5541999999999"
            target="_blank"
            rel="noopener"
            className="hidden md:inline-flex items-center gap-2 bg-brand-gold text-brand-green px-5 py-3 text-[10px] font-body font-semibold uppercase tracking-[0.15em] border border-brand-gold hover:bg-brand-gold-soft transition-colors"
          >
            <MessageCircle className="size-3.5" strokeWidth={2} />
            Agendar
          </a>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            className="lg:hidden size-11 grid place-items-center border border-brand-gold/30 text-brand-text-light"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-[105] lg:hidden transition-opacity duration-500",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <button onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Fechar menu" />
        <aside
          className={cn(
            "absolute top-0 right-0 h-full w-full max-w-[400px] bg-brand-green border-l border-brand-gold/15 px-8 pt-28 pb-12 overflow-y-auto",
            "transition-transform duration-[500ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-display text-2xl py-3 border-b border-brand-gold/10 text-brand-text-light hover:text-brand-gold transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href="https://wa.me/5541999999999"
            className="mt-10 inline-flex items-center justify-center gap-2 w-full bg-brand-gold text-brand-green py-4 font-body font-semibold uppercase tracking-[0.15em] text-xs"
          >
            <MessageCircle className="size-4" /> Agendar agora
          </a>
        </aside>
      </div>
    </>
  );
};