// Edge function: generate-page-from-topic
// Receives { tema, slug, research, sources?, links_referencia?, ai_notes? }
//
// Fase 1:
// - Botox-masculino é REFERÊNCIA EDITORIAL apenas (tom, cadência, estrutura
//   de campos por bloco). NUNCA clonamos o `data` do Botox para a página
//   nova — isso causava contaminação ("toxina botulínica" na página de
//   harmonização, números de Botox na faixa de autoridade etc.).
// - A IA gera todo o conteúdo textual de TODOS os blocos contextualizado
//   ao tema, incluindo cursos (que continua ativo por padrão).
// - Blocos coletivos (casos, depoimentos, ai_opinions, equipe_rt, cursos)
//   recebem só os headers + um `data` neutro; os cards continuam vindo
//   dos pools globais via BlockRenderer.
// - Metadata estruturado (tema, categoria, area_anatomica, ai_notes,
//   links_referencia, sources) é salvo em pages.metadata para futura
//   curadoria.

 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TEMPLATE_SLUG = "botox-masculino";

const BLOCK_ORDER = [
  "hero",
  "authority_strip",
  "manifesto_curto",
  "metodo",
  "procedimento_detalhado",
  "beneficios_grid",
  "casos",
  "preco_ancora",
  "depoimentos",
  "ai_opinions",
  "equipe_rt",
  "cursos",
  "faq",
  "cta_final",
] as const;

