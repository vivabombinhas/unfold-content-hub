 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function firecrawlScrape(apiKey: string, url: string) {
  const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown", "html"], onlyMainContent: true }),
  });
  
  if (res.ok) {
    const data = await res.json();
    const root = data?.data ?? data;
    return { ok: true, markdown: root?.markdown || null, html: root?.html || null };
  }

  // Fallback direct fetch for esteticabatel.com.br
  if (url.includes("esteticabatel.com.br")) {
    try {
      const directRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" }
      });
      if (directRes.ok) {
        const html = await directRes.text();
        return { ok: true, markdown: null, html };
      }
    } catch (e: any) {
      console.error("Direct fetch failed", e);
    }
  }

  return { ok: false };
}

 async function logScraping(adminClient: any, data: {
   url?: string,
   task_type: string,
   source_origin?: string,
   content_snapshot?: string,
   extracted_data?: any,
   metadata?: any,
   status?: string,
   error_message?: string
 }) {
   try {
     await adminClient.from("scraping_logs").insert([{
       ...data,
       content_snapshot: data.content_snapshot?.slice(0, 50000), // Limit snapshot size
     }]);
   } catch (e) {
     console.error("Error saving log to database:", e);
   }
 }

 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders })
   }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check (Admin only)
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roleRows?.length) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

     const { url, text: rawText } = await req.json();
     let content = "";
    let source_origin = "manual_paste";
    let usage_policy = "preserve_literal";

    if (url && !rawText) {
      const isBatel = url.includes("esteticabatel.com.br");
      source_origin = isBatel ? "batel_legacy" : "external_reference";
      usage_policy = isBatel ? "preserve_literal" : "inspiration_only";

      const scrape = await firecrawlScrape(FIRECRAWL_API_KEY || "", url);
      if (scrape.ok) {
        content = (scrape.markdown || scrape.html || "").trim();
      } else {
        throw new Error("Falha ao acessar a URL.");
      }
    } else if (rawText) {
      source_origin = "manual_paste";
      usage_policy = "preserve_literal";
      // 2. Preservar quebras de linha e tentar separar palavras coladas (ex: "CaídoBigode")
      content = rawText
        .replace(/([a-zà-ÿ])([A-ZÀ-Ÿ])/g, '$1 / $2') // Separa CaídoBigode em Caído / Bigode
        .trim();
    }

    if (!content.trim()) {
      return new Response(JSON.stringify({ error: "Conteúdo vazio ou inacessível." }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é o "Scanner de Seções" do Batel Page Studio. Sua função é analisar o conteúdo bruto de uma página e organizá-lo em seções lógicas seguindo o schema v2.

DIRETRIZES:
1. NÃO RESUMA: Preserve o conteúdo literal o máximo possível no campo "raw_content".
2. ANTI-RUÍDO: Ignore menus, rodapés, banners de cookies, botões de WhatsApp flutuantes e links repetidos de navegação.
3. ORIGEM E POLÍTICA: A origem detectada é "${source_origin}" e a política padrão é "${usage_policy}". Aplique isso em cada seção.
4. TIPOS DE BLOCOS:
   - beneficios_grid: Listas de vantagens, cards com título e texto.
   - procedimento_detalhado_v2: Explicações de como funciona, parágrafos longos, etapas (steps), side_cards (informações técnicas).
   - faq: Perguntas e respostas literais.
   - depoimentos: Nome do paciente e texto do depoimento.
   - hero: Título principal e subtítulo da página.
   - texto_imagem: Seções gerais de apresentação.

SCHEMA DE SAÍDA:
{
  "page_metadata": {
    "detected_title": "string",
    "source_url": "${url || ""}",
    "source_origin": "${source_origin}",
    "default_usage_policy": "${usage_policy}"
  },
  "noise_removed": ["string"],
  "sections": [
    {
      "id": "string",
      "raw_title": "string",
      "raw_content": "string",
      "suggested_type": "string",
      "confidence": number,
      "usage_policy": "${usage_policy}",
      "source_origin": "${source_origin}",
      "images": [
        { "url": "string", "alt": "string", "position": "above|below|inside|near_section", "candidate_use": "hero|section|gallery|before_after|unknown" }
      ],
      "extracted_data": { 
         // Para faq: { "qa": [{ "question": "...", "answer": "..." }] }
         // Para depoimentos: { "testimonials": [{ "name": "...", "text": "...", "source_label": "..." }] }
         // Para beneficios_grid: { "items": [{ "title": "...", "text": "..." }] }
         // Para procedimento_detalhado_v2: { "paragraphs": ["..."], "steps": [{ "title": "...", "description": "..." }], "side_cards": [{ "title": "...", "text": "..." }] }
      },
      "raw_html_snippet": "string (opcional, máx 1000 chars)"
    }
  ]
}`
          },
          {
            role: "user",
            content: `Conteúdo bruto:\n\n${content.slice(0, 30000)}`
          }
        ],
        response_format: { type: "json_object" }
      })
    });

      let aiData;
      let result: any = {};

      try {
        aiData = await aiRes.json();
        const rawContent = aiData?.choices?.[0]?.message?.content || "{}";
        result = JSON.parse(rawContent);
      } catch (e) {
        console.error("AI parse error", e);
      }

      // Log result to telemetry
      await logScraping(admin, {
        url: url || "manual_paste",
        task_type: "scan",
        source_origin,
        content_snapshot: content,
        extracted_data: result,
        metadata: {
          ai_model: "google/gemini-2.5-flash",
          content_length: content.length,
          sections_found: result.sections?.length || 0
        },
        status: (result.sections?.length > 0) ? "success" : "partial"
      });

     // 1. Fallback obrigatório para texto colado
     if ((!result.sections || result.sections.length === 0) && rawText && rawText.length > 30) {
       result.page_metadata = result.page_metadata || {
         detected_title: "Conteúdo Importado",
         source_url: "",
         source_origin: "manual_paste",
         default_usage_policy: "preserve_literal"
       };
       result.sections = [{
         id: crypto.randomUUID(),
         raw_title: "Seção Importada Manualmente",
         raw_content: content,
         suggested_type: content.includes('\n') || content.includes('*') ? "beneficios_grid" : "texto_livre",
         confidence: 0.4,
         usage_policy: "preserve_literal",
         source_origin: "manual_paste",
         images: [],
         extracted_data: {}
       }];
     }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
   }
 });
