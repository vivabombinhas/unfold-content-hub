 import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 }
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders })
   }
 
   try {
     const url = new URL(req.url)
     const slug = url.searchParams.get('slug')
 
     if (!slug) {
       return new Response("Missing slug parameter", { status: 400 })
     }
 
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL') ?? '',
       Deno.env.get('SUPABASE_ANON_KEY') ?? ''
     )
 
     // 1. Buscar a página
     const { data: page, error: pageError } = await supabase
       .from('pages')
       .select('*')
       .eq('slug', slug)
       .maybeSingle()
 
     if (pageError) throw pageError
     if (!page) {
       return new Response("Page not found", { status: 404 })
     }
 
     // 2. Buscar os blocos
     const { data: blocks, error: blocksError } = await supabase
       .from('page_blocks')
       .select('*')
       .eq('page_id', page.id)
       .eq('enabled', true)
       .order('position')
 
     if (blocksError) throw blocksError
 
     // 3. Renderizar HTML
     const title = page.meta_title || page.title
     const description = page.meta_description || ""
     const siteUrl = "https://esteticabatel.com.br"
     const canonical = `${siteUrl}/${slug}/`
     const ogImage = page.metadata?.og_image || ""
 
     // Início do HTML
     let html = `<!DOCTYPE html>
 <html lang="pt-BR">
 <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>${title} · Estética Batel</title>
     <meta name="description" content="${description}">
     <link rel="canonical" href="${canonical}">
     <meta name="robots" content="index, follow">
     
     <!-- Open Graph -->
     <meta property="og:type" content="website">
     <meta property="og:url" content="${canonical}">
     <meta property="og:title" content="${title}">
     <meta property="og:description" content="${description}">
     <meta property="og:image" content="${ogImage}">
     
     <!-- Twitter -->
     <meta name="twitter:card" content="summary_large_image">
     <meta name="twitter:title" content="${title}">
     <meta name="twitter:description" content="${description}">
     <meta name="twitter:image" content="${ogImage}">
 
     <style>
         body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
         section { margin-bottom: 40px; padding: 20px; border-bottom: 1px solid #eee; }
         h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
         h2 { font-size: 1.8rem; margin-top: 2rem; }
         .eyebrow { text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.1em; color: #888; }
         .faq-item { margin-bottom: 15px; }
         summary { font-weight: bold; cursor: pointer; padding: 10px 0; }
         .json-ld { display: none; }
     </style>
 </head>
 <body>
     <article>`
 
     // Injeção de conteúdo por blocos
     const faqItems: any[] = []
     
    blocks?.forEach((block: any) => {
      const data = block.data || {}
      
      switch (block.type) {
        case 'hero':
          html += `
        <header id="hero">
            <span class="eyebrow">${data.eyebrow || 'Estética Batel'}</span>
            <h1>${data.title || page.title}</h1>
            <p>${data.paragraph || data.description || ''}</p>
            ${data.image_url ? `<img src="${data.image_url}" alt="${data.eyebrow || 'Hero image'}" style="max-width: 100%; height: auto;">` : ''}
        </header>`
          break;

        case 'faq':
          const items = Array.isArray(data.items) ? data.items : []
          if (items.length > 0) {
            html += `<section id="faq"><h2>Perguntas Frequentes</h2>`
            items.forEach((item: any) => {
              faqItems.push({ question: item.question, answer: item.answer })
              html += `
            <details class="faq-item">
                <summary>${item.question}</summary>
                <div>${item.answer}</div>
            </details>`
            })
            html += `</section>`
          }
          break;

        case 'manifesto_curto':
          html += `
        <section id="manifesto">
            <blockquote style="font-size: 1.2rem; font-style: italic; border-left: 4px solid #ccc; padding-left: 20px;">
                ${data.text || ''}
            </blockquote>
        </section>`
          break;

        case 'beneficios_grid':
          const cards = Array.isArray(data.cards) ? data.cards : []
          if (cards.length > 0) {
            html += `<section id="beneficios"><h2>Diferenciais</h2><ul>`
            cards.forEach((card: any) => {
              html += `<li><strong>${card.title}</strong>: ${card.text}</li>`
            })
            html += `</ul></section>`
          }
          break;

        default:
          if (data.title || data.eyebrow) {
             html += `<section id="${block.type}">
                ${data.eyebrow ? `<span class="eyebrow">${data.eyebrow}</span>` : ''}
                ${data.title ? `<h2>${data.title}</h2>` : ''}
             </section>`
          }
      }
    })
 
     // Adicionar Footer básico para SEO
     html += `
         <footer>
             <p>&copy; ${new Date().getFullYear()} Clínica de Estética Batel. Todos os direitos reservados.</p>
         </footer>
     </article>`
 
     // Injeção de JSON-LD
     const schemas: any[] = [
       {
         "@context": "https://schema.org",
         "@type": "MedicalProcedure",
         "name": title,
         "description": description,
         "provider": {
           "@type": "MedicalOrganization",
           "name": "Clínica de Estética Batel",
           "url": siteUrl
         }
       }
     ]
 
     if (faqItems.length > 0) {
       schemas.push({
         "@context": "https://schema.org",
         "@type": "FAQPage",
         "mainEntity": faqItems.map(item => ({
           "@type": "Question",
           "name": item.question,
           "acceptedAnswer": {
             "@type": "Answer",
             "text": item.answer
           }
         }))
       })
     }
 
     html += `
     <script type="application/ld+json">
         ${JSON.stringify(schemas, null, 2)}
     </script>
 </body>
 </html>`
 
     return new Response(html, {
       headers: {
         ...corsHeaders,
         'Content-Type': 'text/html; charset=utf-8',
       },
     })
   } catch (err) {
     return new Response(JSON.stringify({ error: err.message }), {
       status: 500,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     })
   }
 })