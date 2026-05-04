 import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
 import { handler } from "./index.ts";
 
 // Mocking environment variables
 Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
 Deno.env.set("SUPABASE_ANON_KEY", "mock-key");
 Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "mock-key");
 Deno.env.set("LOVABLE_API_KEY", "mock-key");
 
 // Mock fetch globally
 const originalFetch = globalThis.fetch;
 
 function mockFetch(responses: Record<string, any>) {
   globalThis.fetch = async (input: string | URL | Request) => {
     const url = input.toString();
     for (const [key, value] of Object.entries(responses)) {
       if (url.includes(key)) {
         return new Response(JSON.stringify(value), { status: 200 });
       }
     }
     return new Response(JSON.stringify({ error: "Not found in mock" }), { status: 404 });
   };
 }
 
 function createReq(body: any) {
   return new Request("http://localhost", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       "Authorization": "Bearer mock-token"
     },
     body: JSON.stringify(body)
   });
 }
 
 Deno.test("extract-block-content: simple text paste identifies benefits (fallback)", async () => {
   mockFetch({
     "/auth/v1/user": { data: { user: { id: "user-1" } } },
     "/rest/v1/user_roles": [{ role: "admin" }],
     "ai.gateway.lovable.dev": {
       choices: [{
         message: {
           tool_calls: [{
             function: {
               name: "registrar_blocos",
               arguments: JSON.stringify({ sections: [] })
             }
           }]
         }
       }]
     }
   });
 
   const text = `Rejuvenescimento Seguro
 Procedimento confiável com resultados naturais e duradouros.
 
 Recuperação Rápida
 Volte às suas atividades quase imediatamente.`;
 
   const req = createReq({ text });
   const res = await handler(req);
   const data = await res.json();
 
   assertEquals(res.status, 200);
   assertExists(data.sections);
   assertEquals(data.sections.length, 1);
   assertEquals(data.sections[0].target_type, "beneficios_grid");
   assertEquals(data.sections[0].data.cards.length, 2);
   assertEquals(data.sections[0].data.cards[0].title, "Rejuvenescimento Seguro");
 });
 
 Deno.test("extract-block-content: URL extraction identifies content", async () => {
   mockFetch({
     "/auth/v1/user": { data: { user: { id: "user-1" } } },
     "/rest/v1/user_roles": [{ role: "admin" }],
     "api.firecrawl.dev": {
       data: {
         markdown: "## Procedimento\nComo funciona o skinbooster.",
         html: "<div>...</div>"
       }
     },
     "ai.gateway.lovable.dev": {
       choices: [{
         message: {
           tool_calls: [{
             function: {
               name: "registrar_blocos",
               arguments: JSON.stringify({ 
                 sections: [{
                   suggested_label: "Procedimento",
                   target_type: "procedimento_detalhado_v2",
                   data: { title_html: "Como <em>funciona</em>" }
                 }] 
               })
             }
           }]
         }
       }]
     }
   });
 
   const req = createReq({ url: "https://example.com/test" });
   const res = await handler(req);
   const data = await res.json();
 
   assertEquals(res.status, 200);
   assertEquals(data.sections.length, 1);
   assertEquals(data.sections[0].target_type, "procedimento_detalhado_v2");
   assertEquals(data.debug.url_accessed, true);
 });
 
 Deno.test("extract-block-content: returns empty sections but diagnostic if no content", async () => {
    mockFetch({
      "/auth/v1/user": { data: { user: { id: "user-1" } } },
      "/rest/v1/user_roles": [{ role: "admin" }]
    });
 
    const req = createReq({ text: "" });
    const res = await handler(req);
    const data = await res.json();
 
    assertEquals(data.sections.length, 0);
    assertExists(data.error_details);
    assertEquals(data.error_details.message, "Conteúdo vazio ou inacessível.");
 });