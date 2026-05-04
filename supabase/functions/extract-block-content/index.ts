import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    } catch (e) {
      console.error("Direct fetch failed", e);
    }
  }

  return { ok: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const { url, text } = await req.json();
    let content = text || "";

    if (url) {
      const scrape = await firecrawlScrape(FIRECRAWL_API_KEY!, url);
      if (scrape.ok) {
        content = scrape.markdown || scrape.html || "";
      } else {
        throw new Error("Falha ao acessar a URL.");
      }
    }

    if (!content.trim()) throw new Error("Conteúdo vazio.");

    // Extract blocks via AI
    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages: [
          {
            role: "system",
            content: `Você é uma editora especializada em estruturação de landing pages premium.
Seu objetivo é ler o conteúdo bruto fornecido e identificar seções que se encaixam nos seguintes blocos:

1. beneficios_grid: Uma lista de benefícios, diferenciais ou motivos para escolher o tratamento.
   Estrutura: { eyebrow: string, title_html: string, cards: Array<{ title: string, text: string }> }

2. procedimento_detalhado_v2: Uma explicação detalhada de como funciona o procedimento, com parágrafos e cards de destaque (como duração, anestesia, recuperação).
   Estrutura: { eyebrow: string, title_html: string, paragraphs: string[], side_cards: Array<{ title: string, text: string }> }

REGRAS:
- Extraia o conteúdo LITERALMENTE. Não resuma.
- Para title_html, use <em> para destacar palavras-chave importantes com tom dourado.
- Gere títulos curtos e significativos para os cards (evite usar sempre "Destaque").
- Se encontrar ambas as seções, retorne ambas.`,
          },
          {
            role: "user",
            content: `Conteúdo para extração:\n\n${content.slice(0, 30000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "registrar_blocos",
              description: "Registra os blocos identificados no conteúdo.",
              parameters: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        suggested_label: { type: "string" },
                        target_type: { type: "string", enum: ["beneficios_grid", "procedimento_detalhado_v2"] },
                        data: { type: "object" }
                      },
                      required: ["suggested_label", "target_type", "data"]
                    }
                  }
                },
                required: ["sections"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "registrar_blocos" } }
      })
    });

    const aiData = await aiRes.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    const sections = toolCall ? JSON.parse(toolCall.function.arguments).sections : [];

    return new Response(JSON.stringify({ sections }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
