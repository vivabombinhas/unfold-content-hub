// Edge function: research-topic
// Receives { tema, links_referencia? } and returns structured research:
// { duvidas, objecoes, termos, angulos, sources }
// Strategy:
//  1. (Optional) Scrape user-provided reference links via Firecrawl
//  2. Web-search top questions/articles about the theme via Firecrawl
//  3. Pass everything to Lovable AI which returns structured JSON via tool calling

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ResearchInput {
  tema: string;
  links_referencia?: string[];
  own_old_page?: boolean;
}

interface FirecrawlSearchResultItem {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
}

async function firecrawlSearch(apiKey: string, query: string) {
  const res = await fetch(`${FIRECRAWL_V2}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit: 6,
      lang: "pt",
      country: "br",
      scrapeOptions: { formats: ["markdown"] },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("Firecrawl search error", res.status, t);
    return [];
  }
  const data = await res.json();
  // v2 may return { data: [...] } or { web: { results: [...] } }
  const items: FirecrawlSearchResultItem[] =
    (Array.isArray(data?.data) && data.data) ||
    data?.web?.results ||
    [];
  return items.slice(0, 6);
}

async function firecrawlScrape(apiKey: string, url: string) {
  const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown", "html", "links"], onlyMainContent: false, waitFor: 2500 }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("Firecrawl scrape failed", url, res.status, t.slice(0, 300));
    return { ok: false, status: res.status, error: t.slice(0, 300), markdown: null, html: null, links: [], metadata: null };
  }
  const data = await res.json();
  // Normalize SDK/REST shapes
  const root = data?.data ?? data;
  return {
    ok: true,
    status: 200,
    markdown: root?.markdown || null,
    html: root?.html || null,
    links: Array.isArray(root?.links) ? root.links : [],
    metadata: root?.metadata || null,
  };
}

function truncate(s: string | null | undefined, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth: only admins can trigger research (Firecrawl costs money)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin");
    if (!roleRows || roleRows.length === 0) {
      return new Response(JSON.stringify({ error: "Apenas administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ResearchInput;
    const tema = (body?.tema || "").trim();
    const links = (body?.links_referencia || []).filter((u) => /^https?:\/\//.test(u)).slice(0, 5);
    const ownOldPage = !!body?.own_old_page && links.length > 0;

    if (!tema || tema.length < 3 || tema.length > 200) {
      return new Response(JSON.stringify({ error: "Tema inválido (3-200 caracteres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parallel: search web + scrape user links
    const [duvidasResults, geralResults, ...refScrapes] = await Promise.all([
      firecrawlSearch(FIRECRAWL_API_KEY, `${tema} dúvidas frequentes pacientes`),
      firecrawlSearch(FIRECRAWL_API_KEY, `${tema} antes e depois resultado expectativa`),
      ...links.map((u) => firecrawlScrape(FIRECRAWL_API_KEY, u)),
    ]);

    const sources: { url: string; title: string }[] = [];
    const corpusParts: string[] = [];

    for (const item of [...duvidasResults, ...geralResults]) {
      if (item.url && item.title) sources.push({ url: item.url, title: item.title });
      const snippet = item.markdown || item.description || "";
      if (snippet) corpusParts.push(`[${item.title || item.url}]\n${truncate(snippet, 1500)}`);
    }
    refScrapes.forEach((scrape, i) => {
      if (scrape?.markdown) {
        sources.push({ url: links[i], title: `Referência fornecida: ${links[i]}` });
        corpusParts.push(`[Referência do usuário ${i + 1}]\n${truncate(scrape.markdown, 3000)}`);
      }
    });

    const corpus = corpusParts.join("\n\n---\n\n").slice(0, 25000);

    // Ask Lovable AI to extract structured research
    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Você é uma pesquisadora editorial para uma clínica estética em Curitiba (Estética Batel). Seu trabalho é destilar pesquisa web crua em insights acionáveis para construção de uma landing page de venda. Português do Brasil. Tom: autoridade discreta, direto, sem promessas vazias.",
          },
          {
            role: "user",
            content: `Tema da página: "${tema}"\n\nMaterial pesquisado:\n${corpus || "(nenhum material — use seu conhecimento)"}\n\nExtraia os insights estruturados.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "registrar_pesquisa",
              description: "Registra os insights extraídos da pesquisa.",
              parameters: {
                type: "object",
                properties: {
                  duvidas: {
                    type: "array",
                    description: "8-12 dúvidas reais que pacientes pesquisam sobre esse tema.",
                    items: { type: "string" },
                  },
                  objecoes: {
                    type: "array",
                    description: "5-8 objeções/medos comuns que precisam ser desarmados no copy.",
                    items: { type: "string" },
                  },
                  termos: {
                    type: "array",
                    description: "10-15 termos técnicos e leigos relevantes (anatomia, produtos, técnica).",
                    items: { type: "string" },
                  },
                  angulos: {
                    type: "array",
                    description: "3-5 ângulos editoriais distintos para abordar o tema.",
                    items: { type: "string" },
                  },
                  publico_alvo: {
                    type: "string",
                    description: "Perfil do paciente típico desse procedimento (1-2 frases).",
                  },
                  area_anatomica: {
                    type: "string",
                    description: "Área anatômica principal (ex: 'labios', 'terco_superior', 'mandibula', 'pescoco', 'corpo'). Use snake_case.",
                  },
                },
                required: ["duvidas", "objecoes", "termos", "angulos", "publico_alvo", "area_anatomica"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "registrar_pesquisa" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições da IA atingido. Tente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione fundos em Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar pesquisa." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    if (!args) {
      return new Response(JSON.stringify({ error: "IA não retornou estrutura esperada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fase 1.2: se as URLs são páginas antigas próprias, tenta extrair conteúdo
    // estruturado real (depoimentos, FAQs, seções, imagens candidatas).
    let oldPageContent: unknown = null;
    if (ownOldPage) {
      const ownCorpusParts: string[] = [];
      const candidateImages: { url: string; alt: string; source_url: string }[] = [];
      refScrapes.forEach((scrape, i) => {
        if (!scrape) return;
        const sourceUrl = links[i];
        if (scrape.markdown) {
          ownCorpusParts.push(`[Página antiga ${i + 1} — ${sourceUrl}]\nMARKDOWN:\n${truncate(scrape.markdown, 8000)}`);
        }
        if (scrape.html) {
          // Extrai <img src> e alt diretamente do HTML como candidatas
          const imgRegex = /<img[^>]*?src=["']([^"']+)["'][^>]*?(?:alt=["']([^"']*)["'])?[^>]*>/gi;
          let m;
          while ((m = imgRegex.exec(scrape.html)) !== null) {
            const url = m[1];
            if (!url || url.startsWith("data:")) continue;
            // Resolve URL relativa
            let abs = url;
            try { abs = new URL(url, sourceUrl).toString(); } catch { /* ignore */ }
            // Pula ícones/SVGs decorativos óbvios
            if (/\.(svg|ico)(\?|$)/i.test(abs)) continue;
            if (candidateImages.length < 30 && !candidateImages.some((c) => c.url === abs)) {
              candidateImages.push({ url: abs, alt: m[2] || "", source_url: sourceUrl });
            }
          }
        }
      });

      if (ownCorpusParts.length > 0) {
        const extractRes = await fetch(AI_GATEWAY, {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content:
                  "Você é uma editora extraindo conteúdo real de uma página antiga da clínica Estética Batel para reaproveitar em uma página nova. Português do Brasil. NUNCA invente: só registre o que está literalmente nas páginas fornecidas. Se um campo não tem conteúdo, devolva array vazio. Mantenha o sentido original; pode ajustar pontuação e formatação leve.",
              },
              {
                role: "user",
                content: `Tema da nova página: "${tema}"\n\nConteúdo bruto das páginas antigas:\n\n${ownCorpusParts.join("\n\n---\n\n").slice(0, 25000)}`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "registrar_conteudo_antigo",
                  description: "Registra conteúdo real extraído da(s) página(s) antiga(s).",
                  parameters: {
                    type: "object",
                    properties: {
                      testimonials: {
                        type: "array",
                        description: "Depoimentos encontrados literalmente. NÃO inventar. Pode ficar vazio.",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string", description: "Nome de quem deu o depoimento; vazio se não houver." },
                            text: { type: "string", description: "Texto do depoimento, mantendo sentido original." },
                            source: { type: "string", description: "Sempre 'old_page'." },
                          },
                          required: ["name", "text", "source"],
                          additionalProperties: false,
                        },
                      },
                      faqs: {
                        type: "array",
                        description: "Perguntas frequentes encontradas. Importe TODAS as que aparecem na página, mesmo que sejam 20+. NÃO inventar.",
                        items: {
                          type: "object",
                          properties: {
                            question: { type: "string" },
                            answer: { type: "string" },
                          },
                          required: ["question", "answer"],
                          additionalProperties: false,
                        },
                      },
                      sections: {
                        type: "array",
                        description: "Seções de conteúdo relevantes da página antiga (texto explicativo, descrição do procedimento, benefícios). Identifique se vale aproveitar como bloco extra.",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            body: { type: "string", description: "Texto completo da seção (pode ter parágrafos separados por \\n\\n)." },
                            type_suggestion: {
                              type: "string",
                              description: "Sugestão de uso: 'procedimento_detalhado' (descreve como funciona o procedimento), 'manifesto', 'metodo', 'beneficios', 'preparo', 'pos_procedimento', 'unknown'.",
                            },
                          },
                          required: ["title", "body", "type_suggestion"],
                          additionalProperties: false,
                        },
                      },
                      ctas: {
                        type: "array",
                        description: "CTAs encontrados (texto do botão).",
                        items: { type: "string" },
                      },
                    },
                    required: ["testimonials", "faqs", "sections", "ctas"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "registrar_conteudo_antigo" } },
          }),
        });

        if (extractRes.ok) {
          const extractData = await extractRes.json();
          const tc = extractData?.choices?.[0]?.message?.tool_calls?.[0];
          if (tc) {
            try {
              const parsed = JSON.parse(tc.function.arguments);
              oldPageContent = { ...parsed, images: candidateImages };
            } catch (e) {
              console.error("old_page_content parse error", e);
            }
          }
        } else {
          console.error("old_page extract failed", extractRes.status, await extractRes.text());
        }
      }

      // Mesmo se extração da IA falhar, salva imagens encontradas
      if (!oldPageContent && candidateImages.length > 0) {
        oldPageContent = { testimonials: [], faqs: [], sections: [], ctas: [], images: candidateImages };
      }
    }

    return new Response(
      JSON.stringify({ tema, research: args, sources: sources.slice(0, 10), old_page_content: oldPageContent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("research-topic error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});