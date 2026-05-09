 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TEMPLATE_SLUG = "botox-masculino";

 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders })
   }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
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
    const { name, slug, category, baseContent, faqBase, testimonialsBase, selectedBlocks } = body;

    if (!name || !slug) {
      return new Response(JSON.stringify({ error: "Nome e slug obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check slug uniqueness
    const { data: existing } = await admin.from("pages").select("id").eq("slug", slug).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "Já existe uma página com esse slug." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

   // Fetch global settings for defaults
   const { data: siteSettings } = await admin.from("site_settings").select("*").eq("id", 1).maybeSingle();

    // DNA template (Botox Masculino)
    const { data: templatePage } = await admin.from("pages").select("id").eq("slug", TEMPLATE_SLUG).maybeSingle();
    const { data: templateBlocks } = templatePage 
      ? await admin.from("page_blocks").select("type,data,position").eq("page_id", templatePage.id)
      : { data: [] };

    const dnaPayload = (templateBlocks || []).map((b) => ({
      type: b.type,
      campos: Object.keys((b.data as Record<string, unknown>) || {}),
    }));

    // AI Keys check (for later)
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    // Default model if no custom keys
    let model = "gpt-4o-mini";
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    
    // If premium keys are set, we'd use them here via Lovable Gateway
    // For now, let's keep it safe and report if keys are missing but requested (conceptually)
    
    const systemPrompt = `Você é a copywriter chefe da Estética Batel (Curitiba).
Você está escrevendo uma NOVA landing page sobre "${name}" para a categoria "${category}".
Voz da marca: Autoridade discreta, direta, frases curtas, sem hype sensacionalista.

CONTEÚDO BASE FORNECIDO (PRIORIDADE MÁXIMA):
${baseContent}

FAQ BASE:
${faqBase}

DEPOIMENTOS BASE:
${testimonialsBase}

ESTRUTURA DE REFERÊNCIA (DNA Batel):
${JSON.stringify(dnaPayload)}

REGRAS:
1. NUNCA mencionar "Botox" ou "Toxina" a menos que o tema seja esse.
2. NUNCA inventar dados técnicos. Se o conteúdo base não disser, use copy editorial genérico de alta qualidade.
3. Se houver Depoimentos Base, use-os fielmente no bloco de depoimentos.
4. Se houver FAQ Base, use-as fielmente no bloco de FAQ.
5. Devolva APENAS um JSON válido.`;

    // Mock response for now until AI is connected to avoid costs/errors
    // In a real impl, we'd call AI_GATEWAY here.
    
    // Create page
    const { data: newPage, error: pageErr } = await admin
      .from("pages")
      .insert({
        slug,
        title: name,
        meta_title: `${name} em Curitiba | Estética Batel`,
        meta_description: `Conheça o tratamento de ${name} na Estética Batel Curitiba. Excelência e resultados naturais desde 1995.`,
        status: "draft",
        metadata: { category, generated_by: "premium_wizard", blocks_requested: selectedBlocks }
      })
      .select("id,slug")
      .single();
    if (pageErr) throw pageErr;

    // Insert requested blocks (as empty placeholders or with base content)
    const blocksToInsert = (selectedBlocks as string[]).map((type, index) => {
      let data: any = {};
      
      // Basic initialization for some types
      if (type === "hero") data = { title: name, eyebrow: "Estética Batel", cta_label: "Agendar Consulta", subtitle: "Excelência e resultados naturais em Curitiba." };
      if (type === "procedimento_detalhado") data = { 
        eyebrow: "Como é o procedimento", 
        title_html: `Como é, na prática, o <em>${name}</em>.`,
        paragraphs: ["O procedimento é realizado em ambiente clínico seguro, seguindo protocolos internacionais de excelência.", "A Dra. Daniele Florencio realiza cada etapa com foco na naturalidade e no conforto do paciente."],
        bullets: [
          { title: "Avaliação Individual", text: "Estudo detalhado da anatomia e objetivos do paciente." },
          { title: "Protocolo Premium", text: "Uso de tecnologias e ativos de última geração." }
        ]
      };
      if (type === "beneficios_grid") data = {
        eyebrow: "Diferenciais",
        title_html: `Benefícios do <em>${name}</em>.`,
        cards: [
          { title: "Resultado Natural", text: "Foco na preservação da sua expressão e harmonia facial." },
          { title: "Tecnologia de Ponta", text: "Equipamentos e insumos certificados e de alta performance." },
          { title: "Segurança Clínica", text: "Protocolos rigorosos e acompanhamento especializado." }
        ]
      };
       if (type === "faq" && faqBase) data = { title: "Dúvidas Frequentes", items: faqBase.split("\n").map(q => ({ question: q, answer: "..." })) };
       
       if (type === "equipe_rt") {
         data = {
           eyebrow: "Quem cuida de você",
           title_html: `Conheça a Dra. <em>${siteSettings?.rt_name || "Daniele"}</em>`,
           register_label: siteSettings?.rt_register || "",
           image_url: siteSettings?.rt_image || "",
           bio: "Especialista em resultados naturais e harmonização facial de alto padrão."
         };
       }
      
      return {
        page_id: newPage.id,
        type,
        position: index + 1,
        data,
        enabled: true,
        mode: "structured"
      };
    });

    const { error: blocksErr } = await admin.from("page_blocks").insert(blocksToInsert);
    if (blocksErr) throw blocksErr;

    return new Response(
      JSON.stringify({ page_id: newPage.id, slug: newPage.slug }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-page-premium error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
