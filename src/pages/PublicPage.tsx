 import { useEffect, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingCTA } from "@/components/site/FloatingCTA";
import { BlockRenderer } from "@/components/site/BlockRenderer";
import { LocalizacaoSection } from "@/components/site/LocalizacaoSection";
 import { SEO } from "@/components/site/SEO";
import { useReveal } from "@/hooks/use-reveal";
import { PoolsProvider, usePoolsQuery } from "@/hooks/use-pools";
import type { BlockType } from "@/types/blocks";
import { cn } from "@/lib/utils";

interface BlockRow {
  id: string;
  type: BlockType;
  position: number;
  enabled: boolean;
  data: Record<string, unknown>;
}

 interface PageRow {
   id: string;
   slug: string;
   title: string;
   meta_title: string | null;
   meta_description: string | null;
   status: "draft" | "published";
   metadata?: any;
 }

interface PublicPageProps {
  slugOverride?: string;
}

export default function PublicPage({ slugOverride }: PublicPageProps = {}) {
  const params = useParams();
  const slug = slugOverride ?? params.slug ?? "";
  const [params] = useSearchParams();
  const previewMode = params.get("preview") === "1";

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-page", slug, previewMode],
    queryFn: async () => {
      const pageQuery = supabase.from("pages").select("*").eq("slug", slug).maybeSingle();
      const { data: page, error: pe } = await pageQuery;
      if (pe) throw pe;
      if (!page) {
        console.log("Page not found for slug:", slug);
        return null;
      }
      const p = page as unknown as PageRow;
      if (!previewMode && p.status !== "published") return null;

      const { data: blocks, error: be } = await supabase
        .from("page_blocks")
        .select("id,type,position,enabled,data")
        .eq("page_id", p.id)
        .eq("enabled", true)
        .order("position");
      if (be) throw be;
      return { page: p, blocks: (blocks ?? []) as unknown as BlockRow[] };
    },
  });

  const poolsQuery = usePoolsQuery();
  const pools = poolsQuery.data ?? { cases: [], reviews: [], aiOpinions: [], courses: [], faqs: [] };

  const blocks = useMemo(
    () => (data?.blocks ?? []).slice().sort((a, b) => a.position - b.position),
    [data?.blocks],
  );

   const { pageImage, heroImage, schemas } = useMemo(() => {
    const meta = data?.page?.metadata as any;
    const heroBlock = data?.blocks?.find(b => b.type === 'hero');
    const heroUrl = (heroBlock?.data as any)?.image_url;
    
     const pageSchemas: any[] = [];
     
     // 1. MedicalProcedure Schema
     if (data?.page) {
       pageSchemas.push({
         "@context": "https://schema.org",
         "@type": "MedicalProcedure",
         "name": data.page.title,
         "description": data.page.meta_description,
         "procedureType": "SurgicalProcedure",
         "bodyLocation": (data.page as any).metadata?.area_anatomica || "Corpo",
         "relevantSpecialty": {
           "@type": "MedicalSpecialty",
           "name": "Estética Avançada"
         }
       });
     }

     // 2. FAQPage Schema
     const faqBlock = data?.blocks?.find(b => b.type === 'faq');
     if (faqBlock) {
       const items = (faqBlock.data as any)?.items || [];
       if (items.length > 0) {
         pageSchemas.push({
           "@context": "https://schema.org",
           "@type": "FAQPage",
           "mainEntity": items.map((f: any) => ({
             "@type": "Question",
             "name": f.question,
             "acceptedAnswer": {
               "@type": "Answer",
               "text": f.answer
             }
           }))
         });
       }
     }

     return {
       pageImage: meta?.og_image || meta?.hero_image || heroUrl || "",
       heroImage: heroUrl,
       schemas: pageSchemas
     };
   }, [data?.page, data?.blocks]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!previewMode) return;
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "SELECT_BLOCK") {
        const id = e.data.id;
        const el = document.querySelector(`[data-block-id="${id}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          document.querySelectorAll(".editor-selected-block").forEach(b => b.classList.remove("editor-selected-block"));
          el.classList.add("editor-selected-block");
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [previewMode]);

  useReveal(`${blocks.length}-${poolsQuery.dataUpdatedAt}`);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center text-center p-10">
        <div className="w-12 h-12 border-t-2 border-brand-gold rounded-full animate-spin mb-4" />
        <p className="text-brand-text-light font-display text-xl tracking-widest animate-pulse">Carregando conteúdo...</p>
      </div>
    );
  }

  if (error || !data?.page) {
    return (
      <div className="min-h-screen bg-brand-black text-brand-text-light flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="size-20 border border-brand-gold/20 rounded-full flex items-center justify-center mb-2">
          <span className="text-brand-gold font-display text-4xl">!</span>
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl md:text-4xl text-brand-gold">Página não encontrada</h1>
          <p className="text-brand-text-soft text-base max-w-md mx-auto">
            A página <code className="bg-brand-graphite px-2 py-0.5 rounded text-brand-gold">/{slug}</code> não existe ou o link pode estar incorreto.
          </p>
        </div>
        <Link 
          to="/#" 
          className="inline-flex items-center gap-2 bg-brand-gold text-brand-green px-8 py-4 text-xs font-body font-semibold uppercase tracking-[0.2em] hover:bg-brand-gold-soft transition-all duration-500"
        >
          Voltar para a Home
        </Link>
      </div>
    );
  }


   return (
     <div className={cn("bg-brand-black text-brand-text-light min-h-screen", previewMode && "preview-mode")}>
       <SEO 
         title={data.page.meta_title || data.page.title}
         description={data.page.meta_description || ""}
         slug={data.page.slug}
         status={data.page.status}
         previewMode={previewMode}
           image={pageImage}
           heroImage={heroImage}
           schemas={schemas}
        />
       <Header breadcrumbCurrent={data.page.title} />

      {previewMode && data.page.status !== "published" && (
        <div className="bg-brand-bordeaux/30 text-brand-text-light text-center text-xs uppercase tracking-[0.22em] py-2 border-b border-brand-bordeaux/40">
          Pré-visualização de rascunho — esta página ainda não está publicada
        </div>
      )}

       <PoolsProvider value={pools}>
         {blocks.map((b) => (
           <BlockRenderer key={b.id} id={b.id} type={b.type} data={b.data || {}} />
         ))}
          {!blocks.some((b) => b.type === "depoimentos") && (
            <BlockRenderer type="depoimentos" data={{}} />
          )}
          {!blocks.some((b) => b.type === "equipe_rt") && (
            <BlockRenderer type="equipe_rt" data={{}} />
          )}
       </PoolsProvider>

      <LocalizacaoSection />

      <Footer />
      <FloatingCTA />
    </div>
  );
}
