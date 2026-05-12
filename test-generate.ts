const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const researchData = {
  research: {
    duvidas: ["O que é?", "Como funciona?", "Dói?"],
    objecoes: ["Medo de agulha", "Preço"],
    termos: ["Ácido Hialurônico", "Diamante"],
    angulos: ["Brilho", "Volume"],
    publico_alvo: "Mulheres que buscam lábios radiantes",
    area_anatomica: "labios"
  },
  old_page_content: {
    faqs: [
      { question: "O que é a diamantação labial?", answer: "A diamantação labial é um procedimento estético..." },
      { question: "A diamantação labial é dolorosa?", answer: "A maioria dos pacientes relata apenas um leve desconforto..." }
    ],
    sections: [
      { title: "Diamantação Labial: Beleza e Brilho Para Seus Lábios", body: "A diamantação labial ilumina seu sorriso..." }
    ],
    images: [
      { url: "https://esteticabatel.com.br/wp-content/uploads/2024/06/clinica-batel.png", alt: "logo" }
    ]
  }
};

const payload = {
  tema: "Diamantação Labial",
  slug: "diamantacao-labial",
  research: researchData.research,
  own_old_page: true,
  old_page_content: researchData.old_page_content,
  allow_ai_only_fallback: true
};

try {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-page-from-topic`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log("Result:", text);
} catch (e) {
  console.error("Error:", e);
}
