import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse input
    const { page_id, document_type } = await req.json();

    if (!page_id || !document_type) {
      return new Response(JSON.stringify({ error: "page_id e document_type são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch Context
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("*, page_blocks(*)")
      .eq("id", page_id)
      .single();

    if (pageError || !page) {
      return new Response(JSON.stringify({ error: "Página não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: faqs } = await supabase
      .from("faqs")
      .select("*")
      .eq("page_id", page_id);

    const context = {
      title: page.title,
      slug: page.slug,
      blocks: page.page_blocks?.filter((b: any) => b.enabled).map((b: any) => ({ type: b.type, data: b.data })),
      faqs: faqs?.map(f => ({ q: f.question, a: f.answer })),
      metadata: page.metadata,
      compliance: "Dra. Daniele Florêncio (Biomédica · CRBM 8242-PR), Clínica de Estética Batel.",
    };

    // 2. Prepare Prompt
    const isTCLE = document_type === "tcle";
    const systemPrompt = isTCLE 
      ? `Você é um assistente especializado em redação técnica de saúde para a Clínica Estética Batel. 
         Gere um TCLE (Termo de Consentimento Livre e Esclarecido) em HTML para o procedimento informado.
         
         ESTRUTURA OBRIGATÓRIA (12 seções):
         1. Identificação do procedimento
         2. Objetivo do procedimento
         3. Como o procedimento funciona
         4. Benefícios esperados
         5. Possíveis desconfortos comuns
         6. Cuidados antes
         7. Cuidados depois
         8. Necessidade de avaliação individual
         9. Limitações e variação de resultados
         10. Declaração de ciência
         11. Responsável Técnica (Dra. Daniele Florêncio, CRBM 8242-PR)
         12. Data de revisão

         REGRAS CRÍTICAS:
         - Não prometer resultados.
         - Não usar linguagem comercial ou agressiva.
         - Use tom institucional, profissional e seguro.
         - Deixe claro que resultados dependem de avaliação individual.
         - Retorne APENAS o HTML limpo, sem markdown, pronto para renderização.`
      : `Você é um assistente especializado em redação técnica de estética premium para a Estética Batel.
         Gere os Diferenciais Técnicos em HTML para o procedimento informado.

         ESTRUTURA OBRIGATÓRIA (10 seções):
         1. Visão técnica do procedimento
         2. Indicações gerais
         3. Diferenciais da Estética Batel
         4. Personalização do protocolo
         5. Segurança e avaliação
         6. Tecnologias/produtos confirmados
         7. Experiência da equipe
         8. Acompanhamento clínico
         9. Limitações do procedimento
         10. Revisão técnica (Dra. Daniele Florêncio)

         REGRAS CRÍTICAS:
         - Tom técnico, premium e sofisticado.
         - Não exagere nas promessas.
         - Priorize dados reais e segurança.
         - Evite generalidades; use o contexto da clínica fornecido.
         - Retorne APENAS o HTML limpo, sem markdown, pronto para renderização.`;

    const userPrompt = `Gere o documento ${document_type === 'tcle' ? 'TCLE' : 'Diferenciais Técnicos'} para o procedimento "${context.title}".
    
    Contexto da Página:
    ${JSON.stringify(context, null, 2)}
    
    Gere o HTML estruturado agora.`;

    // 3. Call AI
    const aiResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      console.error("AI Gateway Error:", errorData);
      throw new Error(`Erro na IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    if (!aiData.choices?.[0]?.message?.content) {
      console.error("Unexpected AI response format:", aiData);
      throw new Error("Resposta da IA em formato inválido");
    }

    let htmlContent = aiData.choices[0].message.content;

    // 4. Save to Database
    const docTitle = isTCLE ? `TCLE - ${page.title}` : `Diferenciais Técnicos - ${page.title}`;
    
    const { data: document, error: saveError } = await supabase
      .from("procedure_documents")
      .upsert({
        page_id,
        document_type,
        title: docTitle,
        slug: page.slug,
        html_content: htmlContent,
        status: "draft",
        source_context: context,
        updated_at: new Date().toISOString(),
      }, { onConflict: "page_id, document_type" })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify(document), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
