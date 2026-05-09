import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { BlockType } from "@/types/blocks";
import {
  Star,
  Sparkles,
  ShieldCheck,
  Award,
  ArrowRight,
  ArrowUpRight,
  Quote,
  Play,
  GraduationCap,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
 import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingCTA } from "@/components/site/FloatingCTA";
import { Medal } from "@/components/site/Medal";
import { GoldButton } from "@/components/site/GoldButton";
import { SideSheet } from "@/components/site/SideSheet";
import { InlineExpand } from "@/components/site/InlineExpand";
import { CaseModal } from "@/components/site/CaseModal";
 import { SEO } from "@/components/site/SEO";
import { cases, faqs, reviews, aiOpinions, courses, type ClinicalCase } from "@/data/landing";
import { useReveal } from "@/hooks/use-reveal";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";
import heroMale from "@/assets/hero-male.webp";
import draRT from "@/assets/dra-rt.webp";
import clinicInterior from "@/assets/clinic-interior.webp";

const Index = () => {
  // Compat: links antigos no formato "/?preview=<slug>" agora redirecionam
  // para a rota dinâmica "/p/<slug>?preview=1".
  const [searchParams] = useSearchParams();
  const legacyPreview = searchParams.get("preview");
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  useReveal();
  
  const [manifestoOpen, setManifestoOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [openCase, setOpenCase] = useState<ClinicalCase | null>(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const [caseFilter, setCaseFilter] = useState<string>("Todos");

  const featuredCases = cases.filter((c) => c.highlight).slice(0, 6);
  const featuredFaqs = faqs.filter((f) => f.featured);
  const restFaqs = faqs.filter((f) => !f.featured);
  const areas = ["Todos", ...Array.from(new Set(cases.map((c) => c.area)))];
  const filtered = caseFilter === "Todos" ? cases : cases.filter((c) => c.area === caseFilter);

  if (legacyPreview && legacyPreview !== "1") {
    return <Navigate to={`/p/${legacyPreview}?preview=1`} replace />;
  }

  // ========================================================
  // Snapshot publicado: define ordem e quais blocos renderizar.
  // Conteúdo visual permanece hardcoded (paridade pixel-perfect).
  // Quando o snapshot está ausente, cai no fallback da ordem padrão.
  // ========================================================
  const DEFAULT_ORDER: BlockType[] = [
    "hero",
    "authority_strip",
    "manifesto_curto",
    "metodo",
    "casos",
    "preco_ancora",
    "depoimentos",
    "ai_opinions",
    "equipe_rt",
    "cursos",
    "faq",
    "cta_final",
  ];
  const [order, setOrder] = useState<BlockType[]>(DEFAULT_ORDER);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("pages")
      .select("published_snapshot")
      .eq("slug", "botox-masculino")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const blocks = (data?.published_snapshot as { blocks?: Array<{ type: BlockType; position: number; enabled: boolean }> } | null)?.blocks;
        if (!Array.isArray(blocks) || blocks.length === 0) return;
        const ordered = blocks
          .filter((b) => b.enabled)
          .sort((a, b) => a.position - b.position)
          .map((b) => b.type)
          .filter((t) => DEFAULT_ORDER.includes(t));
        if (ordered.length > 0) setOrder(ordered);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blockRenderers: Record<BlockType, () => JSX.Element | null> = useMemo(() => ({
    hero: () => renderHero(),
    authority_strip: () => <AuthorityStrip />,
    manifesto_curto: () => renderManifesto(),
    metodo: () => <MethodSection />,
    procedimento_detalhado: () => null,
    casos: () => renderCasos(),
    preco_ancora: () => renderPrecoAncora(),
    depoimentos: () => <ReviewsSection />,
    ai_opinions: () => <AISection />,
    equipe_rt: () => renderEquipe(),
    cursos: () => renderCursos(),
    faq: () => renderFaq(),
    cta_final: () => renderCtaFinal(),
    beneficios_grid: () => null,
     procedimento_detalhado_v2: () => null,
     marquee_cards: () => null,
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Renderers inline — cada um devolve o JSX da seção original.
  function renderHero() {
    return (
      <section key="hero" className="relative overflow-hidden bg-brand-black">
        <div
          aria-hidden
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 80% 20%, hsl(41 49% 58% / 0.12), transparent 60%), radial-gradient(ellipse 60% 50% at 0% 100%, hsl(168 59% 9% / 0.6), transparent 60%)",
          }}
        />
        <div className="container-editorial relative z-[2] grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-20 items-center pt-16 pb-20 md:pt-24 md:pb-28 lg:py-32">
          <div className="reveal">
            <span className="eyebrow">Botox masculino · Curitiba</span>
            <h1 className="h-display-1 mt-6 text-balance">
              Para parecer <em>descansado</em>,
              <br className="hidden sm:block" /> não para parecer <em>outra pessoa</em>.
            </h1>
            <span className="gold-rule mt-7" />
            <p className="mt-7 text-brand-text-soft text-base md:text-[17px] leading-[1.75] max-w-xl text-pretty">
              Protocolo de toxina botulínica com dosagem calibrada para a anatomia masculina. Sem aspecto congelado, sem perder a expressão que comunica autoridade. Avaliação individual, técnica documentada, resultado em 14 dias.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <GoldButton as="a" href="https://wa.me/5541999999999" withArrow size="lg">
                <MessageCircle className="size-4" /> Agendar pelo WhatsApp
              </GoldButton>
              <GoldButton as="a" href="#avaliacao" variant="outline-light" size="lg" withArrow>
                Avaliação clínica
              </GoldButton>
            </div>
            <p className="mt-6 text-[11px] tracking-[0.2em] uppercase text-brand-text-muted">
              Resposta em até 30 minutos · Atendimento confidencial
            </p>
          </div>
          <div className="relative reveal mx-auto lg:mx-0 w-full max-w-md lg:max-w-none">
            <div className="aspect-[4/5] overflow-hidden bg-brand-graphite relative">
              <img
                src={heroMale}
                alt="Retrato editorial de paciente masculino com resultado natural de Botox"
                className="w-full h-full object-cover"
                loading="eager"
                width={896}
                height={1120}
                fetchPriority="high"
                onError={(e) => {
                  console.error("Hero image failed to load:", e);
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 50%, hsl(0 0% 0% / 0.6) 100%)" }} />
            </div>
            <div className="absolute -top-6 -right-4 md:-top-8 md:-right-8 z-10">
              <Medal size={130} floating className="drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
            </div>
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-brand-gold">Caso documentado</p>
                <p className="font-display italic text-xl text-brand-text-light mt-1">44 anos · 14 dias</p>
              </div>
              <button onClick={() => setOpenCase(featuredCases[0])} className="size-12 rounded-full bg-brand-gold text-brand-green grid place-items-center hover:scale-110 transition-transform" aria-label="Ver caso">
                <ArrowUpRight className="size-5" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderManifesto() {
    return (
      <section key="manifesto_curto" className="bg-brand-black section-pad relative z-[2]">
        <div className="container-editorial grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-20 items-start">
          <div className="reveal">
            <span className="eyebrow">Manifesto</span>
            <span className="gold-rule mt-6 gold-rule-animated" style={{ width: 60 }} />
          </div>
          <div className="reveal">
            <p className="font-display text-2xl md:text-3xl lg:text-4xl leading-[1.3] text-brand-text-light text-balance">
              "Não tratamos o homem como uma versão masculina do protocolo feminino. <em>Anatomia diferente, dose diferente, vetor diferente.</em> Trinta anos depois, o que entregamos é coerência: a mesma cara, só sem a marca do cansaço."
            </p>
            <p className="mt-6 text-sm text-brand-text-muted uppercase tracking-[0.2em]">Dra. Daniele Florencio · RT</p>
            <button onClick={() => setManifestoOpen(true)} className="mt-8 inline-flex items-center gap-3 text-brand-gold text-[11px] font-body font-semibold uppercase tracking-[0.2em] border-b border-brand-gold/40 pb-1 hover:border-brand-gold transition-colors group">
              Ler manifesto completo
              <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderCasos() {
    return (
      <section key="casos" id="casos" className="bg-brand-cream text-brand-text-dark section-pad relative z-[2]">
        <div className="container-editorial">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div className="reveal">
              <span className="eyebrow" style={{ color: "hsl(var(--gold-deep))" }}>Casos clínicos documentados</span>
              <h2 className="h-display-2 mt-5 text-brand-text-dark text-balance max-w-2xl">
                Resultados <em>reais</em>, dosagem registrada,<br className="hidden md:block" /> tempo medido.
              </h2>
            </div>
            <button onClick={() => setLibraryOpen(true)} className="self-start inline-flex items-center gap-3 text-brand-green text-[11px] font-body font-semibold uppercase tracking-[0.2em] border-b border-brand-green/40 pb-1 hover:border-brand-green transition-colors group">
              Ver biblioteca completa ({cases.length})
              <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {featuredCases.map((c) => (
              <CaseCard key={c.id} caseData={c} onClick={() => setOpenCase(c)} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderPrecoAncora() {
    return (
      <section key="preco_ancora" id="precos" className="bg-brand-green-2 section-pad relative z-[2]">
        <div className="container-editorial max-w-3xl mx-auto text-center">
          <span className="eyebrow mx-auto justify-center reveal">Investimento</span>
          <h2 className="h-display-2 mt-5 reveal text-balance">A partir de <em>R$ 1.490</em></h2>
          <span className="gold-rule mx-auto mt-7" />
          <p className="mt-7 text-brand-text-soft text-lg leading-relaxed max-w-xl mx-auto reveal">
            Inclui avaliação clínica completa, aplicação por responsável técnica, retorno de 14 dias e ajuste fino sem custo adicional.
          </p>
          <ul className="mt-8 grid sm:grid-cols-3 gap-4 text-sm text-brand-text-soft reveal">
            {["Toxina premium importada", "Retorno em 14 dias incluso", "Plano de manutenção 6 meses"].map((b) => (
              <li key={b} className="flex items-start gap-2 justify-center">
                <CheckCircle2 className="size-4 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3 justify-center reveal">
            <GoldButton onClick={() => setPriceOpen(true)} withArrow>Entender o preço em detalhe</GoldButton>
            <GoldButton as="a" href="https://wa.me/5541999999999" variant="outline-light">Falar agora</GoldButton>
          </div>
        </div>
      </section>
    );
  }

  function renderEquipe() {
    return (
      <section key="equipe_rt" id="equipe" className="bg-brand-cream text-brand-text-dark section-pad relative z-[2]">
        <div className="container-editorial grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-center">
          <div className="relative reveal mx-auto w-full max-w-sm lg:max-w-none">
            <div className="aspect-[4/5] overflow-hidden bg-brand-cream-2">
              <img src={draRT} alt="Dra. Daniele Florencio, responsável técnica" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <span className="absolute bottom-4 left-4 right-4 bg-brand-green text-brand-text-light px-5 py-3 text-[10px] font-body uppercase tracking-[0.2em]">CRBM 8242 PR</span>
          </div>
          <div className="reveal">
            <span className="eyebrow" style={{ color: "hsl(var(--gold-deep))" }}>Responsável técnica</span>
            <h2 className="h-display-2 mt-5 text-brand-text-dark text-balance">Dra. Daniele <em>Florencio</em></h2>
            <span className="gold-rule mt-7" />
            <p className="mt-7 text-brand-text-dark/80 leading-[1.7]">
              Biomédica esteta com mais de duas décadas dedicadas à harmonização facial. Desenvolveu, ao longo dos anos, um protocolo proprietário de aplicação de toxina botulínica em pacientes masculinos.
            </p>
            <div className="mt-7 space-y-1">
              <InlineExpand tone="cream" question="Como a Dra. Daniele pensa o protocolo masculino">
                <p>"O homem médio chega com franzimento de glabela mais marcado e pele mais espessa. Se eu replicar dose feminina, ele perde o movimento natural. O caminho é dose progressiva, registrada, com retorno em 14 dias para ajuste fino."</p>
              </InlineExpand>
              <InlineExpand tone="cream" question="Especializações e formação">
                <ul className="space-y-2 list-none">
                  <li>· Especialização em Harmonização Orofacial</li>
                  <li>· Atualizações anuais em congressos internacionais</li>
                  <li>· Mais de 10.000 procedimentos documentados</li>
                  <li>· Mentora de profissionais em formação</li>
                </ul>
              </InlineExpand>
            </div>
            <button onClick={() => setDoctorOpen(true)} className="mt-8 inline-flex items-center gap-3 text-brand-green text-[11px] font-body font-semibold uppercase tracking-[0.2em] border-b border-brand-green/40 pb-1 hover:border-brand-green transition-colors group">
              Conhecer a equipe completa
              <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderCursos() {
    return (
      <section key="cursos" id="cursos" className="bg-brand-bordeaux section-pad relative z-[2]">
        <div className="container-editorial">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16">
            <div className="reveal">
              <span className="eyebrow">Para profissionais</span>
              <h2 className="h-display-2 mt-5 text-balance">Ensinamos o que <em>praticamos</em>.</h2>
              <span className="gold-rule mt-6" />
              <p className="mt-6 text-brand-text-soft leading-[1.7]">
                Nossa metodologia é aberta para outros profissionais. Mentorias presenciais e cursos para quem quer dominar protocolos de injetáveis com base clínica sólida.
              </p>
              <p className="mt-4 text-brand-text-muted text-sm">
                Acreditamos que o setor cresce quando os profissionais elevam o padrão técnico em conjunto.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((c) => (
                <article key={c.title} className="reveal group bg-brand-black/40 border border-brand-gold/15 p-7 hover:border-brand-gold/50 hover:bg-brand-black/60 transition-all duration-500">
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

  function renderFaq() {
    return (
      <section key="faq" id="faq" className="bg-brand-black section-pad relative z-[2]">
        <div className="container-editorial max-w-4xl mx-auto">
          <div className="text-center reveal">
            <span className="eyebrow mx-auto justify-center">Dúvidas frequentes</span>
            <h2 className="h-display-2 mt-5 text-balance">O que pacientes perguntam <em>antes</em> de agendar.</h2>
            <span className="gold-rule mx-auto mt-7" />
          </div>
          <div className="mt-14">
            {featuredFaqs.map((f) => (
              <InlineExpand key={f.q} question={f.q}>
                <p>{f.a}</p>
              </InlineExpand>
            ))}
            <div className={cn("transition-all duration-700 overflow-hidden", showAllFaqs ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0")} aria-hidden={!showAllFaqs}>
              {restFaqs.map((f) => (
                <InlineExpand key={f.q} question={f.q}>
                  <p>{f.a}</p>
                </InlineExpand>
              ))}
            </div>
          </div>
          {restFaqs.length > 0 && (
            <div className="text-center mt-10">
              <button onClick={() => setShowAllFaqs((v) => !v)} className="inline-flex items-center gap-3 text-brand-gold text-[11px] font-body font-semibold uppercase tracking-[0.2em] border-b border-brand-gold/40 pb-1 hover:border-brand-gold transition-colors">
                {showAllFaqs ? "Recolher" : `Ver todas as ${faqs.length} perguntas`}
                <ArrowRight className={cn("size-3.5 transition-transform", showAllFaqs && "rotate-90")} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderCtaFinal() {
    return (
      <section key="cta_final" id="avaliacao" className="bg-brand-green section-pad relative z-[2] overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, hsl(41 49% 58% / 0.2), transparent 70%)" }} />
        <div className="container-editorial relative z-[2] max-w-3xl mx-auto text-center">
          <Medal size={120} floating className="mx-auto" />
          <h2 className="h-display-1 mt-10 text-balance">
            Trinta anos no <em>Batel</em>.<br />
            <span className="text-brand-text-soft">Quatorze dias até o seu resultado.</span>
          </h2>
          <span className="gold-rule mx-auto mt-8" />
          <p className="mt-7 text-brand-text-soft text-lg leading-relaxed">
            Avaliação clínica individual, sem compromisso, com a responsável técnica. Você sai com plano e orçamento.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <GoldButton as="a" href="https://wa.me/5541999999999" size="lg" withArrow>
              <MessageCircle className="size-4" /> Agendar pelo WhatsApp
            </GoldButton>
            <GoldButton as="a" href="tel:+554199999999" size="lg" variant="outline-light">
              <Phone className="size-4" /> (41) 9999-9999
            </GoldButton>
          </div>
        </div>
      </section>
    );
  }

   return (
     <div className="bg-brand-black text-brand-text-light min-h-screen">
       <SEO 
         title="Botox Masculino" 
         description="Protocolo de Botox com dosagem calibrada para a anatomia masculina. Clínica de Estética Batel, Curitiba — desde 1995."
       />
       <Header />

      {/* ========================================================
          BLOCOS DA PÁGINA — ordem e visibilidade vêm do snapshot
          publicado no banco (admin → published_snapshot).
          ======================================================== */}
      {order.map((type) => {
        const renderer = blockRenderers[type];
        return renderer ? <div key={type}>{renderer()}</div> : null;
      })}


      {/* ========================================================
          MAPA + ENDEREÇO + DIFERENCIAIS PDF
          ======================================================== */}
      <section id="contato" className="bg-brand-black relative z-[2]">
        <div className="container-editorial pt-16 md:pt-24 pb-10">
          <div className="grid lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16 items-start">
            <div className="reveal">
              <span className="eyebrow">Onde estamos</span>
              <h2 className="h-display-2 mt-5 text-balance">
                No coração do <em>Batel</em>.
              </h2>
              <span className="gold-rule mt-7" />
              <address className="mt-7 not-italic text-brand-text-soft text-base leading-[1.8]">
                Rua Comendador Araújo, 000<br />
                Batel · Curitiba/PR<br />
                CEP 80420-000
              </address>
              <div className="mt-7 space-y-3 text-sm">
                <a href="tel:+554199999999" className="flex items-center gap-3 text-brand-text-light hover:text-brand-gold transition-colors">
                  <Phone className="size-4 text-brand-gold" strokeWidth={1.5} /> (41) 9999-9999
                </a>
                <a href="https://wa.me/5541999999999" className="flex items-center gap-3 text-brand-text-light hover:text-brand-gold transition-colors">
                  <MessageCircle className="size-4 text-brand-gold" strokeWidth={1.5} /> WhatsApp
                </a>
              </div>
              <div className="mt-9 pt-7 border-t border-brand-gold/15">
                <p className="text-[10px] uppercase tracking-[0.22em] text-brand-gold mb-4">Documentação técnica</p>
                <div className="flex flex-wrap gap-2">
                  {["Diferenciais técnicos", "Alvará sanitário", "TCLE"].map((label) => (
                    <a key={label} href="#" className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/5 transition-colors">
                      {label} (PDF)
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="reveal">
              <div className="aspect-[16/11] overflow-hidden border border-brand-gold/20">
                <iframe
                  title="Localização da Clínica de Estética Batel"
                  src="https://www.google.com/maps?q=Rua+Comendador+Araújo+Batel+Curitiba&output=embed"
                  className="w-full h-full grayscale-[60%] contrast-[1.05]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <p className="text-xs text-brand-text-muted mt-3 flex items-center gap-2">
                <MapPin className="size-3.5 text-brand-gold" strokeWidth={1.5} />
                Estacionamento conveniado a 50 metros
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <FloatingCTA />

      {/* ============== Side sheets & Modals ============== */}
      <SideSheet
        open={manifestoOpen}
        onClose={() => setManifestoOpen(false)}
        eyebrow="Manifesto"
        title="Por que tratamos o homem diferente"
        width="lg"
        tone="dark"
      >
        <div className="space-y-6 font-display text-lg md:text-xl leading-[1.6] text-brand-text-light/90">
          <p>
            Quando comecei, há trinta anos, o Botox era praticamente um
            procedimento feminino. Doses padronizadas, vetores padronizados,
            resultado padronizado.
          </p>
          <p>
            <em>O paciente masculino chegava como exceção</em> — e era tratado
            como tal. Recebia a mesma técnica, ajustada na intuição. Em duas
            semanas, voltava com a expressão estranha. Não congelada, mas
            "menos ele".
          </p>
          <p>
            Mudei minha abordagem quando entendi que a anatomia masculina não é
            uma variação da feminina — ela é uma anatomia própria. Pele mais
            espessa, musculatura mais densa, distribuição de linhas diferente.
          </p>
          <p>
            Hoje, cada protocolo masculino aqui parte de um princípio:{" "}
            <em>preservar identidade.</em> O homem precisa continuar sendo
            reconhecido em reuniões, em jantares, em fotos. O que muda é o
            cansaço acumulado nas linhas — não a pessoa.
          </p>
          <p className="text-base text-brand-text-soft font-body italic mt-10">
            — Dra. Daniele Florencio
          </p>
        </div>
      </SideSheet>

      <SideSheet
        open={priceOpen}
        onClose={() => setPriceOpen(false)}
        eyebrow="Investimento"
        title="Como compomos o preço"
        width="lg"
        tone="dark"
      >
        <PriceSheetContent />
      </SideSheet>

      <SideSheet
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        eyebrow={`${cases.length} casos`}
        title="Biblioteca de casos clínicos"
        width="xl"
      >
        <div className="flex flex-wrap gap-2 mb-6 sticky top-0 bg-brand-green-2 -mx-6 md:-mx-10 px-6 md:px-10 py-3 -mt-6 md:-mt-8 z-10 border-b border-brand-gold/15">
          {areas.map((a) => (
            <button
              key={a}
              onClick={() => setCaseFilter(a)}
              className={cn(
                "text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 border transition-all",
                caseFilter === a
                  ? "bg-brand-gold text-brand-green border-brand-gold"
                  : "border-brand-gold/30 text-brand-text-soft hover:border-brand-gold hover:text-brand-gold"
              )}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setLibraryOpen(false);
                setTimeout(() => setOpenCase(c), 200);
              }}
              className="group text-left bg-brand-black/40 border border-brand-gold/15 hover:border-brand-gold/50 transition-all overflow-hidden"
            >
              <div className="aspect-[4/3] overflow-hidden bg-brand-graphite">
                <img src={c.cover} alt={c.area} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              </div>
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-brand-gold">{c.age}</p>
                <h3 className="font-display text-lg mt-1 text-brand-text-light">{c.area}</h3>
              </div>
            </button>
          ))}
        </div>
      </SideSheet>

      <SideSheet
        open={doctorOpen}
        onClose={() => setDoctorOpen(false)}
        eyebrow="Equipe"
        title="Outras profissionais da clínica"
        width="md"
        tone="cream"
      >
        <div className="space-y-6">
          <p className="text-brand-text-dark/80 leading-relaxed">
            Toda a equipe é treinada no protocolo proprietário desenvolvido pela
            Dra. Daniele e segue o mesmo padrão de avaliação, dosagem e
            documentação clínica.
          </p>
          <div className="overflow-hidden">
            <img src={clinicInterior} alt="Interior da clínica" className="w-full aspect-[4/3] object-cover" loading="lazy" />
          </div>
          <div className="space-y-1">
            <InlineExpand tone="cream" question="Dra. Mariana Costa · Aplicações injetáveis">
              <p>Especialista em harmonização com mais de 8 anos de experiência exclusiva em injetáveis.</p>
            </InlineExpand>
            <InlineExpand tone="cream" question="Dra. Patrícia Almeida · Lasers e tecnologias">
              <p>Responsável pelo departamento de tecnologias avançadas: Fraxel, Lumecca, CO2 fracionado.</p>
            </InlineExpand>
          </div>
        </div>
      </SideSheet>

      <CaseModal caseData={openCase} onClose={() => setOpenCase(null)} />
    </div>
  );
};

/* ===========================================================
   AUTHORITY STRIP
   =========================================================== */
function AuthorityStrip() {
  const years = useCountUp(30);
  const patients = useCountUp(10000);
  const procedures = useCountUp(95);
  return (
    <section className="bg-brand-green-2 border-y border-brand-gold/15 relative z-[2]">
      <div className="container-editorial py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6 items-center">
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

function Stat({
  label,
  value,
  suffix,
  innerRef,
  fmt,
}: {
  label: string;
  value: number;
  suffix?: string;
  innerRef: React.RefObject<HTMLSpanElement>;
  fmt?: boolean;
}) {
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

/* ===========================================================
   METHOD SECTION
   =========================================================== */
function MethodSection() {
  const steps = [
    {
      n: "01",
      title: "Avaliação anatômica",
      summary: "Mapeamento de linhas dinâmicas, espessura de pele, tônus muscular e expectativa.",
      detail:
        "Não vendemos pacote. A avaliação dura cerca de 25 minutos e termina com um plano escrito: regiões, dose proposta, tipo de toxina indicada e tempo de manutenção esperado.",
      icon: ShieldCheck,
    },
    {
      n: "02",
      title: "Aplicação calibrada",
      summary: "Protocolo proprietário com dosagem ajustada para musculatura masculina mais densa.",
      detail:
        "Aplicação por responsável técnica, com toxina importada premium. O procedimento dura 20 minutos. Você sai e retoma compromissos no mesmo dia.",
      icon: Sparkles,
    },
    {
      n: "03",
      title: "Retorno em 14 dias",
      summary: "Avaliação do resultado, registro fotográfico e ajuste fino sem custo.",
      detail:
        "Retorno obrigatório no protocolo. Avaliamos resultado, ajustamos dose se necessário e definimos calendário de manutenção. Tudo registrado em prontuário.",
      icon: Award,
    },
  ];
  return (
    <section id="procedimentos" className="bg-brand-graphite section-pad relative z-[2]">
      <div className="container-editorial">
        <div className="text-center reveal max-w-2xl mx-auto">
          <span className="eyebrow mx-auto justify-center">Método</span>
          <h2 className="h-display-2 mt-5 text-balance">
            Três passos. <em>Documentados.</em>
          </h2>
          <span className="gold-rule mx-auto mt-7" />
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {steps.map((s) => (
            <article key={s.n} className="reveal bg-brand-black/60 border border-brand-gold/15 p-7 md:p-9 hover:border-brand-gold/40 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <span className="font-display italic text-brand-gold text-xl md:text-2xl">{s.n}</span>
                <s.icon className="size-6 text-brand-gold/70" strokeWidth={1.3} />
              </div>
              <h3 className="font-display text-2xl mt-5 leading-snug">{s.title}</h3>
              <p className="mt-3 text-brand-text-soft text-[15px] leading-relaxed">{s.summary}</p>
              <div className="mt-5 -mx-2">
                <InlineExpand tone="dark" question="Como funciona na prática">
                  <p>{s.detail}</p>
                </InlineExpand>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===========================================================
   CASE CARD
   =========================================================== */
function CaseCard({ caseData, onClick }: { caseData: ClinicalCase; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="reveal group relative text-left overflow-hidden bg-brand-cream-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
    >
      <div className="aspect-[4/5] overflow-hidden">
        <img
          src={caseData.cover}
          alt={`${caseData.area} — ${caseData.age}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, transparent 45%, hsl(0 0% 0% / 0.65) 100%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-brand-gold">{caseData.age}</p>
          <h3 className="font-display text-2xl text-brand-text-light leading-tight mt-1">{caseData.area}</h3>
        </div>
        <span className="size-11 rounded-full bg-brand-gold text-brand-green grid place-items-center transition-transform duration-500 group-hover:rotate-45">
          <ArrowUpRight className="size-5" strokeWidth={1.8} />
        </span>
      </div>
      {/* Gold reveal overlay on hover */}
      <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <span className="text-[10px] uppercase tracking-[0.22em] bg-brand-gold text-brand-green px-2.5 py-1">
          Ver caso
        </span>
      </div>
    </button>
  );
}

/* ===========================================================
   PRICE SHEET (default content; can be replaced by HTML slot later)
   =========================================================== */
function PriceSheetContent() {
  return (
    <div className="space-y-8">
      <p className="text-brand-text-soft leading-relaxed">
        O valor varia conforme regiões tratadas, tipo de toxina e plano de
        manutenção. Abaixo, a referência atual de tabela.
      </p>

      <div>
        <h3 className="font-display text-2xl mb-4">Por região</h3>
        <ul className="divide-y divide-brand-gold/15 border-y border-brand-gold/15">
          {[
            ["Glabela (entre as sobrancelhas)", "R$ 1.490"],
            ["Frontal (testa)", "R$ 1.290"],
            ["Pés-de-galinha (par)", "R$ 1.190"],
            ["Terço superior completo", "R$ 2.890"],
            ["Bruxismo / Masseter", "R$ 1.890"],
            ["Sorriso gengival", "R$ 990"],
          ].map(([label, val]) => (
            <li key={label} className="flex items-center justify-between py-4">
              <span className="text-brand-text-light">{label}</span>
              <span className="font-display text-xl text-brand-gold">{val}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-display text-2xl mb-4">O que está incluso</h3>
        <ul className="space-y-3 text-brand-text-soft">
          {[
            "Avaliação clínica completa com responsável técnica",
            "Aplicação por biomédica esteta sênior",
            "Toxina importada premium (Allergan / Dysport / Xeomin)",
            "Retorno de 14 dias com ajuste fino sem custo",
            "Plano de manutenção personalizado",
            "Documentação fotográfica em prontuário",
          ].map((b) => (
            <li key={b} className="flex items-start gap-3">
              <CheckCircle2 className="size-4 text-brand-gold shrink-0 mt-1" strokeWidth={1.5} />
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-brand-black/40 border border-brand-gold/20 p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-brand-gold mb-3">
          Pagamento
        </p>
        <p className="text-brand-text-soft text-sm leading-relaxed">
          Pix, cartão de crédito em até 6× sem juros, ou plano de manutenção
          anual com 10% de desconto.
        </p>
      </div>

      <GoldButton as="a" href="https://wa.me/5541999999999" className="w-full" withArrow>
        Quero conversar com a clínica
      </GoldButton>
    </div>
  );
}

/* ===========================================================
   REVIEWS SECTION (Google reviews-style horizontal scroll)
   =========================================================== */
function ReviewsSection() {
  return (
    <section className="bg-brand-black section-pad relative z-[2] overflow-hidden">
      <div className="container-editorial">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
          <div className="reveal">
            <span className="eyebrow">Reputação · Google</span>
            <h2 className="h-display-2 mt-5 text-balance max-w-2xl">
              <em>4,9</em> de 5 · centenas de avaliações públicas.
            </h2>
          </div>
          <a
            href="https://www.google.com/search?q=Clínica+Estética+Batel+Curitiba"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-3 text-brand-gold text-[11px] font-body font-semibold uppercase tracking-[0.2em] border-b border-brand-gold/40 pb-1 hover:border-brand-gold transition-colors group"
          >
            Ver no Google
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2} />
          </a>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-hide pb-6">
        <div className="flex gap-5 px-[max(20px,5vw)] md:px-[max(20px,5vw)] snap-x snap-mandatory">
          {reviews.map((r) => (
            <article
              key={r.name}
              className="snap-start shrink-0 w-[88vw] sm:w-[420px] bg-brand-graphite border border-brand-gold/15 p-7 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <div className="flex">
                  {[...Array(r.rating)].map((_, i) => (
                    <Star key={i} className="size-3.5 fill-brand-gold text-brand-gold" />
                  ))}
                </div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-brand-text-muted">{r.date}</span>
              </div>
              <Quote className="size-7 text-brand-gold/40 mt-5" strokeWidth={1} />
              <p className="mt-3 text-brand-text-soft leading-relaxed text-[15px]">{r.text}</p>
              <p className="mt-6 pt-5 border-t border-brand-gold/15 text-[11px] uppercase tracking-[0.18em] text-brand-text-light">
                {r.name}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===========================================================
   AI SECTION — what AIs say about us
   =========================================================== */
function AISection() {
  return (
    <section className="bg-brand-cream text-brand-text-dark section-pad relative z-[2] overflow-hidden">
      <div className="container-editorial">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
          <div className="reveal max-w-2xl">
            <span className="eyebrow" style={{ color: "hsl(var(--gold-deep))" }}>
              Reputação digital · LLMs
            </span>
            <h2 className="h-display-2 mt-5 text-brand-text-dark text-balance">
              O que as principais <em>inteligências artificiais</em> dizem sobre nós.
            </h2>
            <span className="gold-rule mt-7" />
            <p className="mt-6 text-brand-text-dark/70 leading-relaxed">
              Quando ChatGPT, Claude, Gemini, Perplexity e Grok são consultadas
              sobre clínicas de estética em Curitiba, este é o consenso.
            </p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-hide pb-6">
        <div className="flex gap-5 px-[max(20px,5vw)] snap-x snap-mandatory">
          {aiOpinions.map((o) => (
            <article
              key={o.ai}
              className="snap-start shrink-0 w-[88vw] sm:w-[460px] bg-brand-text-dark text-brand-text-light p-8 md:p-9 border border-brand-gold/30 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl text-brand-gold">{o.ai}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-brand-text-muted">{o.company}</span>
              </div>
              <span className="gold-rule mt-5" />
              <Quote className="size-7 text-brand-gold/40 mt-6" strokeWidth={1} />
              <p className="mt-3 text-brand-text-soft leading-[1.7] text-[15px] flex-1">"{o.quote}"</p>
              <p className="mt-7 text-[10px] uppercase tracking-[0.22em] text-brand-text-muted">
                Consulta direta · 2025
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Index;