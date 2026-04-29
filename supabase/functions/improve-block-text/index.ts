// Edge function: improve-block-text
// Admin-only. Generates or improves a single text field for a page block,
// always speaking in the Estética Batel voice. Used by the AIField buttons in
// the block editor.
//
// Input:
//   {
//     mode: "generate" | "improve",
//     blockType: string,         // e.g. "hero", "manifesto_curto"
//     fieldKey: string,          // e.g. "title_html", "paragraph"
//     fieldLabel?: string,       // human label shown in UI ("Parágrafo")
//     currentValue?: string,
//     pageTitle?: string,
//     pageTopic?: string,        // free-form context (page slug + title)
//     extraContext?: string,     // optional extra hint from caller
//   }
// Output: { text: string }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Hint per field: max length, format constraints. Keeps the model honest.
const FIELD_HINTS: Record<string, string> = {
  eyebrow: "Texto curto (2-4 palavras), em CAIXA ALTA opcional. Sem ponto final.",
  title_html: "Headline forte (4-10 palavras). Pode usar <em>palavra</em> para ênfase dourada. Sem ponto final.",
  title: "Título curto e direto (4-8 palavras). Sem ponto final.",
  subtitle: "Frase curta de apoio (até 14 palavras).",
  paragraph: "1-3 frases. Direto, sem hype, sem promessa garantida. Português do Brasil.",
  description: "1-2 frases descritivas, claras, sem adjetivos vagos.",
  body: "2-4 frases, voz Batel: técnico-acessível.",
  quote_html: "Citação curta de 1-2 frases. Pode usar <em>...</em>.",
  long_text: "3-5 parágrafos curtos para um side-sheet. HTML simples permitido (<p>, <strong>).",
  bio: "2-4 frases biográficas, terceira pessoa, sem superlativos.",
  caption_top: "Frase muito curta (até 6 palavras).",
  caption_bottom: "Frase muito curta (até 6 palavras).",
  footnote: "Linha discreta, até 12 palavras, sem ponto final.",
  cta_label: "2-4 palavras imperativas (ex: 'Agendar avaliação').",
  intro: "1-2 frases de introdução.",
  note: "Linha curta, neutra, sem promessa.",
  price_label: "Formato 'a partir de R$ X.XXX' — nunca preço fixo.",
  sheet_title: "Título curto (até 6 palavras).",
  sheet_html: "HTML simples (<p>, <ul>, <li>, <strong>). 3-6 parágrafos no máximo.",
  question: "Pergunta direta de paciente, 6-14 palavras, com ponto de interrogação.",
  answer: "Resposta de 2-4 frases. Sem promessa garantida.",
  summary: "Frase curta de resumo (até 14 palavras).",
  detail: "1-2 parágrafos de detalhe técnico-acessível.",
  register_label: "Texto curto (ex: 'CRBM 8242 PR').",
};

const SYSTEM_PROMPT = `Você é a copywriter chefe da Estética Batel (Curitiba, desde 1995).

REGRAS DE TOM (não negociáveis):
- Autoridade discreta, direta, sem hype
- Português do Brasil, sem inglês desnecessário
- Frases curtas. Verbo no início quando possível.
- Evite adjetivos vagos ("incrível", "perfeito", "fantástico", "único")
- NUNCA prometa resultado garantido, "sem riscos", "100% seguro", "indolor"
- NUNCA cite marcas comerciais de toxina (Botox®, Dysport®, Xeomin®) — diga "toxina botulínica"
- NUNCA use selo Anvisa ou CRBM como argumento principal de venda
- Sempre mencione "avaliação" ou "consulta" antes de qualquer dose/preço
- Linguagem que respeita o leitor; sem sensacionalismo

IMPORTANTE: você devolve APENAS o texto final pronto para o campo, sem aspas, sem
explicações, sem markdown extra (a menos que o campo aceite HTML, e nesse caso
devolve só o HTML do conteúdo, sem <html>/<body>).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Admin-only
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

    const body = await req.json();
    const mode = body?.mode === "improve" ? "improve" : "generate";
    const blockType = String(body?.blockType || "").slice(0, 40);
    const fieldKey = String(body?.fieldKey || "").slice(0, 40);
    const fieldLabel = String(body?.fieldLabel || fieldKey).slice(0, 80);
    const currentValue = String(body?.currentValue || "").slice(0, 4000);
    const pageTitle = String(body?.pageTitle || "").slice(0, 200);
    const pageTopic = String(body?.pageTopic || "").slice(0, 200);
    const extraContext = String(body?.extraContext || "").slice(0, 1000);

    if (!blockType || !fieldKey) {
      return new Response(JSON.stringify({ error: "blockType e fieldKey obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mode === "improve" && currentValue.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Sem texto atual para melhorar — escreva um rascunho ou use Gerar." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hint = FIELD_HINTS[fieldKey] || "Texto curto e direto, no tom Batel.";

    const userPrompt = mode === "improve"
      ? `Tema/título da página: "${pageTitle || pageTopic || "(sem contexto)"}"
Bloco: ${blockType}
Campo: ${fieldLabel} (${fieldKey})
Restrições do campo: ${hint}
${extraContext ? `Contexto extra: ${extraContext}\n` : ""}
Texto atual:
"""
${currentValue}
"""

Reescreva o texto acima mantendo a INTENÇÃO original, mas mais limpo, mais direto, no tom Batel. Devolva APENAS o novo texto.`
      : `Tema/título da página: "${pageTitle || pageTopic || "(sem contexto)"}"
Bloco: ${blockType}
Campo: ${fieldLabel} (${fieldKey})
Restrições do campo: ${hint}
${extraContext ? `Contexto extra: ${extraContext}\n` : ""}
${currentValue ? `Rascunho atual (use como pista, mas pode descartar):\n"""\n${currentValue}\n"""\n` : ""}

Gere o texto desse campo. Devolva APENAS o texto final, nada mais.`;

    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
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
      return new Response(JSON.stringify({ error: "Erro ao chamar IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    let text = String(aiData?.choices?.[0]?.message?.content || "").trim();

    // Light cleanup: strip wrapping quotes the model sometimes adds.
    text = text.replace(/^["“'']+|["”'']+$/g, "").trim();

    if (!text) {
      return new Response(JSON.stringify({ error: "IA não retornou texto." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("improve-block-text error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});