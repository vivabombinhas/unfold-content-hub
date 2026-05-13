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
    const fullTitle = pageTitle + " · " + siteTitle
    const description = pageData.meta_description || "Protocolos exclusivos de estética avançada na Clínica Batel, Curitiba."
    const siteUrl = "https://esteticabatel.com.br"
    const canonical = siteUrl + "/" + slug + "/"
    const shouldNoIndex = page.status !== 'published'
    
    // Extract OG Image from Hero or metadata
    const heroBlock = blocks.find((b: any) => b.type === 'hero')
    const ogImage = pageData.metadata?.og_image || heroBlock?.data?.image_url || ""

    // 4. Content Rendering logic
    let articleHtml = ""
    const faqItems: any[] = []
    const seenQuestions = new Set<string>()
    const seenAnswers = new Set<string>()

    // 4. Compliance & Filters
    const applyCompliance = (text: string) => {
      if (!text) return ""
      return text
        .replace(/(dermatologistas|cirurgiões plásticos|médicos dermatologistas)/gi, 'profissionais de saúde especializados')
        .replace(/Dra\.?\s+Daniele\s+Batel/gi, 'Dra. Daniele Florêncio')
        .replace(/Dra\.?\s+Daniele\s+Batel/gi, 'Dra. Daniele Florêncio') // Double check
        .replace(/risco\s+à\s+vida/gi, 'riscos clínicos controlados')
        .replace(/Nossa\s+Garantia/gi, 'Compromisso de Excelência')
    }

    const isProhibited = (text: string) => {
      if (!text) return false
      const lower = text.toLowerCase()
      // If "nossa garantia" or "risco à vida" appears in a way that shouldn't just be replaced but the whole block skipped
      return false // We prefer replacing now to avoid empty sections
    }

    blocks.forEach((block: any) => {
      const data = block.data || {}
      const type = block.type

      switch (type) {
        case 'hero': {
          const eyebrow = applyCompliance(data.eyebrow || 'Estética Batel')
          const heroTitle = applyCompliance(data.title || pageData.title)
          const heroPara = applyCompliance(data.paragraph || data.description || '')
          
          articleHtml += '<header id="hero" class="block-section hero-section">\n' +
            '  <div class="container">\n' +
            '    <span class="eyebrow">' + eyebrow + '</span>\n' +
            '    <h1>' + heroTitle + '</h1>\n' +
            '    <p class="lead">' + heroPara + '</p>\n' +
            '    ' + (data.image_url ? '<div class="hero-image"><img src="' + data.image_url + '" alt="' + (data.eyebrow || pageData.title) + '" loading="eager" fetchpriority="high"></div>' : '') + '\n' +
            '  </div>\n' +
            '</header>\n';
          break
        }
          break

        case 'manifesto_curto':
          if (data.text) {
            articleHtml += '<section id="manifesto" class="block-section manifesto-section">\n' +
              '  <div class="container">\n' +
              '    <blockquote class="manifesto-quote">' + applyCompliance(data.text) + '</blockquote>\n' +
              '  </div>\n' +
              '</section>\n';
          }
          break

        case 'beneficios_grid': {
          const cards = Array.isArray(data.cards) ? data.cards.filter((c: any) => c.title || c.text) : []
          if (cards.length > 0) {
            articleHtml += '<section id="beneficios" class="block-section beneficios-section">\n' +
              '  <div class="container">\n' +
              '    <span class="eyebrow">' + applyCompliance(data.eyebrow || 'Diferenciais') + '</span>\n' +
              '    <h2>' + applyCompliance(data.title || 'Por que escolher a Estética Batel') + '</h2>\n' +
              '    <div class="grid">\n' +
              '      ' + cards.map((card: any, idx: number) => 
                '<div class="card">\n' +
                '  <span class="card-num">' + (idx + 1).toString().padStart(2, '0') + '</span>\n' +
                '  <h3>' + applyCompliance(card.title || '') + '</h3>\n' +
                '  <p>' + applyCompliance(card.text || '') + '</p>\n' +
                '</div>\n'
              ).join('') + '\n' +
              '    </div>\n' +
              '  </div>\n' +
              '</section>\n';
          }
          break
        }

         case 'faq': {
           const rawItems = Array.isArray(data.items) ? data.items : []
           const currentBlockItems: any[] = []
           
           rawItems.forEach((item: any) => {
             if (!item.question || !item.answer) return
             
             const q = applyCompliance(item.question.trim())
             const a = applyCompliance(item.answer.trim())
             const normalizedQ = q.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 100)
             const normalizedA = a.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 100)
             
             if (!seenQuestions.has(normalizedQ) && !seenAnswers.has(normalizedA)) {
               seenQuestions.add(normalizedQ)
               seenAnswers.add(normalizedA)
               
               currentBlockItems.push({ question: q, answer: a })
               faqItems.push({ question: q, answer: a })
             }
           })

           if (currentBlockItems.length > 0) {
             articleHtml += '<section id="faq" class="block-section faq-section">\n' +
               '  <div class="container">\n' +
               '    <h2>Perguntas Frequentes</h2>\n' +
               '    <div class="faq-list">\n' +
               '      ' + currentBlockItems.map((item: any) => {
                 return '<details class="faq-item">\n' +
                   '  <summary>' + item.question + '</summary>\n' +
                   '  <div class="faq-content">' + item.answer + '</div>\n' +
                   '</details>\n'
               }).join('') + '\n' +
               '    </div>\n' +
               '  </div>\n' +
               '</section>\n';
           }
           break
         }

        case 'procedimento_detalhado':
        case 'procedimento_detalhado_v2': {
          const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs.filter((p: string) => p && p.trim()) : []
          const procDesc = data.description ? applyCompliance(data.description) : null
          if (procDesc || paragraphs.length > 0) {
            articleHtml += '<section id="detalhes" class="block-section details-section">\n' +
              '  <div class="container">\n' +
              '    <span class="eyebrow">' + applyCompliance(data.eyebrow || 'Protocolo') + '</span>\n' +
              '    <h2>' + applyCompliance(data.title || 'O procedimento detalhado') + '</h2>\n' +
              '    ' + (procDesc ? '<p>' + procDesc + '</p>' : '') + '\n' +
              '    ' + paragraphs.map((p: string) => '<p>' + applyCompliance(p) + '</p>').join('') + '\n' +
              '  </div>\n' +
              '</section>\n';
          }
          break
        }

        case 'equipe_rt': {
          const name = "Dra. Daniele Florêncio"
          const register = "Biomédica · CRBM 8242-PR"
          articleHtml += '<section id="rt" class="block-section rt-section">\n' +
            '  <div class="container">\n' +
            '    <span class="eyebrow">' + (data.eyebrow || 'Responsável Técnica') + '</span>\n' +
            '    <h2>' + name + '</h2>\n' +
            '    <p class="register">' + register + '</p>\n' +
            '    <div class="byline">\n' +
            '      <span>Publicado em: ' + new Date().toLocaleDateString('pt-BR') + '</span>\n' +
            '      <span> · Revisão Clínica: ' + name + '</span>\n' +
            '    </div>\n' +
            '    <p>' + (data.description || 'Especialista em procedimentos de alta performance com mais de duas décadas de experiência.') + '</p>\n' +
            '    <div class="disclaimer-mini">\n' +
            '      <p>* Resultados podem variar de acordo com o organismo e avaliação clínica individual.</p>\n' +
            '    </div>\n' +
            '  </div>\n' +
            '</section>\n';
          break
        }

        default: {
          // Generic section for unhandled blocks with titles
          const genDesc = data.description || data.text
          const hasContent = genDesc || (Array.isArray(data.cards) && data.cards.length > 0) || (Array.isArray(data.items) && data.items.length > 0)
          if ((data.title || data.eyebrow) && hasContent) {
            articleHtml += '<section class="block-section generic-section">\n' +
              '  <div class="container">\n' +
              '    ' + (data.eyebrow ? '<span class="eyebrow">' + applyCompliance(data.eyebrow) + '</span>' : '') + '\n' +
              '    ' + (data.title ? '<h2>' + applyCompliance(data.title) + '</h2>' : '') + '\n' +
              '    ' + (genDesc ? '<p>' + applyCompliance(genDesc) + '</p>' : '') + '\n' +
              '  </div>\n' +
              '</section>\n';
          }
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
    const html = '<!DOCTYPE html>\n' +
'<html lang="pt-BR">\n' +
'<head>\n' +
'    <meta charset="UTF-8">\n' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'    <title>' + fullTitle + '</title>\n' +
'    <meta name="description" content="' + description + '">\n' +
'    <link rel="canonical" href="' + canonical + '">\n' +
'    <meta name="robots" content="' + (shouldNoIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large') + '">\n' +
'    \n' +
'    <!-- Open Graph -->\n' +
'    <meta property="og:type" content="website">\n' +
'    <meta property="og:url" content="' + canonical + '">\n' +
'    <meta property="og:title" content="' + fullTitle + '">\n' +
'    <meta property="og:description" content="' + description + '">\n' +
'    ' + (ogImage ? '<meta property="og:image" content="' + ogImage + '">' : '') + '\n' +
'    <meta property="og:site_name" content="Estética Batel">\n' +
'    \n' +
'    <!-- Twitter -->\n' +
'    <meta name="twitter:card" content="summary_large_image">\n' +
'    <meta name="twitter:title" content="' + fullTitle + '">\n' +
'    <meta name="twitter:description" content="' + description + '">\n' +
'    ' + (ogImage ? '<meta name="twitter:image" content="' + ogImage + '">' : '') + '\n' +
'\n' +
'    <style>\n' +
'        :root { --gold: #c5a059; --black: #050505; --graphite: #1a1a1a; --text: #e5e5e5; --text-muted: #a0a0a0; }\n' +
'        body { background: var(--black); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 0; }\n' +
'        .container { max-width: 1000px; margin: 0 auto; padding: 0 24px; }\n' +
'        .block-section { padding: 80px 0; border-bottom: 1px solid rgba(197, 160, 89, 0.1); }\n' +
'        .eyebrow { color: var(--gold); text-transform: uppercase; font-size: 12px; letter-spacing: 0.2em; display: block; margin-bottom: 16px; }\n' +
'        h1 { font-size: 3rem; line-height: 1.1; margin: 0 0 24px; font-weight: 700; color: white; }\n' +
'        h2 { font-size: 2.2rem; line-height: 1.2; margin: 0 0 32px; color: white; }\n' +
'        h3 { color: var(--gold); font-size: 1.5rem; margin: 0 0 12px; }\n' +
'        p { margin: 0 0 16px; color: var(--text-muted); }\n' +
'        .lead { font-size: 1.25rem; color: var(--text); }\n' +
'        .hero-section { background: radial-gradient(circle at 70% 20%, rgba(197, 160, 89, 0.08), transparent 50%); }\n' +
'        .hero-image img { max-width: 100%; height: auto; border: 1px solid rgba(197, 160, 89, 0.2); margin-top: 40px; }\n' +
'        .manifesto-quote { font-size: 1.5rem; font-style: italic; border-left: 2px solid var(--gold); padding-left: 32px; margin: 0; color: var(--text); }\n' +
'        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px; }\n' +
'        .card { background: var(--graphite); padding: 32px; border: 1px solid rgba(197, 160, 89, 0.1); position: relative; overflow: hidden; }\n' +
'        .card-num { position: absolute; bottom: -10px; right: -5px; font-size: 5rem; font-style: italic; opacity: 0.05; font-weight: 900; }\n' +
'        .faq-item { margin-bottom: 8px; background: var(--graphite); }\n' +
'        summary { padding: 20px; cursor: pointer; font-weight: 600; color: white; outline: none; }\n' +
'         .faq-content { padding: 0 20px 20px; color: var(--text-muted); }\n' +
'         .register { color: var(--gold); font-size: 0.9rem; margin-top: -20px; margin-bottom: 20px; font-weight: 600; }\n' +
'         .byline { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 24px; border-bottom: 1px solid rgba(197,160,89,0.1); padding-bottom: 8px; }\n' +
'         .disclaimer-mini { font-size: 0.75rem; color: var(--text-muted); margin-top: 32px; font-style: italic; }\n' +
'         footer { padding: 40px 0; text-align: center; font-size: 14px; color: var(--text-muted); }\n' +
'        @media (max-width: 768px) { h1 { font-size: 2.2rem; } h2 { font-size: 1.8rem; } }\n' +
'    </style>\n' +
'\n' +
'    <script type="application/ld+json">\n' +
'        ' + JSON.stringify(schemas, null, 2) + '\n' +
'    </script>\n' +
'</head>\n' +
'<body>\n' +
'    <article>\n' +
'        ' + articleHtml + '\n' +
'        <footer>\n' +
'            <div class="container">\n' +
'                <p>&copy; ' + new Date().getFullYear() + ' Clínica de Estética Batel. Todos os direitos reservados.</p>\n' +
'                <p>Curitiba - Paraná</p>\n' +
'            </div>\n' +
'        </footer>\n' +
'    </article>\n' +
'</body>\n' +
'</html>';

    return new Response(html, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-SSR-Version': '1.1.0',
        'X-SSR-Status': 'Compliance-Active',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
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
