/**
 * BlockRenderer — renderiza um page_block usando o `data` vindo do snapshot.
 *
 * Estratégia:
 * - Blocos de TEXTO (hero, manifesto_curto, metodo, preco_ancora, equipe_rt,
 *   faq, cta_final): conteúdo 100% do snapshot.
 * - Blocos COLETIVOS (authority_strip, casos, depoimentos, ai_opinions,
 *   cursos): título/eyebrow vêm do snapshot, cards continuam do pool fixo
 *   em src/data/landing.ts (até a rodada onde ligamos as tabelas pool).
 *
 * Mantém paridade visual com src/pages/Index.tsx (mesmas classes Tailwind,
 * mesmos componentes site/*).
 */
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  GraduationCap,
  MessageCircle,
  Phone,
  Quote,
  Sparkles,
  ShieldCheck,
  Award,
  Star,
} from "lucide-react";
 import { useState, useEffect } from "react";
 import draRT from "@/assets/dra-rt.jpg";
import { GoldButton } from "@/components/site/GoldButton";
import { Medal } from "@/components/site/Medal";
import { InlineExpand } from "@/components/site/InlineExpand";
import { CaseModal } from "@/components/site/CaseModal";
import { SideSheet } from "@/components/site/SideSheet";
import { useCountUp } from "@/hooks/use-count-up";
import { type ClinicalCase } from "@/data/landing";
import { usePools, type PoolCase } from "@/hooks/use-pools";
import { cn } from "@/lib/utils";
import type { BlockType } from "@/types/blocks";

type BlockData = Record<string, unknown>;

function s(v: unknown, fb = ""): string {
  return typeof v === "string" && v.trim() ? v : fb;
}
/** Retorna a primeira string não-vazia da lista, senão o fallback. Permite suportar
 * múltiplos schemas (ex.: `title_html` antigo + `title` novo da IA). */
