import { useEffect, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingCTA } from "@/components/site/FloatingCTA";
import { BlockRenderer } from "@/components/site/BlockRenderer";
import { LocalizacaoSection } from "@/components/site/LocalizacaoSection";
import { useReveal } from "@/hooks/use-reveal";
import { PoolsProvider, usePoolsQuery } from "@/hooks/use-pools";
import type { BlockType } from "@/types/blocks";

/**
 * PublicPage — renderiza qualquer página criada no admin.
 *
 * URLs:
 *  /p/:slug                → página publicada (status=published)
 *  /p/:slug?preview=1      → mostra rascunho (precisa estar logado como admin
 *                             pra RLS deixar passar)
 */

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
}

export default function PublicPage() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const previewMode = params.get("preview") === "1";

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-page", slug, previewMode],
    queryFn: async () => {
      // 1. Page row (RLS lets anyone read published; admins also read drafts)
      const pageQuery = supabase.from("pages").select("*").eq("slug", slug).maybeSingle();
      const { data: page, error: pe } = await pageQuery;
      if (pe) throw pe;
      if (!page) return null;
      const p = page as unknown as PageRow;
      if (!previewMode && p.status !== "published") return null;

      // 2. Blocks (live for preview; snapshot for production)
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

  // SEO: set <title> and meta description as soon as we have the page.
  useEffect(() => {
    if (!data?.page) return;
    const t = data.page.meta_title || data.page.title;
    if (t) document.title = t;
    if (data.page.meta_description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
      }
      m.setAttribute("content", data.page.meta_description);
    }
  }, [data?.page]);

  const blocks = useMemo(
    () => (data?.blocks ?? []).slice().sort((a, b) => a.position - b.position),
    [data?.blocks],
  );

  // Run reveal observer AFTER blocks AND pools are in the DOM.
  useReveal(`${blocks.length}-${poolsQuery.dataUpdatedAt}`);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-black text-brand-text-muted grid place-items-center">
        Carregando…
      </div>
    );
  }

  if (error || !data?.page) {
    return (
      <div className="min-h-screen bg-brand-black text-brand-text-light flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-3xl">Página não encontrada</h1>
        <p className="text-brand-text-muted text-sm max-w-md">
          A página <code className="text-brand-gold">/{slug}</code> não existe ou ainda não foi publicada.
        </p>
        <Link to="/" className="text-brand-gold text-sm border-b border-brand-gold/40 pb-1 hover:border-brand-gold">
          Voltar para a home
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-brand-black text-brand-text-light min-h-screen">
      <Header breadcrumbCurrent={data.page.title} />

      {previewMode && data.page.status !== "published" && (
        <div className="bg-brand-bordeaux/30 text-brand-text-light text-center text-xs uppercase tracking-[0.22em] py-2 border-b border-brand-bordeaux/40">
          Pré-visualização de rascunho — esta página ainda não está publicada
        </div>
      )}

       <PoolsProvider value={pools}>
         {blocks.map((b) => (
           <BlockRenderer key={b.id} type={b.type} data={b.data || {}} />
         ))}
         {!blocks.some((b) => b.type === "equipe_rt") && (
           <BlockRenderer type="equipe_rt" data={{}} />
         )}
       </PoolsProvider>

      {/* Seção fixa de localização — global, não é um block_type. */}
      <LocalizacaoSection />

      <Footer />
      <FloatingCTA />
    </div>
  );
}