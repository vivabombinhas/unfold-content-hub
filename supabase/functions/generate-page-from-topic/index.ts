// Edge function: generate-page-from-topic
// Receives { tema, slug, research, sources?, links_referencia? }
// 1. Validates admin caller
// 2. Reads "voice DNA" from botox-masculino page (template)
// 3. Asks Lovable AI to generate all 11 blocks following the same tone
// 4. Inserts a new page (status=draft) + 11 page_blocks rows
// 5. Returns { page_id, slug }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
      },
      required: ["title", "meta_title", "meta_description"],
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
          },
          required: ["eyebrow", "title", "subtitle", "cta_label", "cta_href"],
          additionalProperties: false,
        },
        manifesto_curto: {
          type: "object",
          properties: {
            title: { type: "string" },
            body: { type: "string", description: "2-4 frases, voz Batel: direto, técnico-acessível." },
          },
          required: ["title", "body"],
          additionalProperties: false,
        },
        metodo: {
          type: "object",
          properties: {
            title: { type: "string" },
            steps: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: {
                type: "object",
                properties: {
                  n: { type: "number" },
                  title: { type: "string" },
                  desc: { type: "string" },
                },
                required: ["n", "title", "desc"],
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
      },
      required: ["hero", "manifesto_curto", "metodo", "preco_ancora", "cta_final", "faq_items"],
      additionalProperties: false,
    },
  },
  required: ["page", "blocks"],
  additionalProperties: false,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    // Slug uniqueness
    const { data: existing } = await admin.from("pages").select("id").eq("slug", slug).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "Já existe uma página com esse slug." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read template DNA
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

    const dnaPayload = (templateBlocks || []).map((b) => ({ type: b.type, data: b.data })).slice(0, 12);

    // Build prompt for AI
    const systemPrompt = `Você é a copywriter chefe da Estética Batel (Curitiba, desde 1995). Sua voz é a EXATA voz da página-modelo "Botox Masculino" abaixo.

REGRAS DE TOM (não negociáveis):
- Autoridade discreta, direta, sem hype
- Português do Brasil, sem inglês desnecessário
- Frases curtas. Verbo no início.
- Evite adjetivos vagos ("incrível", "perfeito", "fantástico")
- NUNCA prometa resultado garantido, "sem riscos", "100% seguro", "indolor"
- NUNCA cite marcas comerciais de toxina (Botox®, Dysport®, Xeomin®) — diga "toxina botulínica"
- NUNCA use selo Anvisa nem CRBM como argumento principal de copy
- Sempre mencione "avaliação" ou "consulta" antes de dose/preço
- Linguagem que respeita o leitor; sem sensacionalismo

VOZ-MODELO (replicar):
${JSON.stringify(dnaPayload, null, 2)}

Sua tarefa: gerar uma nova landing page para o tema solicitado, mantendo a mesma estrutura, cadência e tom do modelo. Adapte conteúdo ao tema, NÃO copie frases.`;

    const userPrompt = `Tema da nova página: "${tema}"
Slug: ${slug}

${research ? `Pesquisa do tema (use como base de verdade):\n${JSON.stringify(research, null, 2)}` : "(sem pesquisa pré-feita — use seu conhecimento)"}

Gere os blocos. Para FAQs, derive das dúvidas reais da pesquisa.`;

    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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

    // Build blocks: AI-generated for text-heavy ones, copy-from-template for collection blocks
    const templateMap = new Map<string, unknown>(
      (templateBlocks || []).map((b) => [b.type as string, b.data]),
    );

    const newBlocks: Array<{ type: string; position: number; data: unknown; mode: string; enabled: boolean }> = [];
    let pos = 1;
    for (const type of BLOCK_ORDER) {
      let data: unknown;
      switch (type) {
        case "hero":
          data = { ...generated.blocks.hero, image_url: (templateMap.get("hero") as { image_url?: string })?.image_url };
          break;
        case "manifesto_curto":
          data = generated.blocks.manifesto_curto;
          break;
        case "metodo":
          data = generated.blocks.metodo;
          break;
        case "preco_ancora":
          data = generated.blocks.preco_ancora;
          break;
        case "cta_final":
          data = generated.blocks.cta_final;
          break;
        case "faq":
          data = { title: "Perguntas frequentes", items: generated.blocks.faq_items };
          break;
        // Collection blocks: keep template structure (titles + subtitles), content is pulled from pool tables
        case "authority_strip":
        case "casos":
        case "depoimentos":
        case "ai_opinions":
        case "equipe_rt":
        case "cursos":
          data = templateMap.get(type) || {};
          break;
      }
      newBlocks.push({ type, position: pos++, data, mode: "structured", enabled: true });
    }

    // Insert page + blocks
    const { data: newPage, error: pageErr } = await admin
      .from("pages")
      .insert({
        slug,
        title: generated.page.title,
        meta_title: generated.page.meta_title,
        meta_description: generated.page.meta_description,
        status: "draft",
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