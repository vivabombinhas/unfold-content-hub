import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const handler = async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const { image, text, origin } = await req.json();

    if (!image || !text) {
      return new Response(JSON.stringify({ error: "Imagem e texto são obrigatórios." }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const usage_policy = origin === "batel_legacy" ? "preserve_literal" : "inspiration_only";

    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5", // Multimodal
        messages: [
          {
            role: "system",
            content: `Você é o "Scanner de Seções Multimodal" do Batel Page Studio.
Sua função é analisar um PRINT de uma seção (referência visual) e um TEXTO colado (referência de conteúdo) para sugerir um bloco no padrão visual Batel.

DIRETRIZES:
1. PRINT (REFERÊNCIA VISUAL): Use para inferir layout, hierarquia, número de colunas, posição de cards e estilo geral.
2. TEXTO (REFERÊNCIA DE CONTEÚDO): É a fonte PRINCIPAL de informação literal.
3. POLÍTICA DE USO: A origem é "${origin}" e a política é "${usage_policy}".
   - Se "batel_legacy": PRESERVE LITERALMENTE cada palavra técnica, números, prazos e parágrafos. NÃO RESUMA.
   - Se "external_reference": Use apenas a estrutura; gere copy original adaptada para a clínica.
4. REGRA DE OURO: Se o texto tiver mais conteúdo que o layout do print sugere, PRESERVE TUDO. Sugira uma adaptação visual (ex: transformar excesso em side_cards ou steps) mas nunca apague informação técnica.

RETORNO:
Você deve retornar obrigatoriamente um objeto JSON seguindo o schema v2 para uma única seção.

SCHEMA DE SAÍDA:
{
  "page_metadata": {
    "detected_title": "string",
    "source_url": "manual_vision",
    "source_origin": "${origin}",
    "default_usage_policy": "${usage_policy}"
  },
  "sections": [
    {
      "id": "string",
      "raw_title": "string (Extraído do texto)",
      "raw_content": "string (Texto literal completo se batel_legacy)",
      "suggested_type": "beneficios_grid | procedimento_detalhado_v2 | texto_livre",
      "confidence": number,
      "usage_policy": "${usage_policy}",
      "source_origin": "${origin}",
      "images": [],
      "extracted_data": { 
         // Para beneficios_grid: { "items": [{ "title": "...", "text": "..." }] }
         // Para procedimento_detalhado_v2: { "paragraphs": ["..."], "steps": [{ "title": "...", "description": "..." }], "side_cards": [{ "title": "...", "text": "..." }] }
      }
    }
  ]
}`
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Texto colado:\n\n${text}` },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiRes.json();
    const result = JSON.parse(aiData?.choices?.[0]?.message?.content || "{}");

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
};

serve(handler);