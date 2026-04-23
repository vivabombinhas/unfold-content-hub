import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type Variant = "gold" | "outline-light" | "outline-dark" | "dark" | "ghost-gold";

interface CommonProps {
  variant?: Variant;
  withArrow?: boolean;
  size?: "md" | "lg" | "sm";
}

const base =
  "inline-flex items-center justify-center gap-3 font-body font-semibold uppercase tracking-[0.18em] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const sizes = {
  sm: "px-5 py-2.5 text-[10px]",
  md: "px-7 py-4 text-[11px]",
  lg: "px-9 py-5 text-[12px]",
};

const variants: Record<Variant, string> = {
  gold: "bg-brand-gold text-brand-green border-brand-gold hover:bg-brand-gold-soft hover:border-brand-gold-soft hover:-translate-y-px hover:shadow-[var(--shadow-gold)]",
  "outline-light":
    "bg-transparent text-brand-text-light border-brand-text-light/40 hover:border-brand-text-light hover:bg-white/5",
  "outline-dark":
    "bg-transparent text-brand-green border-brand-green hover:bg-brand-green hover:text-brand-text-light",
  dark: "bg-brand-green text-brand-text-light border-brand-gold/50 hover:bg-[hsl(168_59%_12%)] hover:border-brand-gold",
  "ghost-gold":
    "bg-transparent text-brand-gold border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/5",
};

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" };
type AnchorProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a"; href: string };

export type GoldButtonProps = ButtonProps | AnchorProps;

export const GoldButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, GoldButtonProps>(
  ({ variant = "gold", withArrow, size = "md", className, children, ...props }, ref) => {
    const cls = cn(base, sizes[size], variants[variant], "group", className);
    const inner = (
      <>
        {children}
        {withArrow && (
          <ArrowRight className="size-3.5 transition-transform duration-500 group-hover:translate-x-1" strokeWidth={2} />
        )}
      </>
    );
    if ((props as AnchorProps).as === "a") {
      const { as: _a, ...rest } = props as AnchorProps;
      return (
        <a ref={ref as React.Ref<HTMLAnchorElement>} className={cls} {...rest}>
          {inner}
        </a>
      );
    }
    const { as: _b, ...rest } = props as ButtonProps;
    return (
      <button ref={ref as React.Ref<HTMLButtonElement>} className={cls} {...rest}>
        {inner}
      </button>
    );
  }
);
GoldButton.displayName = "GoldButton";