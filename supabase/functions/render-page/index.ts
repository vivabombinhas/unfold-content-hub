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

    // 1. Fetch Page Data
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (pageError) {
      console.error(`Error fetching page ${slug}:`, pageError)
      throw pageError
    }
    if (!page) {
      return new Response("Page not found", { status: 404 })
    }

    // 2. Determine which blocks to use (Published Snapshot vs Live)
    let blocks = []
    let pageData = page

    if (page.status === 'published' && page.published_snapshot) {
      const snapshot = page.published_snapshot
      pageData = snapshot.page || page
      blocks = snapshot.blocks || []
    } else {
      // If not published or no snapshot, fetch live blocks
      const { data: liveBlocks, error: blocksError } = await supabase
        .from('page_blocks')
        .select('*')
        .eq('page_id', page.id)
        .eq('enabled', true)
        .order('position')
      
      if (blocksError) throw blocksError
      blocks = liveBlocks || []
    }

    // 3. Metadata Setup
    const siteTitle = "Clínica de Estética Batel · Curitiba"
    const pageTitle = pageData.meta_title || pageData.title || "Tratamento"
    const fullTitle = `${pageTitle} · ${siteTitle}`
    const description = pageData.meta_description || "Protocolos exclusivos de estética avançada na Clínica Batel, Curitiba."
    const siteUrl = "https://esteticabatel.com.br"
    const canonical = `${siteUrl}/${slug}/`
    const shouldNoIndex = page.status !== 'published'
    
    // Extract OG Image from Hero or metadata
    const heroBlock = blocks.find((b: any) => b.type === 'hero')
    const ogImage = pageData.metadata?.og_image || heroBlock?.data?.image_url || ""

    // 4. Content Rendering logic
    let articleHtml = ""
    const faqItems: any[] = []

    blocks.forEach((block: any) => {
      const data = block.data || {}
      const type = block.type

      switch (type) {
        case 'hero':
          articleHtml += `
            <header id="hero" class="block-section hero-section">
              <div class="container">
                <span class="eyebrow">${data.eyebrow || 'Estética Batel'}</span>
                <h1>${data.title || pageData.title}</h1>
                <p class="lead">${data.paragraph || data.description || ''}</p>
                ${data.image_url ? \`<div class="hero-image"><img src="\${data.image_url}" alt="\${data.eyebrow || pageData.title}" loading="eager" fetchpriority="high"></div>\` : ''}
              </div>
            </header>`
          break

        case 'manifesto_curto':
          articleHtml += `
            <section id="manifesto" class="block-section manifesto-section">
              <div class="container">
                <blockquote class="manifesto-quote">${data.text || ''}</blockquote>
              </div>
            </section>`
          break

        case 'beneficios_grid':
          const cards = Array.isArray(data.cards) ? data.cards : []
          if (cards.length > 0) {
            articleHtml += `
              <section id="beneficios" class="block-section beneficios-section">
                <div class="container">
                  <span class="eyebrow">${data.eyebrow || 'Diferenciais'}</span>
                  <h2>${data.title || 'Por que escolher a Estética Batel'}</h2>
                  <div class="grid">
                    \${cards.map((card: any, idx: number) => \`
                      <div class="card">
                        <span class="card-num">\${(idx + 1).toString().padStart(2, '0')}</span>
                        <h3>\${card.title || ''}</h3>
                        <p>\${card.text || ''}</p>
                      </div>
                    \`).join('')}
                  </div>
                </div>
              </section>`
          }
          break

         case 'faq': {
           const rawItems = Array.isArray(data.items) ? data.items : []
           const uniqueItems: any[] = []
           const seenQuestions = new Set<string>()
           const seenAnswers = new Set<string>()
           
           rawItems.forEach((item: any) => {
             if (!item.question || !item.answer) return
             const normalizedQ = item.question.trim().toLowerCase().replace(/[?]/g, '').substring(0, 100)
             const normalizedA = item.answer.trim().toLowerCase().substring(0, 100)
             
             if (!seenQuestions.has(normalizedQ) && !seenAnswers.has(normalizedA)) {
               seenQuestions.add(normalizedQ)
               seenAnswers.add(normalizedA)
               uniqueItems.push(item)
             }
           })

           if (uniqueItems.length > 0) {
             articleHtml += `
               <section id="faq" class="block-section faq-section">
                 <div class="container">
                   <h2>Perguntas Frequentes</h2>
                   <div class="faq-list">
                     \${uniqueItems.map((item: any) => {
                       // Filter compliance: remove mention of dermatologist/plastic surgeon
                       const sanitizedAnswer = item.answer.replace(
                         /(dermatologistas|cirurgiões plásticos|médicos dermatologistas)/gi, 
                         'profissionais de saúde especializados'
                       )
                       faqItems.push({ question: item.question, answer: sanitizedAnswer })
                       return \`
                         <details class="faq-item">
                           <summary>\${item.question}</summary>
                           <div class="faq-content">\${sanitizedAnswer}</div>
                         </details>\`
                     }).join('')}
                   </div>
                 </div>
               </section>`
           }
           break
         }

        case 'procedimento_detalhado':
        case 'procedimento_detalhado_v2':
          if (data.description || (Array.isArray(data.paragraphs) && data.paragraphs.length > 0)) {
            articleHtml += `
              <section id="detalhes" class="block-section details-section">
                <div class="container">
                  <span class="eyebrow">${data.eyebrow || 'Protocolo'}</span>
                  <h2>${data.title || 'O procedimento detalhado'}</h2>
                  ${data.description ? \`<p>\${data.description}</p>\` : ''}
                  \${Array.isArray(data.paragraphs) ? data.paragraphs.map((p: string) => \`<p>\${p}</p>\`).join('') : ''}
                </div>
              </section>`
          }
          break

        case 'equipe_rt': {
          const name = "Dra. Daniele Florêncio"
          const register = "Biomédica · CRBM 8242-PR"
          articleHtml += `
            <section id="rt" class="block-section rt-section">
              <div class="container">
                <span class="eyebrow">${data.eyebrow || 'Responsável Técnica'}</span>
                <h2>\${name}</h2>
                <p class="register">\${register}</p>
                <div class="byline">
                  <span>Publicado em: \${new Date().toLocaleDateString('pt-BR')}</span>
                  <span> · Revisão Clínica: Dra. Daniele Florêncio</span>
                </div>
                <p>${data.description || 'Especialista em procedimentos de alta performance com mais de duas décadas de experiência.'}</p>
                <div class="disclaimer-mini">
                  <p>* Resultados podem variar de acordo com o organismo e avaliação clínica individual.</p>
                </div>
              </div>
            </section>`
          break
        }

        default:
          // Generic section for unhandled blocks with titles
          if ((data.title || data.eyebrow) && (data.description || data.text || (Array.isArray(data.cards) && data.cards.length > 0) || (Array.isArray(data.items) && data.items.length > 0))) {
            articleHtml += `
              <section class="block-section generic-section">
                <div class="container">
                  \${data.eyebrow ? \`<span class="eyebrow">\${data.eyebrow}</span>\` : ''}
                  \${data.title ? \`<h2>\${data.title}</h2>\` : ''}
                  \${data.description || data.text ? \`<p>\${data.description || data.text}</p>\` : ''}
                </div>
              </section>`
          }
      }
    })

    // 5. Schema.org (JSON-LD)
     const schemas: any[] = [
       {
         "@context": "https://schema.org",
         "@type": "MedicalProcedure",
         "name": pageTitle,
         "description": description,
         "procedureType": "NonInvasiveProcedure",
         "bodyLocation": pageData.metadata?.area_anatomica || "Corpo",
         "provider": {
           "@type": "MedicalOrganization",
           "name": "Clínica de Estética Batel",
           "url": siteUrl,
           "logo": "https://esteticabatel.com.br/logo.png",
           "address": {
             "@type": "PostalAddress",
             "addressLocality": "Curitiba",
             "addressRegion": "PR",
             "addressCountry": "BR"
           }
         },
         "performer": {
           "@type": "Person",
           "name": "Dra. Daniele Florêncio",
           "jobTitle": "Biomédica",
           "identifier": "CRBM 8242-PR"
         }
       },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Início",
            "item": siteUrl
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": pageTitle,
            "item": canonical
          }
        ]
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

    // 6. Build Final HTML
    const html = \`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>\${fullTitle}</title>
    <meta name="description" content="\${description}">
    <link rel="canonical" href="\${canonical}">
    <meta name="robots" content="\${shouldNoIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}">
    
    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="\${canonical}">
    <meta property="og:title" content="\${fullTitle}">
    <meta property="og:description" content="\${description}">
    \${ogImage ? \`<meta property="og:image" content="\${ogImage}">\` : ''}
    <meta property="og:site_name" content="Estética Batel">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="\${fullTitle}">
    <meta name="twitter:description" content="\${description}">
    \${ogImage ? \`<meta name="twitter:image" content="\${ogImage}">\` : ''}

    <style>
        :root { --gold: #c5a059; --black: #050505; --graphite: #1a1a1a; --text: #e5e5e5; --text-muted: #a0a0a0; }
        body { background: var(--black); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 0; }
        .container { max-width: 1000px; margin: 0 auto; padding: 0 24px; }
        .block-section { padding: 80px 0; border-bottom: 1px solid rgba(197, 160, 89, 0.1); }
        .eyebrow { color: var(--gold); text-transform: uppercase; font-size: 12px; letter-spacing: 0.2em; display: block; margin-bottom: 16px; }
        h1 { font-size: 3rem; line-height: 1.1; margin: 0 0 24px; font-weight: 700; color: white; }
        h2 { font-size: 2.2rem; line-height: 1.2; margin: 0 0 32px; color: white; }
        h3 { color: var(--gold); font-size: 1.5rem; margin: 0 0 12px; }
        p { margin: 0 0 16px; color: var(--text-muted); }
        .lead { font-size: 1.25rem; color: var(--text); }
        .hero-section { background: radial-gradient(circle at 70% 20%, rgba(197, 160, 89, 0.08), transparent 50%); }
        .hero-image img { max-width: 100%; height: auto; border: 1px solid rgba(197, 160, 89, 0.2); margin-top: 40px; }
        .manifesto-quote { font-size: 1.5rem; font-style: italic; border-left: 2px solid var(--gold); padding-left: 32px; margin: 0; color: var(--text); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px; }
        .card { background: var(--graphite); padding: 32px; border: 1px solid rgba(197, 160, 89, 0.1); position: relative; overflow: hidden; }
        .card-num { position: absolute; bottom: -10px; right: -5px; font-size: 5rem; font-style: italic; opacity: 0.05; font-weight: 900; }
        .faq-item { margin-bottom: 8px; background: var(--graphite); }
        summary { padding: 20px; cursor: pointer; font-weight: 600; color: white; outline: none; }
         .faq-content { padding: 0 20px 20px; color: var(--text-muted); }
         .register { color: var(--gold); font-size: 0.9rem; margin-top: -20px; margin-bottom: 20px; font-weight: 600; }
         .byline { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 24px; border-bottom: 1px solid rgba(197,160,89,0.1); padding-bottom: 8px; }
         .disclaimer-mini { font-size: 0.75rem; color: var(--text-muted); margin-top: 32px; font-style: italic; }
         footer { padding: 40px 0; text-align: center; font-size: 14px; color: var(--text-muted); }
        @media (max-width: 768px) { h1 { font-size: 2.2rem; } h2 { font-size: 1.8rem; } }
    </style>

    <script type="application/ld+json">
        \${JSON.stringify(schemas, null, 2)}
    </script>
</head>
<body>
    <article>
        \${articleHtml}
        <footer>
            <div class="container">
                <p>&copy; \${new Date().getFullYear()} Clínica de Estética Batel. Todos os direitos reservados.</p>
                <p>Curitiba - Paraná</p>
            </div>
        </footer>
    </article>
</body>
</html>\`

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=3600', // Cache for 1 hour on CDN
      },
    })
  } catch (err) {
    console.error("Critical Render Error:", err)
    return new Response(JSON.stringify({ 
      error: "Internal Server Error during rendering",
      message: err.message,
      stack: err.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
