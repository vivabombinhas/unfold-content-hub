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
    body: JSON.stringify({ url, formats: ["markdown", "html", "links"], onlyMainContent: true, waitFor: 1000 }),
  });
  if (res.ok) {
    const data = await res.json();
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

  const errorText = await res.text().catch(() => "");
  console.error("Firecrawl scrape failed", url, res.status, errorText.slice(0, 300));

  // Fallback: Tentativa de fetch direto se for do próprio domínio e Firecrawl falhou por créditos
  if (res.status === 402 && url.includes("esteticabatel.com.br")) {
    try {
      console.log("Tentando fallback de fetch direto para", url);
      const directRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" }
      });
      if (directRes.ok) {
        const html = await directRes.text();
        return { ok: true, status: 200, markdown: null, html, links: [], metadata: null, note: "Fallback direct fetch" };
      }
    } catch (e) {
      console.error("Fallback fetch failed", e);
    }
  }

  return { ok: false, status: res.status, error: errorText.slice(0, 300), markdown: null, html: null, links: [], metadata: null };
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
      if (scrape && scrape.markdown) {
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
        model: "google/gemini-2.0-flash-exp",
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
    const scrapeDiagnostics: Array<{
      url: string;
      ok: boolean;
      status: number;
      markdown_chars: number;
      html_chars: number;
      images_found: number;
      error?: string;
    }> = [];
    if (ownOldPage) {
      const ownCorpusParts: string[] = [];
      const candidateImages: { url: string; alt: string; source_url: string }[] = [];
      const ownRawMarkdown: string[] = [];
      const ownRawHtml: string[] = [];
      refScrapes.forEach((scrape, i) => {
        const sourceUrl = links[i];
        const before = candidateImages.length;
        if (!scrape) {
          scrapeDiagnostics.push({ url: sourceUrl, ok: false, status: 0, markdown_chars: 0, html_chars: 0, images_found: 0, error: "no response" });
          return;
        }
        const content = scrape.markdown || scrape.html;
        if (content) {
          const label = scrape.markdown ? "MARKDOWN" : "HTML";
          ownCorpusParts.push(`[Página antiga ${i + 1} — ${sourceUrl}]\n${label}:\n${truncate(content, 12000)}`);
          if (scrape.markdown) ownRawMarkdown.push(`# ${sourceUrl}\n\n${scrape.markdown}`);
        }
        if (scrape.html) {
          ownRawHtml.push(`<!-- ${sourceUrl} -->\n${scrape.html}`);
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
            if (/\/(logo|icon|favicon|sprite)/i.test(abs)) continue;
            if (candidateImages.length < 30 && !candidateImages.some((c) => c.url === abs)) {
              candidateImages.push({ url: abs, alt: m[2] || "", source_url: sourceUrl });
            }
          }
          // data-src / data-lazy-src / data-original
          const lazyRegex = /<img[^>]*?(?:data-src|data-lazy-src|data-original)=["']([^"']+)["'][^>]*?(?:alt=["']([^"']*)["'])?[^>]*>/gi;
          let lm;
          while ((lm = lazyRegex.exec(scrape.html)) !== null) {
            const url = lm[1];
            if (!url || url.startsWith("data:")) continue;
            let abs = url;
            try { abs = new URL(url, sourceUrl).toString(); } catch { /* ignore */ }
            if (/\.(svg|ico)(\?|$)/i.test(abs)) continue;
            if (/\/(logo|icon|favicon|sprite)/i.test(abs)) continue;
            if (candidateImages.length < 30 && !candidateImages.some((c) => c.url === abs)) {
              candidateImages.push({ url: abs, alt: lm[2] || "", source_url: sourceUrl });
            }
          }
          // background-image inline
          const bgRegex = /background-image\s*:\s*url\((['"]?)([^'")]+)\1\)/gi;
          let bm;
          while ((bm = bgRegex.exec(scrape.html)) !== null) {
            const url = bm[2];
            if (!url || url.startsWith("data:")) continue;
            let abs = url;
            try { abs = new URL(url, sourceUrl).toString(); } catch { /* ignore */ }
            if (/\.(svg|ico)(\?|$)/i.test(abs)) continue;
            if (/\/(logo|icon|favicon|sprite)/i.test(abs)) continue;
            if (candidateImages.length < 30 && !candidateImages.some((c) => c.url === abs)) {
              candidateImages.push({ url: abs, alt: "", source_url: sourceUrl });
            }
          }
        }
        scrapeDiagnostics.push({
          url: sourceUrl,
          ok: !!scrape.ok,
          status: scrape.status ?? (scrape.markdown ? 200 : 0),
          markdown_chars: scrape.markdown ? scrape.markdown.length : 0,
          html_chars: scrape.html ? scrape.html.length : 0,
          images_found: candidateImages.length - before,
          error: scrape.ok === false ? scrape.error : undefined,
        });
      });

      if (ownCorpusParts.length > 0) {
        const extractRes = await fetch(AI_GATEWAY, {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp",
            messages: [
              {
                role: "system",
                content:
                     "Você é uma editora especializada em extração estrutural de dados. Seu trabalho é ler o markdown de uma página antiga e extrair TODOS os depoimentos, TODAS as perguntas frequentes (FAQs) e as seções principais LITERALMENTE.\n\nREGRAS CRÍTICAS:\n1. NUNCA resuma. NUNCA pule itens. Se a página tem 20 FAQs, extraia as 20.\n2. FAQ: Identifique padrões como '1. Pergunta' seguida de texto, ou blocos em accordions. Copie Pergunta e Resposta exatamente sem alterar o sentido.\n3. DEPOIMENTOS: Procure por blocos de texto seguidos de nomes próprios (ex: 'Ana Maria Souza') e origens (ex: 'Via Whatsapp'). Extraia o texto real, sem edições.\n4. SEÇÕES: Procure especificamente pela seção 'Como é o Procedimento...' ou similar. Extraia o texto principal de forma LITERAL. Se houver bullets de diferenciais/benefícios, extraia-os estruturadamente com um 'title' (resumo curto de 1-3 palavras) e 'text' (o conteúdo literal). NUNCA use 'Destaque' como título se puder criar um melhor.\n5. FIDELIDADE TÉCNICA: Não mude termos técnicos. Se a página original diz '6 a 12 meses', mantenha '6 a 12 meses'. Não 'melhore' o texto. Se o texto for ruim, extraia ruim mesmo.\n6. Se não encontrar algo, retorne array vazio. NÃO invente conteúdo.",
              },
              {
                role: "user",
                content: `Tema da nova página: "${tema}"\n\nConteúdo bruto das páginas antigas (extraia LITERALMENTE):\n\n${ownCorpusParts.join("\n\n---\n\n").slice(0, 45000)}`,
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
                         description: "LISTA COMPLETA de FAQs. Se houver 30 na página, retorne as 30. Copie pergunta e resposta sem alterar uma vírgula.",
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
                         description: "Seções de conteúdo relevantes da página antiga.",
                         items: {
                           type: "object",
                           properties: {
                             title: { type: "string" },
                             body: { type: "string", description: "Texto completo da seção." },
                               bullets: {
                                 type: "array",
                                 description: "Lista de benefícios ou atributos (bullets) encontrados NESTA seção específica.",
                                 items: {
                                   type: "object",
                                   properties: {
                                     title: { type: "string", description: "Título curto (1-3 palavras) que resume o bullet. Se não houver título claro no original, crie um fiel ao conteúdo. NUNCA use 'Destaque'." },
                                     text: { type: "string", description: "O texto literal do bullet encontrado na página." }
                                   },
                                   required: ["title", "text"],
                                   additionalProperties: false
                                 }
                               },
                             type_suggestion: {
                               type: "string",
                               description: "Sugestão: 'procedimento_detalhado', 'beneficios', etc.",
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

      // Persiste markdown/html cru no objeto retornado para o gerador salvar
      if (oldPageContent && typeof oldPageContent === "object") {
        (oldPageContent as Record<string, unknown>).raw_markdown = ownRawMarkdown.join("\n\n---\n\n").slice(0, 80000);
        (oldPageContent as Record<string, unknown>).raw_html_size = ownRawHtml.reduce((a, b) => a + b.length, 0);
      }
    }

    return new Response(
      JSON.stringify({
        tema,
        research: args,
        sources: sources.slice(0, 10),
        old_page_content: oldPageContent,
        scrape_diagnostics: scrapeDiagnostics,
      }),
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