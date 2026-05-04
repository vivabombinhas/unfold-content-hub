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
    } catch (e: any) {
      console.error("Direct fetch failed", e);
    }
  }

  return { ok: false };
}

 export const handler = async (req: Request) => {
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

     const { url, text: userText } = await req.json();
     let content = userText || "";
     let stats = {
       url_accessed: false,
       text_received: !!userText,
       char_count: userText?.length || 0,
       source_type: url ? "url" : "text"
     };

    if (url) {
       const scrape = await firecrawlScrape(FIRECRAWL_API_KEY || "", url);
       stats.url_accessed = scrape.ok;
      if (scrape.ok) {
         content = (scrape.markdown || scrape.html || "").trim();
         stats.char_count = content.length;
      } else {
        throw new Error("Falha ao acessar a URL.");
      }
    }

     if (!content.trim()) {
       return new Response(JSON.stringify({ 
         sections: [], 
         error_details: {
           message: "Conteúdo vazio ou inacessível.",
           ...stats
         }
       }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
     }

     // Deterministic Fallback for Simple Text (Before AI)
     const fallbackSections = [];
     if (!url && userText) {
       const lines = userText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
       // If we have pairs of lines (Title + Text)
       if (lines.length >= 2 && lines.length % 2 === 0) {
         const cards = [];
         for (let i = 0; i < lines.length; i += 2) {
           if (lines[i].length < 100 && lines[i+1].length > 5) {
             cards.push({ title: lines[i], text: lines[i+1] });
           }
         }
         if (cards.length > 0) {
           fallbackSections.push({
             suggested_label: "Benefícios (Identificação Rápida)",
             target_type: "beneficios_grid",
             confidence: 0.8,
             data: {
               eyebrow: "Diferenciais",
               title_html: "Por que nos <em>escolher</em>",
               cards
             }
           });
         }
       }
     }

    // Extract blocks via AI
     let sections = [...fallbackSections];
     
     try {
       const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages: [
          {
            role: "system",
             content: `Você é uma editora especializada em estruturação de landing pages premium da Estética Batel.
 Seu objetivo é analisar o conteúdo bruto e mapeá-lo para os blocos premium disponíveis.
 
 TIPOS DE BLOCOS DISPONÍVEIS:
 1. beneficios_grid: Use para listas de vantagens, benefícios, diferenciais ou "por que fazer".
    - Requisito: Mínimo 2 itens.
    - Estrutura: { eyebrow: string, title_html: string, cards: Array<{ title: string, text: string }> }
 
 2. procedimento_detalhado_v2: Use para descrições de "como funciona", etapas do tratamento ou detalhes técnicos.
    - Requisito: Pelo menos um parágrafo descritivo.
    - Estrutura: { eyebrow: string, title_html: string, paragraphs: string[], side_cards: Array<{ title: string, text: string }> }
 
 DIRETRIZES DE MAPEAMENTO:
 - Se o usuário fornecer pares de "Título" e "Descrição", mapeie SEMPRE para beneficios_grid.
 - Se houver um bloco de texto explicativo com alguns itens de destaque (ex: tempo, dor, repouso), use procedimento_detalhado_v2.
 - NUNCA retorne vazio se houver texto legível. Se estiver em dúvida, sugira o mapeamento mais provável com o campo "confidence".
 - Títulos de cards (cards[].title) devem ser CURTOS (max 3 palavras).
 - title_html deve ser elegante, ex: "Resultados que <em>surpreendem</em>".`,
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
       if (toolCall) {
         const aiSections = JSON.parse(toolCall.function.arguments).sections;
         // Merge AI sections, avoiding duplicates if fallback already found something similar
         aiSections.forEach((s: any) => {
           s.confidence = s.confidence || 0.9;
           sections.push(s);
         });
       }
     } catch (aiError) {
       console.error("AI Extraction failed:", aiError);
     }

     return new Response(JSON.stringify({ 
       sections, 
       debug: stats 
     }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
 
    } catch (e: any) {
      console.error(e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
 };
 
 if (import.meta.main) {
   serve(handler);
 }