function firstS(values: unknown[], fb = ""): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return fb;
}
function arr<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function obj(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

interface CtaShape {
  label?: string;
  href?: string;
  opens_sheet?: boolean;
}

function readCta(v: unknown, fb: { label: string; href: string }): { label: string; href: string; opens_sheet?: boolean } {
  const c = obj(v) as CtaShape;
  return {
    label: s(c.label, fb.label),
    href: s(c.href, fb.href),
    opens_sheet: !!c.opens_sheet,
  };
}

/** Converte um PoolCase (banco) no shape que CaseModal espera. */
function toClinicalCase(c: PoolCase): ClinicalCase {
  return {
    id: c.id,
    area: c.area,
    age: c.age ?? "",
    cover: c.cover_url ?? "",
    gallery: (c.gallery ?? []).map((g) => ({ src: g.src ?? "", caption: g.caption })),
    beforeAfter: c.before_url && c.after_url ? { before: c.before_url, after: c.after_url } : undefined,
    highlight: c.highlight,
    notes: c.notes ?? "",
    dosage: c.dosage ?? "",
    duration: c.duration ?? "",
     toxin: c.toxin ?? "",
   };
 }
 
 /** Converte um item de caso customizado (do bloco da página) no shape que CaseModal espera. */
 function manualToClinicalCase(m: any, id: string): ClinicalCase {
   return {
     id: `manual-${id}`,
     area: s(m.title, "Caso Clínico"),
     age: s(m.age, ""),
     cover: s(m.image_url || m.before_url),
     gallery: [],
     beforeAfter: m.before_url && m.after_url ? { before: m.before_url, after: m.after_url } : undefined,
     notes: s(m.notes || m.description),
     highlight: true,
     dosage: "",
     duration: "",
     toxin: "",
   };
 }

/* ============================================================
   Public entry: pick the right renderer for a block type
   ============================================================ */
export function BlockRenderer({ type, data }: { type: BlockType; data: BlockData }) {
  switch (type) {
    case "hero":
      return <HeroBlock data={data} />;
    case "authority_strip":
      return <AuthorityBlock data={data} />;
    case "manifesto_curto":
      return <ManifestoBlock data={data} />;
    case "metodo":
      return <MetodoBlock data={data} />;
    case "procedimento_detalhado":
      return <ProcedimentoDetalhadoBlock data={data} />;
    case "casos":
      return <CasosBlock data={data} />;
    case "preco_ancora":
      return <PrecoBlock data={data} />;
    case "depoimentos":
      return <DepoimentosBlock data={data} />;
    case "ai_opinions":
      return <AIOpinionsBlock data={data} />;
    case "equipe_rt":
      return <EquipeBlock data={data} />;
    case "cursos":
      return <CursosBlock data={data} />;
    case "faq":
      return <FaqBlock data={data} />;
    case "marquee_cards":
      return <MarqueeCardsBlock data={data} />;
    case "cta_final":
      return <CtaFinalBlock data={data} />;
    case "beneficios_grid":
      return <BeneficiosGridBlock data={data} />;
    case "procedimento_detalhado_v2":
      return <ProcedimentoDetalhadoV2Block data={data} />;
    default:
      return null;
  }
}

/* ============================================================
   HERO
   ============================================================ */
function HeroBlock({ data }: { data: BlockData }) {
  const eyebrow = s(data.eyebrow, "Estética Batel · Curitiba");
  const titleHtml = firstS([data.title_html, data.title], "Tratamento <em>personalizado</em>.");
   const paragraph = firstS(
     [data.paragraph, data.subtitle, data.description],
     "Protocolo de alta performance com dosagem calibrada para resultados naturais e sofisticados. Sem aspecto congelado, preservando a expressão que comunica autoridade e segurança. Avaliação clínica individualizada e técnica documentada para máxima previsibilidade."
   );
  const imageUrl = s(data.image_url);
  const captionTop = s(data.caption_top);
  const captionBottom = s(data.caption_bottom);
  const footnote = s(data.footnote, "Resposta em até 30 minutos · Atendimento confidencial");
  
  const ctaPrimary = readCta(
    data.cta_primary ?? { label: data.cta_label, href: data.cta_href },
    { label: "Agendar pelo WhatsApp", href: "https://wa.me/5541999999999" },
  );
  const ctaSecondary = readCta(data.cta_secondary, { label: "Avaliação clínica", href: "#avaliacao" });

  return (
    <section className="relative overflow-hidden bg-brand-black">
      <div className="absolute inset-0 bg-pattern-gold opacity-10 pointer-events-none" aria-hidden />
      <div
        aria-hidden
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 80% 20%, hsl(41 49% 58% / 0.12), transparent 60%), radial-gradient(ellipse 60% 50% at 0% 100%, hsl(168 59% 9% / 0.6), transparent 60%)",
        }}
      />
      <div className="container-editorial relative z-[2] grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-20 items-center pt-16 pb-20 md:pt-24 md:pb-28 lg:py-32">
        <div className="space-y-8">
          <div className="reveal" style={{ transitionDelay: "100ms" }}>
            <span className="eyebrow">{eyebrow}</span>
          </div>
          <h1 className="h-display-1 text-balance reveal" style={{ transitionDelay: "200ms" }} dangerouslySetInnerHTML={{ __html: titleHtml }} />
          <span className="gold-rule reveal" style={{ transitionDelay: "300ms" }} />
          {paragraph && (
            <p className="text-brand-text-soft text-base md:text-[17px] leading-[1.75] max-w-xl text-pretty reveal" style={{ transitionDelay: "400ms" }}>{paragraph}</p>
          )}
          <div className="flex flex-wrap gap-3 reveal" style={{ transitionDelay: "500ms" }}>
            <GoldButton as="a" href={ctaPrimary.href} withArrow size="lg">
              <MessageCircle className="size-4" /> {ctaPrimary.label}
            </GoldButton>
            <GoldButton as="a" href={ctaSecondary.href} variant="outline-light" size="lg" withArrow>
              {ctaSecondary.label}
            </GoldButton>
          </div>
          {footnote && (
            <p className="text-[11px] tracking-[0.2em] uppercase text-brand-text-muted reveal" style={{ transitionDelay: "600ms" }}>{footnote}</p>
          )}
        </div>
        {imageUrl && (
           <div className="relative reveal mx-auto lg:mx-0 w-full max-w-md lg:max-w-none parallax-subtle" style={{ transitionDelay: "400ms" }}>
             <div className="aspect-[4/5] overflow-hidden bg-brand-graphite relative group border border-brand-gold/10">
               <img src={imageUrl} alt={eyebrow} className="w-full h-full object-cover transition-transform duration-[4s] group-hover:scale-110" loading="eager" />
              <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 50%, hsl(0 0% 0% / 0.6) 100%)" }} />
            </div>
            <div className="absolute -top-6 -right-4 md:-top-8 md:-right-8 z-10">
              <Medal size={130} floating className="drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
            </div>
            {(captionTop || captionBottom) && (
              <div className="absolute bottom-5 left-5 right-5">
                {captionTop && <p className="text-[10px] uppercase tracking-[0.22em] text-brand-gold">{captionTop}</p>}
                {captionBottom && <p className="font-display italic text-xl text-brand-text-light mt-1">{captionBottom}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}


/* ============================================================
   BENEFÍCIOS GRID (Premium)
   ============================================================ */
 function BeneficiosGridBlock({ data }: { data: BlockData }) {
   const eyebrow = s(data.eyebrow, "Diferenciais");
   const titleHtml = firstS([data.title_html, data.title], "Por que escolher a <em>Estética Batel</em>.");
   const subtitle = s(data.subtitle);
   const cards = arr<{ title?: string; text?: string; icon?: string }>(data.cards);
   const variant = s(data.layout_variant, "grid"); // "grid" ou "centered"
 
   if (!cards.length) return null;
 
   return (
     <section className="bg-brand-black section-pad relative z-[2] overflow-hidden">
       {/* Decorative backgrounds */}
       <div className="absolute top-0 left-0 w-full h-full bg-pattern-gold opacity-[0.03] pointer-events-none" aria-hidden />
       <div className="absolute -top-24 -right-24 size-96 bg-brand-gold/5 blur-[120px] rounded-full pointer-events-none" aria-hidden />
       <div className="absolute -bottom-24 -left-24 size-96 bg-brand-gold/5 blur-[120px] rounded-full pointer-events-none" aria-hidden />
 
       <div className="container-editorial relative z-10">
        <div className={cn("reveal mb-10 md:mb-16", variant === "centered" ? "text-center mx-auto max-w-3xl" : "max-w-3xl")}>
           <span className={cn("eyebrow", variant === "centered" && "mx-auto justify-center")}>{eyebrow}</span>
          <h2 className="h-display-2 mt-4 md:mt-6 text-balance leading-[1.1]" dangerouslySetInnerHTML={{ __html: titleHtml }} />
          <span className={cn("gold-rule mt-6 md:mt-8", variant === "centered" && "mx-auto")} />
           {subtitle && (
            <p className="mt-6 md:mt-8 text-brand-text-soft text-base md:text-xl leading-relaxed max-w-2xl">
               {subtitle}
             </p>
           )}
         </div>
 
         <div className={cn(
           "grid gap-6 md:gap-8 lg:gap-10",
           // 2 itens: 1 col mobile, 2 cols tablet/desktop
           cards.length === 2 && "grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto",
           // 3 itens: 1 col mobile, 3 cols desktop
           cards.length === 3 && "grid-cols-1 md:grid-cols-3",
           // 4 itens: 1 col mobile, 2 cols tablet, 4 cols desktop
           cards.length === 4 && "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
           // 5 ou mais: 1 col mobile, 2 cols tablet, 3 cols desktop (com wrap natural)
           cards.length >= 5 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
         )}>
           {cards.map((card, i) => (
             <div 
               key={i} 
               style={{ transitionDelay: `${i * 150}ms` }} 
               className="reveal group relative"
             >
               {/* Card Background & Glow Effect */}
               <div className="absolute inset-0 bg-brand-gold/5 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700 pointer-events-none" aria-hidden />
               
                  <div className={cn(
                    "relative h-full bg-brand-graphite/30 backdrop-blur-md border border-brand-gold/10 transition-all duration-700 flex flex-col items-start overflow-hidden group/card",
                    // Ajuste de padding conforme densidade
                    cards.length >= 4 ? "p-6 md:p-8 xl:p-10" : "p-8 md:p-12"
                  )}>
                 {/* Decorative background number */}
                  <span className="absolute -bottom-4 -right-2 md:-bottom-6 md:-right-4 font-display italic text-7xl md:text-8xl text-brand-gold/5 select-none pointer-events-none group-hover:text-brand-gold/10 transition-colors duration-700">
                   {(i + 1).toString().padStart(2, '0')}
                 </span>
 
                 {/* Icon Container */}
                  <div className="size-12 md:size-14 rounded-full bg-brand-gold/10 flex items-center justify-center mb-6 md:mb-8 relative group-hover:scale-110 transition-transform duration-700">
                   <div className="absolute inset-0 rounded-full border border-brand-gold/20 animate-pulse" aria-hidden />
                   <Sparkles className="size-6 text-brand-gold" strokeWidth={1} />
                 </div>
 
                  <h3 className="font-display text-xl md:text-3xl leading-tight mb-4 md:mb-5 text-brand-text-light group-hover:text-brand-gold transition-colors duration-500">
                   {s(card.title)}
                 </h3>
                 
                  <p className="text-brand-text-soft leading-relaxed text-sm md:text-base relative z-10">
                   {s(card.text)}
                 </p>
 
                 {/* Bottom Accent Line */}
                 <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-brand-gold/0 via-brand-gold/50 to-brand-gold/0 group-hover:w-full transition-all duration-1000" aria-hidden />
               </div>
             </div>
           ))}
         </div>
       </div>
     </section>
   );
 }

/* ============================================================
   PROCEDIMENTO DETALHADO V2 (Premium)
   ============================================================ */
function ProcedimentoDetalhadoV2Block({ data }: { data: BlockData }) {
  const eyebrow = s(data.eyebrow, "Etapas");
  const titleHtml = firstS([data.title_html, data.title], "O <em>procedimento</em> detalhado.");
   const mainText = s(data.main_text, "Nosso procedimento é estruturado em etapas claras para garantir segurança e resultados de excelência. Cada fase é documentada e acompanhada pela nossa responsável técnica.");
   let paragraphs = arr<string>(data.paragraphs);
   if (paragraphs.length === 0) {
     paragraphs = [
       "Iniciamos com uma análise detalhada da musculatura e dos vetores de expressão, definindo o plano de aplicação personalizado.",
       "Utilizamos apenas toxinas de primeira linha, garantindo a pureza e a longevidade do tratamento.",
       "O retorno em 14 dias é fundamental para avaliar a acomodação do produto e realizar qualquer ajuste fino necessário."
     ];
   }
   let sideCards = arr<{ title?: string; text?: string; icon?: string }>(data.side_cards);
   if (sideCards.length === 0) {
     sideCards = [
       { title: "Avaliação 360°", text: "Análise completa da face e histórico clínico." },
       { title: "Técnica Refinada", text: "Aplicação precisa com agulhas ultrafinas." },
       { title: "Suporte Pós", text: "Acompanhamento direto via canal exclusivo." }
     ];
   }
  const imageUrl = s(data.image_url);
  const cta = readCta(data.cta, { label: "", href: "" });
  const variant = s(data.layout_variant, "standard");

  return (
     <section className="bg-brand-cream text-brand-text-dark section-pad relative z-[2] overflow-hidden">
       <div className="absolute top-0 right-0 w-1/3 h-full bg-brand-gold/5 blur-[120px] pointer-events-none" aria-hidden />
       <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-brand-gold/5 blur-[100px] pointer-events-none" aria-hidden />
      <div className="container-editorial">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-start">
          <div className="reveal">
            <span className="eyebrow" style={{ color: "hsl(var(--gold-deep))" }}>{eyebrow}</span>
            <h2 className="h-display-2 mt-5 text-brand-text-dark text-balance" dangerouslySetInnerHTML={{ __html: titleHtml }} />
            <span className="gold-rule mt-7" />
            
            <div className="mt-8 space-y-6 text-brand-text-dark/80 text-[17px] leading-[1.8]">
              {mainText && <p>{mainText}</p>}
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

             {imageUrl && (
               <div className="mt-16 relative group">
                 <div className="absolute -inset-4 bg-brand-gold/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" aria-hidden />
                 <div className="relative aspect-video overflow-hidden bg-brand-cream-2 border border-brand-gold/10 shadow-soft">
                   <img src={imageUrl} alt={s(data.image_alt)} className="w-full h-full object-cover transition-transform duration-[5s] group-hover:scale-105" loading="lazy" />
                   <div className="absolute inset-0 bg-gradient-to-t from-brand-cream/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 </div>
                 <div className="absolute -bottom-6 -left-6 size-24 border-l border-b border-brand-gold/30 hidden md:block" />
                 <div className="absolute -top-6 -right-6 size-24 border-r border-t border-brand-gold/30 hidden md:block" />
               </div>
             )}

            {cta.label && cta.href && (
              <div className="mt-10">
                <GoldButton as="a" href={cta.href} withArrow size="lg">
                  {cta.label}
                </GoldButton>
              </div>
            )}
          </div>

           <div className="relative space-y-8 lg:pl-10">
             {/* Timeline Line */}
             <div className="absolute left-0 lg:left-10 top-2 bottom-2 w-px bg-brand-gold/20 hidden lg:block" aria-hidden />
             
             {sideCards.map((card, i) => (
               <div 
                 key={i} 
                 style={{ transitionDelay: `${i * 150}ms` }}
                 className="reveal relative group"
               >
                 {/* Number Bubble (Timeline point) */}
                 <div className="absolute -left-4 lg:-left-14 top-0 size-8 rounded-full bg-brand-cream border border-brand-gold/30 flex items-center justify-center z-10 group-hover:bg-brand-gold group-hover:border-brand-gold transition-colors duration-500 hidden lg:flex">
                   <span className="font-display italic text-sm text-brand-gold group-hover:text-brand-cream transition-colors duration-500">
                     {(i + 1).toString().padStart(2, '0')}
                   </span>
                 </div>

                 <div className="bg-brand-cream-2/50 backdrop-blur-sm border border-brand-gold/15 p-8 md:p-10 transition-all duration-500 group-hover:border-brand-gold/40 group-hover:bg-brand-cream-2/80">
                   <div className="flex gap-5 items-start">
                     <div className="size-12 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                       <CheckCircle2 className="size-6 text-brand-gold" strokeWidth={1} />
                     </div>
                     <div>
                       <h3 className="font-display text-2xl leading-tight mb-3 text-brand-text-dark">{s(card.title)}</h3>
                       <p className="text-brand-text-dark/70 text-[15px] leading-relaxed">{s(card.text)}</p>
                     </div>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   AUTHORITY STRIP — header dinâmico, números do pool fixo
   ============================================================ */
function AuthorityBlock({ data }: { data: BlockData }) {
  const items = arr<{ label?: string; value?: string }>(data.items);
  const years = useCountUp(30);
  const patients = useCountUp(10000);
  const procedures = useCountUp(95);
  // If admin curated `items`, render them; else fall back to the original 4 stats.
  if (items.length > 0) {
    return (
      <section className="bg-brand-green-2 border-y border-brand-gold/15 relative z-[2]">
       <div className="container-editorial py-16 md:py-20">
         <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-6 items-center">
           {items.slice(0, 4).map((it, i) => (
              <div key={i} className="text-center">
                <span className="font-display text-3xl md:text-4xl text-brand-gold">{it.value}</span>
                <p className="text-[10px] uppercase tracking-[0.22em] text-brand-text-muted mt-2">{it.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  return (
     <section className="bg-brand-green-2 border-y border-brand-gold/15 relative z-[2]">
       <div className="container-editorial py-16 md:py-20">
         <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-6 items-center">
          <Stat label="Anos no Batel" value={years.val} suffix="+" innerRef={years.ref} />
          <Stat label="Pacientes" value={patients.val} suffix="+" innerRef={patients.ref} fmt />
          <Stat label="Aprovação Google" value={procedures.val} suffix="%" innerRef={procedures.ref} />
          <div className="flex items-center justify-center gap-2 text-brand-text-soft">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-4 fill-brand-gold text-brand-gold" />
              ))}
            </div>
            <span className="text-[11px] uppercase tracking-[0.18em]">4.9 · Google</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, suffix, innerRef, fmt }: { label: string; value: number; suffix?: string; innerRef: React.RefObject<HTMLSpanElement>; fmt?: boolean }) {
  const display = fmt ? value.toLocaleString("pt-BR") : value;
  return (
    <div className="text-center">
      <span ref={innerRef} className="font-display text-3xl md:text-4xl text-brand-gold">
        {display}
        {suffix}
      </span>
      <p className="text-[10px] uppercase tracking-[0.22em] text-brand-text-muted mt-2">{label}</p>
    </div>
  );
}

/* ============================================================
   MANIFESTO
   ============================================================ */
function ManifestoBlock({ data }: { data: BlockData }) {
  const [open, setOpen] = useState(false);
  const eyebrow = s(data.eyebrow, "Manifesto");
  const quoteHtml = firstS([data.quote_html, data.title, data.body]);
  const author = s(data.author);
  const longText = firstS([data.long_text, data.body]);
  const ctaLabel = s(data.cta_label, "Ler manifesto completo");

  return (
    <>
      <section className="bg-brand-black section-pad relative z-[2]">
        <div className="container-editorial grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-20 items-start">
          <div className="reveal">
            <span className="eyebrow">{eyebrow}</span>
            <span className="gold-rule mt-6 gold-rule-animated" style={{ width: 60 }} />
          </div>
          <div className="reveal">
            {quoteHtml && (
              <p
                className="font-display text-2xl md:text-3xl lg:text-4xl leading-[1.3] text-brand-text-light text-balance"
                dangerouslySetInnerHTML={{ __html: quoteHtml }}
              />
            )}
            {author && (
              <p className="mt-6 text-sm text-brand-text-muted uppercase tracking-[0.2em]">{author}</p>
            )}
            {longText && (
              <button
                onClick={() => setOpen(true)}
                className="mt-8 inline-flex items-center gap-3 text-brand-gold text-[11px] font-body font-semibold uppercase tracking-[0.2em] border-b border-brand-gold/40 pb-1 hover:border-brand-gold transition-colors group"
              >
                {ctaLabel}
                <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </section>
      {longText && (
        <SideSheet open={open} onClose={() => setOpen(false)} eyebrow={eyebrow} title={ctaLabel} width="lg" tone="dark">
          <div className="space-y-6 font-display text-lg md:text-xl leading-[1.6] text-brand-text-light/90" dangerouslySetInnerHTML={{ __html: longText }} />
        </SideSheet>
      )}
    </>
  );
}

/* ============================================================
   MÉTODO
   ============================================================ */
function MetodoBlock({ data }: { data: BlockData }) {
  const eyebrow = s(data.eyebrow, "Método");
  const titleHtml = firstS([data.title_html, data.title], "Três passos. <em>Documentados.</em>");
   let steps = arr<{ title?: string; summary?: string; desc?: string; description?: string; detail?: string; n?: number | string }>(data.steps);
   if (steps.length === 0) {
     steps = [
       { 
         title: "Avaliação Clínica", 
         summary: "Análise minuciosa da face, histórico e objetivos do paciente.", 
         detail: "Nesta etapa, a Dra. Daniele mapeia os pontos de aplicação e define a dosagem ideal para um resultado natural." 
       },
       { 
         title: "Aplicação Precisa", 
         summary: "Procedimento realizado com agulhas ultrafinas e técnica indolor.", 
         detail: "A aplicação leva cerca de 20 minutos e foca na preservação da expressão facial e dos vetores de movimento." 
       },
       { 
         title: "Retorno e Ajuste", 
         summary: "Acompanhamento em 14 dias para garantir o resultado perfeito.", 
         detail: "O retorno é essencial para validar a simetria e realizar ajustes finos, garantindo a satisfação total." 
       }
     ];
   }
  const icons = [ShieldCheck, Sparkles, Award, ShieldCheck];
  return (
    <section id="procedimentos" className="bg-brand-graphite section-pad bg-pattern-gold relative z-[2]">
      <div className="container-editorial">
        <div className="text-center reveal max-w-2xl mx-auto">
          <span className="eyebrow mx-auto justify-center">{eyebrow}</span>
          <h2 className="h-display-2 mt-5 text-balance" dangerouslySetInnerHTML={{ __html: titleHtml }} />
          <span className="gold-rule mx-auto mt-7" />
        </div>
        <div className={cn("mt-14 grid gap-5", steps.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-4")}>
          {steps.map((step, i) => {
            const Icon = icons[i % icons.length];
            const n = String(step.n ?? i + 1).padStart(2, "0");
            return (
               <article key={i} style={{ transitionDelay: `${i * 100}ms` }} className="reveal bg-brand-black/60 border border-brand-gold/15 p-7 md:p-9 hover:border-brand-gold/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-display italic text-brand-gold text-xl md:text-2xl">{n}</span>
                  <Icon className="size-6 text-brand-gold/70" strokeWidth={1.3} />
                </div>
                <h3 className="font-display text-2xl mt-5 leading-snug">{step.title}</h3>
                {(step.summary || step.desc || step.description) && (
                  <p className="mt-3 text-brand-text-soft text-[15px] leading-relaxed">
                    {step.summary || step.desc || step.description}
                  </p>
                )}
                {step.detail && (
                  <div className="mt-5 -mx-2">
                    <InlineExpand tone="dark" question="Como funciona na prática">
                      <p>{step.detail}</p>
                    </InlineExpand>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CASOS — header dinâmico; cards do pool fixo (filtrado por area_filter quando possível)
   ============================================================ */
function CasosBlock({ data }: { data: BlockData }) {
  const { cases: pool } = usePools();
  const [openCase, setOpenCase] = useState<ClinicalCase | null>(null);
  const eyebrow = s(data.eyebrow, "Casos clínicos documentados");
  const titleHtml = firstS([data.title_html, data.title, data.subtitle], "Resultados <em>reais</em>, dosagem registrada, tempo medido.");
  const showCount = typeof data.show_count === "number"
    ? data.show_count
    : typeof data.limit === "number" ? data.limit : 6;
  const areaFilter = s(data.area_filter).toLowerCase();

   const customCases = arr<any>(data.cases);
   const hasCustomSelection = "cases" in data;
 
   let featured: ClinicalCase[] = [];
 
   if (hasCustomSelection) {
     // 1. Usar seleção manual/específica da página
     featured = customCases.map((item, idx) => {
       if (item.source === "global") {
         const p = pool.find((c) => c.id === item.case_id);
         return p ? toClinicalCase(p) : null;
       }
       return manualToClinicalCase(item, String(idx));
     }).filter(Boolean) as ClinicalCase[];
   } else {
     // 2. Fallback: Pool global (com filtros)
     let filtered = pool.filter((c) => c.highlight);
     if (filtered.length === 0) filtered = pool;
     if (areaFilter) {
       const aliases: Record<string, string[]> = {
         labios: ["lábio", "labio", "boca", "perioral"],
         terco_superior: ["frontal", "glabela", "testa", "olh"],
         terco_medio: ["malar", "olheir"],
         mandibula: ["mandíb", "queixo", "masseter"],
         pescoco: ["pescoço", "papada"],
         face: ["face", "rosto"],
         corpo: ["corpo", "abdome", "glúteo"],
       };
       const al = aliases[areaFilter] || [areaFilter.replace(/_/g, " ")];
       const matched = pool.filter((c) => al.some((a) => c.area.toLowerCase().includes(a)));
       if (matched.length > 0) filtered = matched;
     }
     featured = filtered.slice(0, showCount).map(toClinicalCase);
   }
 
   if (featured.length === 0) {
     // Se escolheu customizar mas não adicionou nada, não mostra nada
     if (hasCustomSelection) return null;
     // Se for global mas estiver vazio, não mostra nada
     return null;
   }

  return (
    <>
      <section id="casos" className="bg-brand-cream text-brand-text-dark section-pad relative z-[2]">
        <div className="container-editorial">
          <div className="reveal mb-12">
            <span className="eyebrow" style={{ color: "hsl(var(--gold-deep))" }}>{eyebrow}</span>
            <h2 className="h-display-2 mt-5 text-brand-text-dark text-balance max-w-2xl" dangerouslySetInnerHTML={{ __html: titleHtml }} />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {featured.map((c) => (
              <button
                key={c.id}
                onClick={() => setOpenCase(c)}
                className="reveal group relative text-left overflow-hidden bg-brand-cream-2"
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img src={c.cover} alt={`${c.area} — ${c.age}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]" />
                </div>
                <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 45%, hsl(0 0% 0% / 0.65) 100%)" }} />
                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-brand-gold">{c.age}</p>
                    <h3 className="font-display text-2xl text-brand-text-light leading-tight mt-1">{c.area}</h3>
                  </div>
                  <span className="size-11 rounded-full bg-brand-gold text-brand-green grid place-items-center transition-transform duration-500 group-hover:rotate-45">
                    <ArrowUpRight className="size-5" strokeWidth={1.8} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
      <CaseModal caseData={openCase} onClose={() => setOpenCase(null)} />
    </>
  );
}

/* ============================================================
   PREÇO ÂNCORA
   ============================================================ */
function PrecoBlock({ data }: { data: BlockData }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const eyebrow = s(data.eyebrow, "Investimento");
  const titleHtml = firstS(
    [data.title_html, data.title, data.price_label],
    "A partir de <em>R$ 1.490</em>",
  );
  const description = firstS([data.description, data.note, data.subtitle]);
  const bullets = arr<string>(data.bullets);
  const ctaPrimary = readCta(data.cta_primary, { label: "Entender o preço em detalhe", href: "#" });
  const ctaSecondary = readCta(data.cta_secondary, { label: "Falar agora", href: "https://wa.me/5541999999999" });
  const sheetTitle = s(data.sheet_title, "Como compomos o preço");
  const sheetHtml = s(data.sheet_html);

  return (
    <>
      <section id="precos" className="bg-brand-green-2 section-pad relative z-[2]">
        <div className="container-editorial max-w-3xl mx-auto text-center">
          <span className="eyebrow mx-auto justify-center reveal">{eyebrow}</span>
          <h2 className="h-display-2 mt-5 reveal text-balance" dangerouslySetInnerHTML={{ __html: titleHtml }} />
          <span className="gold-rule mx-auto mt-7" />
          {description && (
            <p className="mt-7 text-brand-text-soft text-lg leading-relaxed max-w-xl mx-auto reveal">{description}</p>
          )}
          {bullets.length > 0 && (
            <ul className="mt-8 grid sm:grid-cols-3 gap-4 text-sm text-brand-text-soft reveal">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 justify-center">
                  <CheckCircle2 className="size-4 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-10 flex flex-wrap gap-3 justify-center reveal">
            {sheetHtml ? (
              <GoldButton onClick={() => setSheetOpen(true)} withArrow>{ctaPrimary.label}</GoldButton>
            ) : (
              <GoldButton as="a" href={ctaPrimary.href} withArrow>{ctaPrimary.label}</GoldButton>
            )}
            <GoldButton as="a" href={ctaSecondary.href} variant="outline-light">{ctaSecondary.label}</GoldButton>
          </div>
        </div>
      </section>
      {sheetHtml && (
        <SideSheet open={sheetOpen} onClose={() => setSheetOpen(false)} eyebrow={eyebrow} title={sheetTitle} width="lg" tone="dark">
          <div className="space-y-6 text-brand-text-soft leading-relaxed" dangerouslySetInnerHTML={{ __html: sheetHtml }} />
        </SideSheet>
      )}
    </>
  );
}

/* ============================================================
   DEPOIMENTOS — header dinâmico, cards do pool fixo
   ============================================================ */
function DepoimentosBlock({ data }: { data: BlockData }) {
  const { reviews } = usePools();
  const eyebrow = s(data.eyebrow, "Reputação · Google");
  const titleHtml = firstS([data.title_html, data.title, data.subtitle], "<em>4,9</em> de 5 · centenas de avaliações públicas.");
   const showCount = typeof data.show_count === "number" ? data.show_count : 6;
   const tagFilter = s(data.tag_filter).toLowerCase();
  // Fase 1.2: se a página tiver depoimentos próprios (extraídos de página antiga
  // da clínica), eles têm prioridade sobre o pool global de Google reviews.
  const ownItems = arr<{ name?: string; text?: string; rating?: number; date_label?: string; source?: string }>(data.items);
   let list: any[] = [];
 
   if (ownItems.length > 0) {
     list = ownItems.map((it, i) => ({
       id: `own-${i}`,
       name: s(it.name, "Paciente"),
       text: s(it.text),
       rating: typeof it.rating === "number" ? Math.max(1, Math.min(5, it.rating)) : 5,
       date_label: s(it.date_label, ""),
     }));
   } else {
     // Fallback para pool global inteligente
     list = [...reviews];
     
     // 1. Filtrar por tag se houver (futuro: cruzar com categoria da página)
     if (tagFilter) {
       // Implementar filtro por tags se a tabela tiver tags (atualmente reviews não tem explicitamente, mas podemos inferir do texto ou categoria)
     }
     
     // 2. Priorizar melhores notas e posição
     list.sort((a, b) => {
       if (b.rating !== a.rating) return b.rating - a.rating;
       return (a.position || 0) - (b.position || 0);
     });
   }
 
   list = list.slice(0, showCount);
  if (list.length === 0) return null;
  return (
    <section className="bg-brand-black section-pad relative z-[2] overflow-hidden">
      <div className="container-editorial">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
          <div className="reveal">
            <span className="eyebrow">{eyebrow}</span>
            <h2 className="h-display-2 mt-5 text-balance max-w-2xl" dangerouslySetInnerHTML={{ __html: titleHtml }} />
          </div>
          <a href="https://www.google.com/search?q=Clínica+Estética+Batel+Curitiba" target="_blank" rel="noopener" className="inline-flex items-center gap-3 text-brand-gold text-[11px] font-body font-semibold uppercase tracking-[0.2em] border-b border-brand-gold/40 pb-1 hover:border-brand-gold transition-colors group">
            Ver no Google
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2} />
          </a>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-hide pb-6">
        <div className="flex gap-5 px-[max(20px,5vw)] snap-x snap-mandatory">
          {list.map((r) => (
            <article key={r.id} className="snap-start shrink-0 w-[88vw] sm:w-[420px] bg-brand-graphite border border-brand-gold/15 p-7 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex">
                  {[...Array(r.rating)].map((_, i) => (
                    <Star key={i} className="size-3.5 fill-brand-gold text-brand-gold" />
                  ))}
                </div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-brand-text-muted">{r.date_label}</span>
              </div>
              <Quote className="size-7 text-brand-gold/40 mt-5" strokeWidth={1} />
              <p className="mt-3 text-brand-text-soft leading-relaxed text-[15px]">{r.text}</p>
              <p className="mt-6 pt-5 border-t border-brand-gold/15 text-[11px] uppercase tracking-[0.18em] text-brand-text-light">{r.name}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   AI OPINIONS — header dinâmico, cards do pool fixo
   ============================================================ */
function AIOpinionsBlock({ data }: { data: BlockData }) {
  const { aiOpinions } = usePools();
  const eyebrow = s(data.eyebrow, "Reputação digital · LLMs");
  const titleHtml = firstS([data.title_html, data.title], "O que as principais <em>inteligências artificiais</em> dizem sobre nós.");
  const subtitle = s(data.subtitle, "Quando ChatGPT, Claude, Gemini, Perplexity e Grok são consultadas sobre clínicas de estética em Curitiba, este é o consenso.");
  
  if (aiOpinions.length === 0) return null;

  // Duplicar para o marquee
  const displayItems = [...aiOpinions, ...aiOpinions];

  return (
    <section className="bg-brand-cream text-brand-text-dark section-pad relative z-[2] overflow-hidden">
      <div className="absolute inset-0 bg-radial-blur opacity-50 pointer-events-none" aria-hidden />
      <div className="container-editorial relative z-10">
        <div className="reveal max-w-2xl mb-14">
          <span className="eyebrow" style={{ color: "hsl(var(--gold-deep))" }}>{eyebrow}</span>
          <h2 className="h-display-2 mt-5 text-brand-text-dark text-balance" dangerouslySetInnerHTML={{ __html: titleHtml }} />
          <span className="gold-rule mt-7" />
          {subtitle && <p className="mt-6 text-brand-text-dark/70 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      
      <div className="relative flex overflow-hidden">
        <div className="marquee-infinite gap-6 px-4" style={{ "--duration": "80s" } as React.CSSProperties}>
          {displayItems.map((o, i) => (
            <article key={`${o.id}-${i}`} className="shrink-0 w-[300px] md:w-[460px] bg-brand-text-dark text-brand-text-light p-8 md:p-10 border border-brand-gold/30 flex flex-col transition-all duration-500 hover:border-brand-gold hover:shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="font-display text-2xl md:text-3xl text-brand-gold">{o.ai_name}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-brand-text-muted">{o.company}</span>
              </div>
              <span className="gold-rule mt-5" />
              <Quote className="size-7 text-brand-gold/40 mt-6" strokeWidth={1} />
              <p className="mt-3 text-brand-text-soft leading-[1.7] text-[15px] flex-1">"{o.quote}"</p>
              <p className="mt-7 text-[10px] uppercase tracking-[0.22em] text-brand-text-muted">Consulta direta · 2025</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


/* ============================================================
   EQUIPE RT
   ============================================================ */
function EquipeBlock({ data }: { data: BlockData }) {
  const eyebrow = s(data.eyebrow, "Responsável técnica");
  const titleHtml = firstS([data.title_html, data.title, data.name], "Dra. Daniele <em>Florencio</em>");
  const registerLabel = firstS([data.register_label, data.register], "CRBM 8242 PR");
   const imageUrl = firstS([data.image_url, data.photo_url], draRT);
   const bio = firstS(
     [data.bio, data.description],
     "Biomédica esteta com mais de duas décadas dedicadas à harmonização facial. Desenvolveu, ao longo dos anos, um protocolo proprietário focado em resultados naturais e elegantes, respeitando a anatomia individual de cada paciente."
   );
   let accordions = arr<{ question?: string; answer?: string }>(data.accordions);
   if (accordions.length === 0) {
     accordions = [
       { 
         question: "Como a Dra. Daniele pensa cada protocolo", 
         answer: "O caminho é dose progressiva, registrada, com acompanhamento minucioso. Não tratamos o paciente como uma versão genérica de um padrão; cada face exige um vetor e uma dosagem específica para manter a identidade." 
       },
       { 
         question: "Especializações e formação", 
         answer: "Especialista em Harmonização Orofacial com mais de 10.000 procedimentos documentados e atualizações constantes em congressos internacionais de medicina estética." 
       }
     ];
   }
  const ctaLabel = s(data.cta_label, "Conhecer a equipe completa");
  return (
    <section id="equipe" className="bg-brand-cream text-brand-text-dark section-pad relative z-[2]">
      <div className="container-editorial grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-center">
         {imageUrl && (
           <div className="relative reveal mx-auto w-full max-w-sm lg:max-w-none parallax-subtle">
             <div className="aspect-[4/5] overflow-hidden bg-brand-cream-2 border border-brand-gold/10 shadow-soft">
               <img src={imageUrl} alt={titleHtml.replace(/<[^>]+>/g, "")} className="w-full h-full object-cover transition-transform duration-[4s] hover:scale-105" loading="lazy" />
            </div>
            <span className="absolute bottom-4 left-4 right-4 bg-brand-green text-brand-text-light px-5 py-3 text-[10px] font-body uppercase tracking-[0.2em]">{registerLabel}</span>
          </div>
        )}
        <div className="reveal">
          <span className="eyebrow" style={{ color: "hsl(var(--gold-deep))" }}>{eyebrow}</span>
          <h2 className="h-display-2 mt-5 text-brand-text-dark text-balance" dangerouslySetInnerHTML={{ __html: titleHtml }} />
          <span className="gold-rule mt-7" />
          {bio && <p className="mt-7 text-brand-text-dark/80 leading-[1.7]">{bio}</p>}
          {accordions.length > 0 && (
            <div className="mt-7 space-y-1">
              {accordions.map((a, i) => (
                <InlineExpand key={i} tone="cream" question={s(a.question)}>
                  <p>{s(a.answer)}</p>
                </InlineExpand>
              ))}
            </div>
          )}
          {ctaLabel && (
            <a
              href="#contato"
              className="mt-8 inline-flex items-center gap-3 text-brand-green text-[11px] font-body font-semibold uppercase tracking-[0.2em] border-b border-brand-green/40 pb-1 hover:border-brand-green transition-colors group"
            >
              {ctaLabel}
              <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CURSOS — header dinâmico, cards do pool fixo
   ============================================================ */
function CursosBlock({ data }: { data: BlockData }) {
  const { courses } = usePools();
  const eyebrow = s(data.eyebrow, "Para profissionais");
  const titleHtml = firstS([data.title_html, data.title], "Ensinamos o que <em>praticamos</em>.");
  const intro = firstS([data.intro, data.subtitle, data.description]);
  const footnote = s(data.footnote);
  if (courses.length === 0) return null;
  return (
    <section id="cursos" className="bg-brand-bordeaux section-pad bg-pattern-gold relative z-[2]">
      <div className="container-editorial">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16">
          <div className="reveal">
            <span className="eyebrow">{eyebrow}</span>
            <h2 className="h-display-2 mt-5 text-balance" dangerouslySetInnerHTML={{ __html: titleHtml }} />
            <span className="gold-rule mt-6" />
            {intro && <p className="mt-6 text-brand-text-soft leading-[1.7]">{intro}</p>}
            {footnote && <p className="mt-4 text-brand-text-muted text-sm">{footnote}</p>}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
             {courses.map((c, i) => (
               <article key={c.id} style={{ transitionDelay: `${i * 100}ms` }} className="reveal group bg-brand-black/40 border border-brand-gold/15 p-7 hover:border-brand-gold/50 hover:bg-brand-black/60 transition-all duration-500">
                <GraduationCap className="size-7 text-brand-gold" strokeWidth={1.3} />
                <h3 className="font-display text-xl mt-5 leading-snug">{c.title}</h3>
                <p className="text-[10px] uppercase tracking-[0.18em] text-brand-gold mt-3">{c.audience}</p>
                <p className="text-xs text-brand-text-muted mt-1">{c.duration}</p>
                <p className="mt-4 text-sm text-brand-text-soft leading-relaxed">{c.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FAQ — perguntas vêm do data (block.data.items[]); fallback ao pool global.
   ============================================================ */
function FaqBlock({ data }: { data: BlockData }) {
  const { faqs } = usePools();
  const eyebrow = s(data.eyebrow, "Dúvidas frequentes");
  const titleHtml = firstS([data.title_html, data.title], "O que pacientes perguntam <em>antes</em> de agendar.");
  // Aceita items[]/questions[] do bloco; senão cai nos FAQs em destaque do banco.
  let items = arr<{ question?: string; answer?: string }>(data.items ?? data.questions);
  if (items.length === 0) {
    items = faqs.filter((f) => f.featured).map((f) => ({ question: f.question, answer: f.answer }));
    if (items.length === 0) items = faqs.map((f) => ({ question: f.question, answer: f.answer }));
  }
  if (items.length === 0) return null;
  return (
    <section id="faq" className="bg-brand-black section-pad relative z-[2]">
      <div className="container-editorial max-w-4xl mx-auto">
        <div className="text-center reveal">
          <span className="eyebrow mx-auto justify-center">{eyebrow}</span>
          <h2 className="h-display-2 mt-5 text-balance" dangerouslySetInnerHTML={{ __html: titleHtml }} />
          <span className="gold-rule mx-auto mt-7" />
        </div>
        <div className="mt-14">
          {items.map((f, i) => (
            <InlineExpand key={i} question={s(f.question)}>
              <p>{s(f.answer)}</p>
            </InlineExpand>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CTA FINAL
   ============================================================ */
function CtaFinalBlock({ data }: { data: BlockData }) {
  const titleHtml = firstS([data.title_html, data.title], "Trinta anos no <em>Batel</em>.");
  const paragraph = firstS([data.paragraph, data.subtitle, data.body], "Avaliação clínica individual, sem compromisso, com a responsável técnica.");
  const ctaPrimary = readCta(data.cta_primary, { label: "Agendar pelo WhatsApp", href: "https://wa.me/5541999999999" });
  const ctaSecondary = readCta(data.cta_secondary, { label: "(41) 9999-9999", href: "tel:+554199999999" });
  
  return (
    <section className="bg-brand-green-2 section-pad relative z-[2] overflow-hidden">
      <div className="absolute inset-0 bg-radial-blur opacity-30 pointer-events-none" aria-hidden />
      <div className="container-editorial text-center relative z-10">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="reveal">
            <h2 className="h-display-2 text-brand-text-light" dangerouslySetInnerHTML={{ __html: titleHtml }} />
            <span className="gold-rule mx-auto mt-6" />
          </div>
          <p className="text-brand-text-soft text-lg reveal" style={{ transitionDelay: '200ms' }}>{paragraph}</p>
          <div className="flex flex-wrap justify-center gap-4 reveal" style={{ transitionDelay: '400ms' }}>
            <GoldButton as="a" href={ctaPrimary.href} withArrow size="lg">
              <MessageCircle className="size-4" /> {ctaPrimary.label}
            </GoldButton>
            <GoldButton as="a" href={ctaSecondary.href} variant="outline-light" size="lg">
              <Phone className="size-4" /> {ctaSecondary.label}
            </GoldButton>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PROCEDIMENTO DETALHADO (Fase 1.2 — opcional)
   Aproveita seções fortes de páginas antigas da própria clínica,
   mantendo o design da página nova. Não copia layout antigo.
   ============================================================ */
function ProcedimentoDetalhadoBlock({ data }: { data: BlockData }) {
  const eyebrow = s(data.eyebrow, "Como é o procedimento");
  const titleHtml = firstS([data.title_html, data.title], "Como é, na prática, esse <em>procedimento</em>.");
  const paragraphs = arr<string>(data.paragraphs);
  const bullets = arr<{ title?: string; text?: string } | string>(data.bullets);
  const cta = readCta(data.cta, { label: "", href: "" });
  if (!paragraphs.length && !bullets.length) return null;
  return (
    <section className="bg-brand-graphite section-pad relative z-[2]">
      <div className="container-editorial max-w-4xl mx-auto">
        <div className="reveal text-center">
          <span className="eyebrow mx-auto justify-center">{eyebrow}</span>
          <h2 className="h-display-2 mt-5 text-balance" dangerouslySetInnerHTML={{ __html: titleHtml }} />
          <span className="gold-rule mx-auto mt-7" />
        </div>
        {paragraphs.length > 0 && (
          <div className="mt-10 space-y-5 text-brand-text-soft text-[16px] leading-[1.75] reveal">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
        {bullets.length > 0 && (
          <div className="mt-10 grid sm:grid-cols-2 gap-4 reveal">
            {bullets.map((b, i) => {
              const title = typeof b === "string" ? "" : s(b.title);
              const text = typeof b === "string" ? b : s(b.text);
              return (
                 <div key={i} className="group bg-brand-black/60 border border-brand-gold/15 p-8 transition-all duration-500 hover:border-brand-gold/40 hover:bg-brand-black/80">
                   <div className="flex items-start gap-4">
                     <div className="size-10 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0 group-hover:bg-brand-gold/20 transition-colors">
                       <CheckCircle2 className="size-5 text-brand-gold" strokeWidth={1} />
                     </div>
                     <div>
                       {title && <h3 className="font-display text-xl leading-snug text-brand-text-light">{title}</h3>}
                       {text && <p className={cn("text-[15px] text-brand-text-soft leading-relaxed", title && "mt-3")}>{text}</p>}
                     </div>
                   </div>
                 </div>
              );
            })}
          </div>
        )}
        {cta.label && cta.href && (
          <div className="mt-10 text-center reveal">
            <GoldButton as="a" href={cta.href} withArrow>{cta.label}</GoldButton>
          </div>
        )}
      </div>
    </section>
  );
}
/* ============================================================
   MARQUEE CARDS / QUOTES (Infinito)
   ============================================================ */
function MarqueeCardsBlock({ data }: { data: BlockData }) {
  const title = s(data.title);
  const items = arr<{ text?: string; author?: string; company?: string }>(data.items);
  const duration = s(data.speed, "60s");
  
  if (!items.length) return null;

  const displayItems = [...items, ...items];

  return (
    <section className="bg-brand-black py-16 overflow-hidden relative z-[2]">
      {title && (
        <div className="container-editorial mb-12 text-center reveal">
          <h2 className="h-display-3 text-brand-text-light">{title}</h2>
          <span className="gold-rule mx-auto mt-4" />
        </div>
      )}
      
      <div className="relative flex overflow-hidden">
        <div 
          className="marquee-infinite gap-6 px-3" 
          style={{ "--duration": duration } as React.CSSProperties}
        >
          {displayItems.map((item, i) => (
            <div 
              key={i} 
              className="w-[300px] md:w-[400px] shrink-0 bg-brand-graphite/40 border border-brand-gold/15 p-8 md:p-10 backdrop-blur-sm"
            >
              <Quote className="size-6 text-brand-gold/40 mb-6" strokeWidth={1} />
              <p className="text-brand-text-soft italic leading-relaxed text-[16px] md:text-[18px]">
                "{s(item.text)}"
              </p>
              {(item.author || item.company) && (
                <div className="mt-8">
                  <p className="font-display text-brand-gold text-lg">{s(item.author)}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-brand-text-muted mt-1">{s(item.company)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
