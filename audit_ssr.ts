import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://esm.sh/node-html-parser@6.1.13";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const PREVIEW_URL = "https://id-preview--9deebc0c-a5bb-4019-bd59-256e19a773cc.lovable.app"; // Using preview URL for audit
const RENDER_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/render-page`;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function auditSlug(slug: string) {
  console.log(`\nAuditing slug: ${slug}`);
  
  // 1. Fetch DB Data
  const { data: page, error: pageError } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .single();
    
  if (pageError) {
    console.error(`Error fetching DB data for ${slug}:`, pageError);
    return;
  }

  const { data: blocks } = await supabase
    .from("page_blocks")
    .select("*")
    .eq("page_id", page.id)
    .eq("enabled", true)
    .order("position");

  const { data: docs } = await supabase
    .from("procedure_documents")
    .select("*")
    .eq("page_id", page.id)
    .eq("status", "published");

  // 2. Fetch SSR HTML
  const ssrResponse = await fetch(`${RENDER_FUNCTION_URL}?slug=${slug}`, {
    headers: { "apikey": SUPABASE_ANON_KEY }
  });
  const ssrHtml = await ssrResponse.text();
  const ssrRoot = parse(ssrHtml);

  // 3. (Simulated) CSR Content - since we can't run a full browser here easily with just Deno,
  // we will analyze the SSR vs DB first, which is the most critical parity point.
  // PARITY CHECK:
  
  const report = {
    slug,
    title: {
      db: page.meta_title || page.title,
      ssr: ssrRoot.querySelector("title")?.text.split(" · ")[0]
    },
    description: {
      db: page.meta_description,
      ssr: ssrRoot.querySelector('meta[name="description"]')?.getAttribute("content")
    },
    h1: {
      db: blocks?.find(b => b.type === 'hero')?.data?.title || page.title,
      ssr: ssrRoot.querySelector("h1")?.text
    },
    canonical: {
      db: `https://esteticabatel.com.br/${page.url_path || slug}/`,
      ssr: ssrRoot.querySelector('link[rel="canonical"]')?.getAttribute("href")
    },
    status: {
      db: page.status,
      index: ssrRoot.querySelector('meta[name="robots"]')?.getAttribute("content")?.includes("index")
    },
    documents: {
      db: docs?.length || 0,
      ssr: ssrHtml.includes("TCLE") ? "Present" : "Missing"
    }
  };

  console.log("Audit Report for " + slug + ":");
  console.table(report);
  
  const deviations = [];
  if (report.title.db !== report.title.ssr) deviations.push(`Title mismatch: DB[${report.title.db}] vs SSR[${report.title.ssr}]`);
  if (report.h1.db !== report.h1.ssr) deviations.push(`H1 mismatch: DB[${report.h1.db}] vs SSR[${report.h1.ssr}]`);
  
  if (deviations.length > 0) {
    console.warn("Divergencies found:", deviations);
  } else {
    console.log("Parity OK for core metadata.");
  }
}

const slugsToAudit = ["modelo"]; // Starting with the known published one
for (const slug of slugsToAudit) {
  await auditSlug(slug);
}
