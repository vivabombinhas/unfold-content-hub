import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://esm.sh/node-html-parser@6.1.13";

const SUPABASE_URL = "https://ldsixdxmdzngagbminwh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxkc2l4ZHhtZHpuZ2FnYm1pbndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyOTUyNTgsImV4cCI6MjA5Mjg3MTI1OH0.L_L9QAPkc61Yqgpn5yshXQlEZmH5W8KEaFa3p-aYQtU";
const RENDER_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/render-page`;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function auditSlug(slug: string) {
  // 1. Fetch DB Data
  const { data: page } = await supabase.from("pages").select("*").eq("slug", slug).single();
  if (!page) return { slug, error: "Not found in DB" };

  const { data: blocks } = await supabase.from("page_blocks").select("*").eq("page_id", page.id).eq("enabled", true).order("position");
  const { data: docs } = await supabase.from("procedure_documents").select("*").eq("page_id", page.id).eq("status", "published");

  // 2. Fetch SSR HTML
  const ssrResponse = await fetch(`${RENDER_FUNCTION_URL}?slug=${slug}`, {
    headers: { "apikey": SUPABASE_ANON_KEY }
  });
  const ssrHtml = await ssrResponse.text();
  const ssrRoot = parse(ssrHtml);

  // Extract fields
  const ssrTitle = ssrRoot.querySelector("title")?.text;
  const ssrDesc = ssrRoot.querySelector('meta[name="description"]')?.getAttribute("content");
  const ssrH1 = ssrRoot.querySelector("h1")?.text;
  const ssrCanonical = ssrRoot.querySelector('link[rel="canonical"]')?.getAttribute("href");
  const ssrRobots = ssrRoot.querySelector('meta[name="robots"]')?.getAttribute("content");
  const ssrSchema = ssrRoot.querySelector('script[type="application/ld+json"]')?.text;
  
  // RT Check
  const hasRT = ssrHtml.includes("Dra. Daniele Florêncio") && ssrHtml.includes("CRBM 8242-PR");
  const hasLocalizacao = ssrHtml.includes("No coração do Batel") && ssrHtml.includes("Rua Brigadeiro Franco");
  
  // Documents check
  const tclePresent = ssrHtml.includes("TCLE") || ssrHtml.includes("Consentimento");
  const techPresent = ssrHtml.includes("Diferenciais Técnicos");

  const report = {
    slug,
    title: { db: page.meta_title || page.title, ssr: ssrTitle?.split(" · ")[0] },
    description: { db: page.meta_description, ssr: ssrDesc },
    h1: { db: blocks?.find(b => b.type === 'hero')?.data?.title || page.title, ssr: ssrH1 },
    canonical: { db: `https://esteticabatel.com.br/${page.url_path || slug}/`, ssr: ssrCanonical },
    index: { db: page.status === 'published', ssr: ssrRobots?.includes("index") },
    eeat: { rt: hasRT, localization: hasLocalizacao },
    docs: { 
      db: docs?.length || 0, 
      tcle: tclePresent, 
      tech: techPresent 
    }
  };

  return report;
}

const { data: pages } = await supabase.from("pages").select("slug").eq("status", "published");
const results = [];

if (pages) {
  for (const p of pages) {
    results.push(await auditSlug(p.slug));
  }
}

console.log(JSON.stringify(results, null, 2));
