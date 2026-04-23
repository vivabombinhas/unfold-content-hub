import { cn } from "@/lib/utils";

interface MedalProps {
  size?: number;
  className?: string;
  floating?: boolean;
}

/**
 * Medalha "30 Anos · Desde 1995" — selo dourado editorial circular.
 * SVG puro, escala perfeita em qualquer tamanho.
 */
export const Medal = ({ size = 120, className, floating = false }: MedalProps) => {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="Medalha 30 anos de tradição, desde 1995"
      className={cn(floating && "animate-float-medal", className)}
    >
      <defs>
        <radialGradient id="medal-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="hsl(41 60% 70%)" />
          <stop offset="55%" stopColor="hsl(41 49% 58%)" />
          <stop offset="100%" stopColor="hsl(39 49% 38%)" />
        </radialGradient>
        <path id="medal-arc-top" d="M 60 60 m -42 0 a 42 42 0 1 1 84 0" fill="none" />
        <path id="medal-arc-bot" d="M 60 60 m -42 0 a 42 42 0 1 0 84 0" fill="none" />
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#medal-grad)" stroke="hsl(41 49% 35%)" strokeWidth="0.8" />
      <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(168 59% 9%)" strokeOpacity="0.35" strokeWidth="0.6" />
      <circle cx="60" cy="60" r="46" fill="none" stroke="hsl(168 59% 9%)" strokeOpacity="0.2" strokeWidth="0.4" />
      <text fontFamily="Cormorant Garamond, serif" fontSize="9" fontWeight="600" fill="hsl(168 59% 9%)" letterSpacing="2.5">
        <textPath href="#medal-arc-top" startOffset="50%" textAnchor="middle">
          ESTÉTICA · BATEL
        </textPath>
      </text>
      <text fontFamily="Montserrat, sans-serif" fontSize="6.5" fontWeight="500" fill="hsl(168 59% 9%)" letterSpacing="3">
        <textPath href="#medal-arc-bot" startOffset="50%" textAnchor="middle">
          DESDE · 1995
        </textPath>
      </text>
      <line x1="32" y1="55" x2="50" y2="55" stroke="hsl(168 59% 9%)" strokeOpacity="0.4" strokeWidth="0.6" />
      <line x1="70" y1="55" x2="88" y2="55" stroke="hsl(168 59% 9%)" strokeOpacity="0.4" strokeWidth="0.6" />
      <text x="60" y="62" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="26" fontWeight="600" fill="hsl(168 59% 9%)" fontStyle="italic">
        30
      </text>
      <text x="60" y="76" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontSize="5.5" fontWeight="600" fill="hsl(168 59% 9%)" letterSpacing="2.5">
        ANOS
      </text>
      <circle cx="60" cy="60" r="55" fill="none" stroke="hsl(42 33% 97%)" strokeOpacity="0.15" strokeWidth="0.4" />
    </svg>
  );
};