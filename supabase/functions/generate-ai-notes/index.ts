import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Você é o estrategista editorial sênior da Estética Batel (Curitiba).
Sua tarefa é criar ou melhorar "Notas para a IA" que servirão de guia para a criação de uma landing page premium.

O objetivo dessas notas é garantir que a IA que escreverá a página entenda:
1. Público-alvo exato (quem é a pessoa, dores e desejos).
2. Ângulo da página (promessa principal/gancho emocional).
3. O que destacar (benefícios chave).
4. O que evitar (erros comuns, termos proibidos, confusões).
5. Tom (sempre premium, direto, acolhedor).
6. Observações específicas.

FORMATO OBRIGATÓRIO (Mantenha os títulos exatamente assim):
Público-alvo:
[descrição]

Ângulo da página:
[descrição]

Destacar:
* [ponto 1]
* [ponto 2]
* [ponto 3]

Evitar:
* [item 1]
* [item 2]
* [item 3]

Tom:
[estilo de voz]

Observação:
[regra final]

REGRAS DA BATEL:
- Nunca prometa resultados 100% ou definitivos.
- Fale de "procedimentos confortáveis" em vez de "sem dor".
- Foco em naturalidade e elegância.
- Não invente informações técnicas que não estejam no contexto.

Devolva APENAS o conteúdo das notas, sem introduções ou explicações.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Admin-only check
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) throw new Error("Não autenticado");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin");
    if (!roleRows || roleRows.length === 0) throw new Error("Apenas administradores");

    const { mode, tema, currentValue, extraContext } = await req.json();

    let userPrompt = "";
    if (mode === "generate") {
      userPrompt = `Gere orientações editoriais para uma página sobre: "${tema}".
Contexto extra disponível: ${extraContext || "Nenhum"}.
Crie um plano sólido e premium seguindo o formato obrigatório.`;
    } else {
      userPrompt = `Melhore as seguintes orientações editoriais para o tema "${tema}". 
Mantenha o sentido, mas torne mais organizado, profissional e estratégico (tom Batel).

Notas atuais:
"""
${currentValue}
"""`;
    }

    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      throw new Error(`AI Gateway error: ${errorText}`);
    }

    const aiData = await aiRes.json();
    const text = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