// Schema for the AI tool call — describes every block's data shape.
const generatePageSchema = {
  type: "object",
  properties: {
    page: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título da página (ex: 'Preenchimento Labial em Curitiba')." },
        meta_title: { type: "string", description: "Title SEO (60 chars)." },
        meta_description: { type: "string", description: "Meta description SEO (150-160 chars)." },
        categoria: { type: "string", description: "Categoria editorial: ex 'injetáveis', 'bioestimuladores', 'tecnologias', 'cuidados faciais', 'corpo'." },
      },
      required: ["title", "meta_title", "meta_description", "categoria"],
      additionalProperties: false,
    },
    blocks: {
      type: "object",
      properties: {
        hero: {
          type: "object",
          properties: {
            eyebrow: { type: "string" },
            title: { type: "string", description: "Headline forte, sem promessa garantida." },
            subtitle: { type: "string" },
            cta_label: { type: "string" },
            cta_href: { type: "string", description: "Sempre '#contato'." },
            footnote: { type: "string", description: "Frase curta de credibilidade (opcional)." },
          },
          required: ["eyebrow", "title", "subtitle", "cta_label", "cta_href"],
          additionalProperties: false,
        },
        manifesto_curto: {
          type: "object",
          properties: {
            eyebrow: { type: "string" },
            title: { type: "string", description: "Frase de impacto curta (até 15 palavras) que resume o manifesto. Serve como o texto visível na página principal." },
            body: { type: "string", description: "Texto longo, profundo e impactante (mínimo 1500 caracteres), dividido em 4-6 parágrafos substanciais. Deve ser um manifesto real sobre a filosofia do procedimento, técnica e visão da Estética Batel, com alta qualidade literária, autoridade e sofisticação." },
          },
          required: ["title", "body"],
          additionalProperties: false,
        },
        procedimento_detalhado: {
          type: "object",
          properties: {
            eyebrow: { type: "string" },
            title_html: { type: "string" },
            paragraphs: { 
              type: "array", 
              items: { type: "string" },
              minItems: 3,
              description: "3-5 parágrafos detalhados sobre o procedimento."
            },
            bullets: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  text: { type: "string" }
                },
                required: ["title", "text"]
              },
              minItems: 4,
              maxItems: 8
            }
          },
          required: ["eyebrow", "title_html", "paragraphs", "bullets"],
          additionalProperties: false,
        },
        beneficios_grid: {
          type: "object",
          properties: {
            eyebrow: { type: "string" },
            title_html: { type: "string" },
            subtitle: { type: "string" },
            cards: {
              type: "array",
              minItems: 3,
              maxItems: 4,
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  text: { type: "string" }
                },
                required: ["title", "text"],
                additionalProperties: false
              }
            }
          },
          required: ["eyebrow", "title_html", "cards"],
          additionalProperties: false
        },
        metodo: {
          type: "object",
          properties: {
            eyebrow: { type: "string" },
            title: { type: "string" },
            steps: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: {
                type: "object",
                properties: {
                  n: { type: "number" },
                  title: { type: "string" },
                  summary: { type: "string", description: "Frase curta (1 linha) que aparece sob o título do passo." },
                  detail: { type: "string", description: "Conteúdo do accordion 'Como funciona na prática' — 2 a 3 frases concretas, contextualizadas ao procedimento desta página. NUNCA mencionar Botox a menos que o tema seja Botox." },
                },
                required: ["n", "title", "summary", "detail"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "steps"],
          additionalProperties: false,
        },
        preco_ancora: {
          type: "object",
          properties: {
            eyebrow: { type: "string" },
            title: { type: "string" },
            price_label: { type: "string", description: "Ex: 'a partir de R$ X.XXX' — sem promessa." },
            note: { type: "string" },
          },
          required: ["title", "price_label", "note"],
          additionalProperties: false,
        },
        cta_final: {
          type: "object",
          properties: {
            title: { type: "string" },
            subtitle: { type: "string" },
            cta_label: { type: "string" },
            cta_href: { type: "string", description: "Mantenha 'https://wa.me/5541999999999'." },
          },
          required: ["title", "subtitle", "cta_label", "cta_href"],
          additionalProperties: false,
        },
        faq_items: {
          type: "array",
          minItems: 6,
          maxItems: 8,
          description: "FAQs específicas do tema, derivadas das dúvidas pesquisadas.",
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
        // Headers para os blocos "coletivos" (conteúdo vem do pool global, mas o
        // título/eyebrow do bloco precisa falar do tema atual, não de Botox).
        collective_headers: {
          type: "object",
          description: "Eyebrow + título contextualizados ao tema da página. NUNCA mencionar Botox aqui (a menos que o tema seja Botox).",
          properties: {
            authority_strip: { type: "object", properties: { eyebrow: { type: "string" }, title_html: { type: "string" } }, required: ["eyebrow", "title_html"], additionalProperties: false },
            casos:           { type: "object", properties: { eyebrow: { type: "string" }, title_html: { type: "string" } }, required: ["eyebrow", "title_html"], additionalProperties: false },
            depoimentos:     { type: "object", properties: { eyebrow: { type: "string" }, title_html: { type: "string" } }, required: ["eyebrow", "title_html"], additionalProperties: false },
            ai_opinions:     { type: "object", properties: { eyebrow: { type: "string" }, title_html: { type: "string" }, subtitle: { type: "string" } }, required: ["eyebrow", "title_html", "subtitle"], additionalProperties: false },
            equipe_rt: {
              type: "object",
              description: "Bloco da Responsável Técnica. PRESERVAR estrutura: eyebrow institucional, título com nome da RT, bio + 2 accordions + CTA. Adaptar SOMENTE a copy ao tema desta página.",
              properties: {
                eyebrow: { type: "string", description: "Sempre 'Responsável técnica' (ou similar)." },
                title_html: { type: "string", description: "Sempre o nome da RT, ex: 'Dra. Daniele <em>Florencio</em>'. NÃO inventar nomes alternativos como 'Direção Técnica'." },
                bio: { type: "string", description: "Bio curta (2-3 frases) da Dra. Daniele Florencio adaptada ao tema desta página. Deve mencionar a experiência dela aplicada AO PROCEDIMENTO desta página." },
                accordions: {
                  type: "array",
                  minItems: 2,
                  maxItems: 2,
                  description: "Sempre 2 accordions. (1) 'Como a Dra. Daniele pensa o [tema]' adaptado ao procedimento. (2) 'Especializações e formação' — institucional, pode reutilizar base.",
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
                cta_label: { type: "string", description: "Sempre 'Conhecer a equipe completa'." },
              },
              required: ["eyebrow", "title_html", "bio", "accordions", "cta_label"],
              additionalProperties: false,
            },
            cursos:          { type: "object", properties: { eyebrow: { type: "string" }, title_html: { type: "string" }, intro: { type: "string" }, footnote: { type: "string" } }, required: ["eyebrow", "title_html", "intro"], additionalProperties: false },
          },
          required: ["authority_strip", "casos", "depoimentos", "ai_opinions", "equipe_rt", "cursos"],
          additionalProperties: false,
        },
      },
      required: ["hero", "manifesto_curto", "metodo", "procedimento_detalhado", "beneficios_grid", "preco_ancora", "cta_final", "faq_items", "collective_headers"],
      additionalProperties: false,
    },
  },
  required: ["page", "blocks"],
  additionalProperties: false,
};

 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders })
   }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth: validate caller is an admin
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

    // Parse input
    const body = await req.json();
    const tema = String(body?.tema || "").trim();
    const slug = String(body?.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    const research = body?.research || null;
    const linksReferencia: string[] = Array.isArray(body?.links_referencia)
      ? body.links_referencia.filter((u: unknown) => typeof u === "string")
      : [];
    const sourcesIn: { url: string; title?: string }[] = Array.isArray(body?.sources)
      ? body.sources.filter((s: unknown) => s && typeof (s as { url?: unknown }).url === "string")
      : [];
    const aiNotes = String(body?.ai_notes || "").trim();
    const ownOldPage = !!body?.own_old_page;
    const oldPageContent = (body?.old_page_content && typeof body.old_page_content === "object")
      ? body.old_page_content as {
          testimonials?: { name?: string; text?: string; source?: string }[];
          faqs?: { question?: string; answer?: string }[];
          sections?: { title?: string; body?: string; type_suggestion?: string }[];
          ctas?: string[];
          images?: { url?: string; alt?: string; source_url?: string }[];
          raw_markdown?: string;
          raw_html_size?: number;
        }
      : null;
    const allowAiOnlyFallback = !!body?.allow_ai_only_fallback;
    const scrapeDiagnostics = Array.isArray(body?.scrape_diagnostics) ? body.scrape_diagnostics : [];

    if (!tema || tema.length < 3) {
      return new Response(JSON.stringify({ error: "Tema obrigatório (3+ caracteres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!slug || slug.length < 3) {
      return new Response(JSON.stringify({ error: "Slug inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fase A: bloquear geração silenciosa quando o usuário marcou "página antiga"
    // mas a extração não trouxe NADA aproveitável.
    if (ownOldPage && !allowAiOnlyFallback) {
      const t = (oldPageContent?.testimonials || []).length;
      const f = (oldPageContent?.faqs || []).length;
      const s = (oldPageContent?.sections || []).length;
      const i = (oldPageContent?.images || []).length;
      if (t + f + s + i === 0) {
        return new Response(JSON.stringify({
          error: "extraction_empty",
          message: "A extração da(s) página(s) antiga(s) não retornou nenhum conteúdo (FAQs, depoimentos, seções ou imagens). Para prosseguir mesmo assim com IA pura, reenvie com allow_ai_only_fallback=true.",
          diagnostics: scrapeDiagnostics,
        }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Slug uniqueness
    const { data: existing } = await admin.from("pages").select("id").eq("slug", slug).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "Já existe uma página com esse slug." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read template DNA — usado SOMENTE como referência de tom/estrutura (não copiado).
    const { data: templatePage } = await admin
      .from("pages")
      .select("id")
      .eq("slug", TEMPLATE_SLUG)
      .maybeSingle();
    if (!templatePage) throw new Error("Template page (botox-masculino) not found");

    const { data: templateBlocks } = await admin
      .from("page_blocks")
      .select("type,data,position,enabled,mode")
      .eq("page_id", templatePage.id)
      .order("position");

    // DNA enxuto: só estrutura/forma de cada bloco para a IA imitar a cadência,
    // sem despejar copy específica de Botox no prompt.
    const dnaPayload = (templateBlocks || []).map((b) => ({
      type: b.type,
      campos: Object.keys((b.data as Record<string, unknown>) || {}),
    }));

    // Build prompt for AI
    const systemPrompt = `Você é a copywriter chefe da Estética Batel (Curitiba, desde 1995).
Você está escrevendo uma NOVA landing page sobre "${tema}".

IMPORTANTÍSSIMO — REGRA DE CONTAMINAÇÃO:
- A página-modelo da clínica é "Botox Masculino", mas ela serve APENAS como referência de TOM e ESTRUTURA.
- VOCÊ NÃO PODE mencionar Botox / toxina botulínica / botulinum / "rugas dinâmicas" / "paralisação muscular" / "linhas de expressão" NESTA página, a menos que o tema "${tema}" seja literalmente sobre toxina botulínica.
- Qualquer texto contendo "botox" ou "toxina" será REJEITADO automaticamente. Releia antes de devolver.
- Todo o conteúdo (eyebrow, títulos, parágrafos, métodos, FAQs, CTAs, headers de blocos coletivos, intro de cursos) deve falar EXCLUSIVAMENTE do procedimento "${tema}".
- Se o tema for "Preenchimento Labial", NUNCA escreva sobre rugas, expressão facial, ou toxina. Foque em ácido hialurônico, contorno, hidratação, volume.
- Se o tema for "Bioestimulador de Colágeno", foque em estímulo dérmico, melhora gradual, qualidade da pele — NÃO em paralisação muscular.

REGRAS DE TOM (não negociáveis):
- Autoridade discreta, direta, sem hype
- Português do Brasil, sem inglês desnecessário
- Frases curtas. Verbo no início.
- Evite adjetivos vagos ("incrível", "perfeito", "fantástico")
- NUNCA prometa resultado garantido, "sem riscos", "100% seguro", "indolor"
- NUNCA cite marcas comerciais (Botox®, Dysport®, Xeomin®, Juvederm®, Sculptra®) — use o nome técnico do ativo
- NUNCA use selo Anvisa nem CRBM como argumento principal de copy
- Sempre mencione "avaliação" ou "consulta" antes de dose/preço
- Linguagem que respeita o leitor; sem sensacionalismo

ESTRUTURA DOS BLOCOS (campos esperados por tipo, replicar a cadência):
${JSON.stringify(dnaPayload, null, 2)}

SOBRE O BLOCO CURSOS:
- O bloco existe em todas as páginas. Você DEVE adaptar eyebrow, título, intro e footnote ao tema "${tema}".
- Exemplo: para "Preenchimento Labial" → intro pode falar de formação técnica em harmonização perioral.
- NÃO mencione Botox (a menos que o tema seja Botox). Se o pool de cursos da clínica não tiver curso específico desse tema, mantenha o copy genérico mas conectado ao universo do procedimento.

REGRAS ESPECÍFICAS DE BLOCOS (estrutura aprovada — NÃO simplificar):

- METODO: 3 passos. Cada passo TEM OBRIGATORIAMENTE 'title', 'summary' (frase curta) e 'detail' (2-3 frases concretas que abrem no accordion "Como funciona na prática"). O 'detail' precisa ser específico do procedimento "${tema}" — descreve o que acontece naquele passo na prática clínica deste procedimento.

- EQUIPE_RT (Responsável Técnica): NÃO transformar essa seção em "Direção Técnica" ou bloco genérico. Sempre manter como apresentação da Dra. Daniele Florencio. O título deve trazer o nome dela. A bio adapta-se ao tema. Os 2 accordions são:
  1) "Como a Dra. Daniele pensa o [procedimento desta página]" — ponto de vista clínico dela sobre este procedimento específico (1 parágrafo curto, em 1ª pessoa, entre aspas).
  2) "Especializações e formação" — institucional (lista de 4-5 itens em texto corrido, separados por '·' ou em frases curtas). Pode reusar a base: especialização em Harmonização Orofacial, atualizações anuais, +10.000 procedimentos documentados, mentora de profissionais em formação.
  O cta_label é sempre "Conhecer a equipe completa".`;

    const userPrompt = `Tema da nova página: "${tema}"
Slug: ${slug}

${aiNotes ? `Notas do editor (prioridade máxima):\n${aiNotes}\n\n` : ""}${
      research
        ? `Pesquisa do tema (use como base de verdade):\n${JSON.stringify(research, null, 2)}`
        : "(sem pesquisa pré-feita — use seu conhecimento)"
    }
${linksReferencia.length ? `\nLinks de referência fornecidos pelo editor: ${linksReferencia.join(", ")}` : ""}

Gere TODOS os blocos contextualizados ao tema "${tema}". Para FAQs, derive das dúvidas reais da pesquisa.
Para cursos, escreva header e intro contextualizados — os cards continuam vindo do catálogo da clínica.`;

    // Fase B: se há conteúdo da página antiga, dá contexto + ordens duras à IA
    const ownPageHint = (ownOldPage && oldPageContent) ? `\n\nCONTEÚDO REAL DA PÁGINA ANTIGA DESTA CLÍNICA (preservar):\n${
      (oldPageContent.faqs || []).length > 0
        ? `- FAQs reais: ${(oldPageContent.faqs || []).length} (NÃO inventar perguntas; FAQs serão substituídas pelas reais).\n`
        : ""
    }${
      (oldPageContent.testimonials || []).length > 0
        ? `- Depoimentos reais: ${(oldPageContent.testimonials || []).length} (NÃO inventar depoimentos; serão substituídos pelos reais).\n`
        : ""
    }${
      oldPageContent.raw_markdown
        ? `\nResumo do markdown original (para você ENCAIXAR o tom da clínica, não copiar):\n${oldPageContent.raw_markdown.slice(0, 6000)}\n`
        : ""
    }` : "";

    const fullUserPrompt = userPrompt + ownPageHint;

    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
      model: "google/gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fullUserPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "gerar_pagina",
              description: "Gera o conteúdo completo da nova página seguindo o DNA editorial.",
              parameters: generatePageSchema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "gerar_pagina" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições da IA atingido." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar página." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "IA não retornou estrutura esperada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const generated = JSON.parse(toolCall.function.arguments);

    // Fase B: filtro anti-Botox para todos os campos textuais quando o tema
    // não é toxina/botox. Não regeneramos — só sanitizamos substituindo termos
    // proibidos por placeholders neutros e marcamos para revisão no metadata.
    const isBotoxTheme = /\b(botox|toxina|botulin)/i.test(tema);
    const contaminationFlags: string[] = [];
    function sanitize(input: unknown, path: string): unknown {
      if (typeof input === "string") {
        if (!isBotoxTheme && /\b(botox|toxina botul[íi]nica?|botulin\w*)\b/i.test(input)) {
          contaminationFlags.push(path);
          return input.replace(/\b(botox|toxina botul[íi]nica?|botulin\w*)\b/gi, "[procedimento]");
        }
        return input;
      }
      if (Array.isArray(input)) return input.map((v, i) => sanitize(v, `${path}[${i}]`));
      if (input && typeof input === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(input)) out[k] = sanitize(v, `${path}.${k}`);
        return out;
      }
      return input;
    }
    generated.blocks = sanitize(generated.blocks, "blocks") as typeof generated.blocks;

    // ---- Fase 1.2: conteúdo real da página antiga própria tem prioridade ----
    const ownTestimonials = (oldPageContent?.testimonials || [])
      .filter((t) => t && typeof t.text === "string" && t.text.trim().length > 0)
      .map((t) => ({
        name: (t.name || "Paciente").trim(),
        text: t.text!.trim(),
        rating: 5,
        date_label: "",
        source: "old_page",
      }));

    const ownFaqs = (oldPageContent?.faqs || [])
      .filter((f) => f && typeof f.question === "string" && typeof f.answer === "string" && f.question.trim() && f.answer.trim())
      .map((f) => ({ question: f.question!.trim(), answer: f.answer!.trim(), source: "old_page" }));

    // Fase B: se a página antiga trouxe FAQs reais, USA APENAS elas. Sem mistura.
    const aiFaqs = (Array.isArray(generated.blocks?.faq_items) ? generated.blocks.faq_items : [])
      .map((f: { question: string; answer: string }) => ({ ...f, source: "ai" }));
    const mergedFaqs = ownFaqs.length > 0 ? ownFaqs : aiFaqs;

    // Fase C: bloco procedimento_detalhado SEMPRE vem preenchido.
    // Prioridade 1: seção forte da página antiga (ativo por padrão).
    // Prioridade 2: seções com qualquer conteúdo (ativo).
    // Fallback: parágrafos derivados do manifesto + método (criado disabled,
    // mas com conteúdo editável — admin ativa quando quiser).
    const detailedSection = (oldPageContent?.sections || []).find((sec) => {
      const t = (sec.type_suggestion || "").toLowerCase();
      return ["procedimento_detalhado", "beneficios", "metodo", "preparo", "pos_procedimento"].includes(t)
        && typeof sec.body === "string"
        && sec.body.trim().length > 80;
    }) || (oldPageContent?.sections || []).find((sec) =>
      typeof sec?.body === "string" && sec.body.trim().length > 120
    );

    let procedimentoDetalhadoData = generated.blocks.procedimento_detalhado;
    let procedimentoDetalhadoEnabled = true; // Agora habilitado por padrão pois a IA gera conteúdo de qualidade

    // Se houver conteúdo real da página antiga, ele ainda tem prioridade total
    if (detailedSection) {
      procedimentoDetalhadoData = {
        eyebrow: "Como é o procedimento",
        title_html: detailedSection.title || "Como é o procedimento",
        paragraphs: (detailedSection.body || "")
          .split(/\n\s*\n/)
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 0)
          .slice(0, 6),
        bullets: Array.isArray((detailedSection as any).bullets)
          ? (detailedSection as any).bullets.map((b: any) => {
              if (typeof b === 'object' && b !== null && b.title && b.text) {
                return { title: b.title, text: b.text };
              }
              const str = String(b);
              const hasColon = str.includes(":");
              return {
                title: hasColon ? str.split(":")[0].trim() : "Destaque",
                text: hasColon ? str.split(":").slice(1).join(":").trim() : str.trim()
              };
            }).slice(0, 8)
          : [],
      };
    }

    const candidateImages = (oldPageContent?.images || [])
      .filter((img) => img && typeof img.url === "string")
      .slice(0, 30);
    // -----------------------------------------------------------------------

    // Build blocks: Prioridade de imagem do Hero
    // 1. Primeira imagem da página antiga (se houver)
    // 2. Imagem do template (Botox) como fallback neutro

    const heroImageFallback =
      ((templateBlocks || []).find((b) => b.type === "hero")?.data as { image_url?: string } | undefined)?.image_url || null;
    
    const heroImage = (ownOldPage && candidateImages.length > 0) 
      ? candidateImages[0].url 
      : heroImageFallback;
    const equipeBase =
      ((templateBlocks || []).find((b) => b.type === "equipe_rt")?.data as Record<string, unknown> | undefined) || {};
    // Reaproveitamos apenas dados institucionais da RT (foto, registro, nome) —
    // NUNCA bio/accordions, que falam do Botox.
    const equipeInstitutional: Record<string, unknown> = {};
    for (const k of ["image_url", "register", "register_label", "name"]) {
      if (equipeBase[k]) equipeInstitutional[k] = equipeBase[k];
    }

    const newBlocks: Array<{ type: string; position: number; data: unknown; mode: string; enabled: boolean }> = [];
    let pos = 1;
    const headers = (generated.blocks.collective_headers || {}) as Record<
      string,
      {
        eyebrow?: string;
        title_html?: string;
        subtitle?: string;
        intro?: string;
        footnote?: string;
        bio?: string;
        accordions?: { question: string; answer: string }[];
        cta_label?: string;
      }
    >;
    for (const type of BLOCK_ORDER) {
      let data: unknown;
      let enabled = true;
      switch (type) {
        case "hero":
          data = { ...generated.blocks.hero, ...(heroImage ? { image_url: heroImage } : {}) };
          break;
        case "manifesto_curto":
          data = generated.blocks.manifesto_curto;
          break;
        case "metodo":
          data = generated.blocks.metodo;
          break;
        case "beneficios_grid":
          data = generated.blocks.beneficios_grid;
          break;
        case "procedimento_detalhado":
          // Fase C: sempre vem com conteúdo. Ativo se veio da página antiga,
          // desligado (mas editável) se veio do fallback.
          data = procedimentoDetalhadoData;
          enabled = procedimentoDetalhadoEnabled;
          break;
        case "preco_ancora":
          data = generated.blocks.preco_ancora;
          break;
        case "cta_final":
          data = generated.blocks.cta_final;
          break;
        case "faq":
          data = {
            title: "Perguntas frequentes",
            eyebrow: "Dúvidas frequentes",
            items: mergedFaqs,
          };
          break;
        // Blocos coletivos: header da IA + data neutro. NUNCA herdam copy do Botox.
        case "authority_strip":
        case "casos":
        case "depoimentos":
        case "ai_opinions":
        case "cursos": {
          const h = headers[type] || {};
          const merged: Record<string, unknown> = {};
          if (h.eyebrow) merged.eyebrow = h.eyebrow;
          if (h.title_html) merged.title_html = h.title_html;
          if (type === "ai_opinions" && h.subtitle) merged.subtitle = h.subtitle;
          if (type === "cursos") {
            if (h.intro) merged.intro = h.intro;
            if (h.footnote) merged.footnote = h.footnote;
          }
          if (type === "casos" && research?.area_anatomica) {
            merged.area_filter = String(research.area_anatomica);
          }
          // Fase 1.2: depoimentos próprios da página antiga têm prioridade
          // sobre o pool de Google reviews.
          // Fase B: depoimentos APENAS da página antiga quando ela tem.
          // Quando tem, desliga o pool global setando source explícito.
           if (type === "depoimentos") {
             if (ownTestimonials.length > 0) {
               merged.items = ownTestimonials;
               merged.show_count = ownTestimonials.length;
               merged.source = "own_old_page";
               merged.disable_pool = true;
             } else if (ownOldPage) {
               // Se é página própria e não extraiu depoimentos, oculta o bloco.
               enabled = false;
             }
           }
          data = merged;
          break;
        }
        case "equipe_rt": {
          const h = headers.equipe_rt || {};
          const merged: Record<string, unknown> = { ...equipeInstitutional };
          if (h.eyebrow) merged.eyebrow = h.eyebrow;
          if (h.title_html) merged.title_html = h.title_html;
          if (h.bio) merged.bio = h.bio;
          if (Array.isArray(h.accordions) && h.accordions.length > 0) merged.accordions = h.accordions;
          merged.cta_label = h.cta_label || "Conhecer a equipe completa";
          // Garante campos institucionais mínimos vindos do template/page-mãe.
          if (!merged.image_url && (equipeInstitutional as { photo_url?: string }).photo_url) {
            merged.image_url = (equipeInstitutional as { photo_url?: string }).photo_url;
          }
          if (!merged.register_label && (equipeInstitutional as { register?: string }).register) {
            merged.register_label = (equipeInstitutional as { register?: string }).register;
          }
          data = merged;
          break;
        }
      }
      newBlocks.push({ type, position: pos++, data, mode: "structured", enabled });
    }

    // Build metadata for the new page (Fase 1).
    const metadata = {
      tema,
      categoria: generated.page.categoria || null,
      area_anatomica: research?.area_anatomica || null,
      ai_notes: aiNotes || null,
      links_referencia: linksReferencia,
      sources: sourcesIn,
      generated_at: new Date().toISOString(),
      template_slug: TEMPLATE_SLUG,
      // Fase 1.2 — origem do conteúdo das referências
      reference_type: ownOldPage ? "own_old_page" : (linksReferencia.length > 0 ? "external" : "none"),
      // URLs de imagens encontradas nas páginas antigas próprias.
      // NÃO baixamos automaticamente — ficam como sugestões para o admin colar
      // nos blocos de imagem (hero, etc.).
      old_page_images: ownOldPage ? candidateImages : [],
      old_page_extracted: ownOldPage ? {
        testimonials_count: ownTestimonials.length,
        faqs_count: ownFaqs.length,
        sections_count: (oldPageContent?.sections || []).length,
        used_section_for_detalhado: procedimentoDetalhadoEnabled,
      } : null,
      // Fase A: persiste diagnóstico bruto da extração + raw_markdown para
      // re-geração futura sem precisar chamar Firecrawl de novo.
      scrape_diagnostics: scrapeDiagnostics,
      old_page_raw_markdown: ownOldPage && oldPageContent?.raw_markdown ? oldPageContent.raw_markdown : null,
      contamination_flags: contaminationFlags,
      allow_ai_only_fallback: ownOldPage ? allowAiOnlyFallback : null,
    };

    // Insert page + blocks
    const { data: newPage, error: pageErr } = await admin
      .from("pages")
      .insert({
        slug,
        title: generated.page.title,
        meta_title: generated.page.meta_title,
        meta_description: generated.page.meta_description,
        status: "draft",
        metadata,
      })
      .select("id,slug")
      .single();
    if (pageErr) throw pageErr;

    const blocksToInsert = newBlocks.map((b) => ({ ...b, page_id: newPage.id }));
    const { error: blocksErr } = await admin.from("page_blocks").insert(blocksToInsert);
    if (blocksErr) {
      // rollback page
      await admin.from("pages").delete().eq("id", newPage.id);
      throw blocksErr;
    }

    return new Response(
      JSON.stringify({ page_id: newPage.id, slug: newPage.slug, area_anatomica: research?.area_anatomica || null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-page-from-topic error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});