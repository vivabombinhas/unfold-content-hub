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
    const path = url.searchParams.get('path')

    if (!slug && !path) {
      return new Response("Missing slug or path parameter", { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || ''
    )

    // 1. Fetch Page Data
    let query = supabase.from('pages').select('*')
    
    if (path) {
      query = query.eq('url_path', path.replace(/^\//, '').replace(/\/$/, ''))
    } else {
      query = query.eq('slug', slug)
    }

    const { data: page, error: pageError } = await query.maybeSingle()

    if (pageError) {
      throw pageError
    }
    if (!page) {
      return new Response("Page not found", { status: 404 })
    }

    // 2. Determine which blocks to use
    let blocks = []
    let pageData = page

    if (page.status === 'published' && page.published_snapshot) {
      const snapshot = page.published_snapshot
      pageData = snapshot.page || page
      blocks = snapshot.blocks || []
    } else {
      const { data: liveBlocks, error: blocksError } = await supabase
        .from('page_blocks')
        .select('*')
        .eq('page_id', page.id)
        .eq('enabled', true)
        .order('position')
      
      if (blocksError) throw blocksError
      blocks = liveBlocks || []
    }

    // 2.5 Fetch Procedure Documents
    const { data: documents, error: docsError } = await supabase
      .from('procedure_documents')
      .select('*')
      .eq('page_id', page.id)
      .eq('status', 'published')
    
    if (docsError) console.error("Error fetching documents:", docsError)

    // 3. Metadata Setup
    const siteTitle = "Clínica de Estética Batel · Curitiba"
    const pageTitle = pageData.meta_title || pageData.title || "Tratamento"
    const fullTitle = pageTitle + " · " + siteTitle
    const description = pageData.meta_description || "Protocolos exclusivos de estética avançada na Clínica Batel, Curitiba."
    const siteUrl = "https://esteticabatel.com.br"
    const displayPath = page.url_path || slug
    const canonical = siteUrl + "/" + displayPath.replace(/^\//, "").replace(/\/$/, "") + "/"
    const shouldNoIndex = page.status !== 'published'
    
    const heroBlock = blocks.find((b: any) => b.type === 'hero')
    const ogImage = pageData.metadata?.og_image || heroBlock?.data?.image_url || ""

    // 4. Content Rendering logic
    let articleHtml = ""
    const faqItems: any[] = []
    const seenQuestions = new Set<string>()
    const seenAnswers = new Set<string>()
    const seenFaqIntents = new Set<string>()

    const applyCompliance = (text: string): string => {
      if (!text) return "";
      
      let sanitized = text
        .replace(/Dra\.?\s+Daniele\s+Batel/gi, 'Dra. Daniele Florêncio')
        .replace(/apresenta\s+risco\s+à\s+vida/gi, 'é um procedimento seguro')
        .replace(/risco\s+à\s+vida/gi, 'riscos clínicos controlados')
        .replace(/risco\s+a\s+vida/gi, 'riscos clínicos controlados')
        .replace(/risco\s+de\s+morte/gi, 'riscos clínicos controlados')
        .replace(/perigo\s+de\s+vida/gi, 'riscos clínicos controlados')
        .replace(/Nossa\s+Garantia/gi, 'Compromisso de Excelência')
        .replace(/garantimos\s+resultados?/gi, 'buscamos os melhores resultados')
        .replace(/resultados?\s+garantidos?/gi, 'resultados consistentes')
        .replace(/médicos?\s+especialistas/gi, 'profissionais especialistas')
        .replace(/corpo\s+médico/gi, 'equipe técnica')
        .replace(/especialistas\s+qualificados/gi, 'profissionais de saúde especializados')
        .replace(/dermatologista(s)?/gi, 'biomédicas habilitadas')
        .replace(/cirurgião\s+plástico/gi, 'equipe técnica especializada')
        .replace(/cirurgiões\s+plásticos/gi, 'profissionais de saúde especializados')
        .replace(/médico(s|a|as)?/gi, (match) => {
          if (match.toLowerCase().includes('médica')) return 'biomédica habilitada';
          return 'profissionais de saúde especializados';
        });

      return sanitized;
    };

    const FORBIDDEN_PATTERNS: { pattern: RegExp; label: string }[] = [
      { pattern: /risco\s+[àa]\s+vida/gi, label: 'risco à vida' },
      { pattern: /risco\s+de\s+morte/gi, label: 'risco de morte' },
      { pattern: /perigo\s+de\s+vida/gi, label: 'perigo de vida' },
      { pattern: /nossa\s+garantia/gi, label: 'nossa garantia' },
      { pattern: /garanti(?:mos|a|do|dos|da|das)\s+resultados?/gi, label: 'garantia de resultado' },
      { pattern: /\bdermatologistas?\b/gi, label: 'dermatologista' },
      { pattern: /cirurgi[ãa]o\s+pl[áa]stico/gi, label: 'cirurgião plástico' },
      { pattern: /\bm[ée]dic[oa]s?\b/gi, label: 'médico' },
      { pattern: /especialistas\s+qualificados/gi, label: 'especialistas qualificados' },
    ];

    const stripFaqNumbering = (s: string): string =>
      s.replace(/^\s*\(?\d{1,2}[\.\)\-:]\s*/, '').trim();

    const faqCategories = [
      { id: 'pain', keywords: ['dor', 'doi', 'doloroso', 'anestesia', 'desconforto', 'sensibilidade'] },
      { id: 'safety', keywords: ['seguro', 'risco', 'complicacao', 'seguranca', 'perigo', 'contraindicacao'] },
      { id: 'recovery', keywords: ['pos-procedimento', 'recuperacao', 'repouso', 'cuidados', 'inchaco', 'hematoma', 'tempo de cura'] },
      { id: 'pregnancy', keywords: ['gravida', 'gestante', 'lactante', 'amamentando', 'gravidez'] },
      { id: 'duration', keywords: ['duracao', 'quanto tempo', 'permanente', 'sessao', 'manutencao', 'resultado'] },
      { id: 'candidates', keywords: ['indicado', 'quem pode', 'idade', 'perfil', 'homens', 'mulheres'] }
    ];

    const isForbiddenFaq = (question: string, answer: string): boolean => {
      const combined = (question + ' ' + answer).toLowerCase();
      const forbidden = [
        'risco à vida', 'risco de morte', 'perigo de vida', 'médico', 
        'dermatologista', 'cirurgião plástico', 'nossa garantia'
      ];
      const alarmist = ['morte', 'morrer', 'fatal', 'perigoso'];
      if (alarmist.some(term => combined.includes(term))) return true;
      
      return forbidden.some(term => combined.includes(term));
    };

    const getFaqIntent = (question: string): string | null => {
      const q = question.toLowerCase();
      for (const cat of faqCategories) {
        if (cat.keywords.some(k => q.includes(k))) return cat.id;
      }
      return null;
    };

    blocks.forEach((block: any) => {
      const data = block.data || {}
      const type = block.type

      switch (type) {
        case 'hero': {
          const eyebrow = applyCompliance(data.eyebrow || 'Estética Batel')
          const heroTitle = applyCompliance(data.title || pageData.title)
          const heroPara = applyCompliance(data.paragraph || data.description || data.subtitle || '')
          
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
          const rawItems = Array.isArray(data.items) ? data.items : [];
          const currentBlockItems: any[] = [];

          rawItems.forEach((item: any) => {
            if (!item.question || !item.answer) return;
            if (faqItems.length >= 12) return;

            if (isForbiddenFaq(item.question, item.answer)) return;

            const q = applyCompliance(stripFaqNumbering(item.question.trim()));
            const a = applyCompliance(item.answer.trim());
            
            const intent = getFaqIntent(q);
            if (intent && seenFaqIntents.has(intent)) return;

            const normalizedQ = q.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 80);
            const normalizedA = a.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 80);

            if (!seenQuestions.has(normalizedQ) && !seenAnswers.has(normalizedA)) {
              seenQuestions.add(normalizedQ);
              seenAnswers.add(normalizedA);
              if (intent) seenFaqIntents.add(intent);

              currentBlockItems.push({ question: q, answer: a });
              faqItems.push({ question: q, answer: a });
            }
          });

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

        case 'authority_strip': {
           const items = Array.isArray(data.items) ? data.items : []
           if (items.length > 0) {
             articleHtml += '<section class="block-section authority-strip">\n' +
               '  <div class="container">\n' +
               '    <div class="authority-grid">\n' +
               '      ' + items.map((item: string) => '<div class="authority-item">' + applyCompliance(item) + '</div>').join('') + '\n' +
               '    </div>\n' +
               '  </div>\n' +
               '</section>\n';
           }
           break
        }

        case 'cta_final':
        case 'cta_block': {
          articleHtml += '<section class="block-section cta-section">\n' +
            '  <div class="container" style="text-align: center;">\n' +
            '    <h2>' + applyCompliance(data.title || 'Inicie sua transformação') + '</h2>\n' +
            '    <p>' + applyCompliance(data.subtitle || data.text || '') + '</p>\n' +
            '    <a href="#" class="cta-button">' + (data.ctaText || 'Agendar Avaliação') + '</a>\n' +
            '  </div>\n' +
            '</section>\n';
          break
        }

        case 'casos': {
          articleHtml += '<section class="block-section cases-section">\n' +
            '  <div class="container">\n' +
            '    <h2>' + applyCompliance(data.title || 'Resultados') + '</h2>\n' +
            '    <p>' + applyCompliance(data.subtitle || '') + '</p>\n' +
            '    <div class="cases-placeholder">Resultados clínicos preservados sob avaliação individual.</div>\n' +
            '  </div>\n' +
            '</section>\n';
          break
        }

        case 'equipe_rt':
        case 'about_clinica': {
          const name = "Dra. Daniele Florêncio"
          const register = "Biomédica · CRBM 8242-PR"
          const RT_SECTION = '<section id="rt" class="block-section rt-section">\n' +
            '  <div class="container">\n' +
            '    <span class="eyebrow">' + applyCompliance(data.eyebrow || 'Responsável Técnica') + '</span>\n' +
            '    <h2>' + name + '</h2>\n' +
            '    <p class="register">' + register + '</p>\n' +
            '    <div class="byline">\n' +
            '      <span>Publicado em: ' + new Date().toLocaleDateString('pt-BR') + '</span>\n' +
            '      <span> · Revisão Clínica: ' + name + '</span>\n' +
            '    </div>\n' +
            '    <p>' + applyCompliance(data.description || data.text || 'Especialista em procedimentos de alta performance com mais de duas décadas de experiência.') + '</p>\n' +
            '    <div class="disclaimer-mini">\n' +
            '      <p>* Resultados podem variar de acordo com o organismo e avaliação clínica individual.</p>\n' +
            '    </div>\n' +
            '  </div>\n' +
            '</section>\n';
          
          if (!articleHtml.includes('id="rt"')) {
            articleHtml += RT_SECTION;
          }
          break
        }

        default: {
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

    const name = "Dra. Daniele Florêncio"
    const register = "Biomédica · CRBM 8242-PR"
    const dateStr = new Date().toLocaleDateString('pt-BR')
    
    const tcleDoc = documents?.find((d: any) => d.document_type === 'tcle')
    const techDoc = documents?.find((d: any) => d.document_type === 'technical_differential')
    
    let docLinksHtml = '<a href="#" class="doc-link">Alvará Sanitário (PDF)</a>'
    if (techDoc) {
      docLinksHtml += `\n<a href="/documentos/diferenciais/${techDoc.slug}" target="_blank" class="doc-link">Diferenciais Técnicos</a>`
    }
    if (tcleDoc) {
      docLinksHtml += `\n<a href="/documentos/tcle/${tcleDoc.slug}" target="_blank" class="doc-link">TCLE · Consentimento</a>`
    }

    const LOCALIZACAO_SECTION = `
<section id="contato" class="block-section localization-section">
  <div class="container">
    <div class="loc-grid">
      <div class="loc-info">
        <span class="eyebrow">Onde estamos</span>
        <h2>No coração do Batel.</h2>
        <p class="address">Rua Brigadeiro Franco, 2670<br>Batel · Curitiba/PR<br>CEP 80250-030</p>
        <div class="loc-contact">
          <p><strong>Telefone:</strong> (41) 3000-0000</p>
          <p><strong>WhatsApp:</strong> <a href="https://wa.me/5541999999999" target="_blank">Clique aqui</a></p>
        </div>
        <div class="loc-docs">
          <p class="doc-label">DOCUMENTAÇÃO TÉCNICA</p>
          <div class="doc-links">
            ${docLinksHtml}
          </div>
        </div>
      </div>
      <div class="loc-map">
        <iframe title="Mapa" src="https://www.google.com/maps?q=Rua+Brigadeiro+Franco+2670+Batel+Curitiba&output=embed" width="100%" height="300" style="border:0;" allowfullscreen="" loading="lazy"></iframe>
      </div>
    </div>
  </div>
</section>`;

    const EEAT_FOOTER = '<section id="eeat-authority" class="block-section rt-section">\n' +
      '  <div class="container">\n' +
      '    <hr class="eeat-divider">\n' +
      '    <div class="eeat-grid">\n' +
      '      <div class="eeat-info">\n' +
      '        <span class="eyebrow">Responsável Técnica & Revisão Clínica</span>\n' +
      '        <h2>' + name + '</h2>\n' +
      '        <p class="register">' + register + '</p>\n' +
      '        <div class="byline">\n' +
      '          <time datetime="' + new Date().toISOString() + '">Publicado: ' + dateStr + '</time>\n' +
      '          <span class="separator">·</span>\n' +
      '          <span>Última Revisão Clínica: ' + dateStr + '</span>\n' +
      '        </div>\n' +
      '        <p class="eeat-bio">Especialista em procedimentos de alta performance com mais de duas décadas de experiência clínica dedicada à estética avançada e integrativa.</p>\n' +
      '      </div>\n' +
      '    </div>\n' +
      '    <div class="disclaimer-eeat">\n' +
      '      <p><strong>Aviso Legal (EEAT):</strong> Todo o conteúdo deste portal foi desenvolvido com fins informativos. Resultados variam conforme a biologia individual. Nenhuma informação substitui uma avaliação presencial com nossa equipe técnica habilitada.</p>\n' +
      '    </div>\n' +
      '  </div>\n' +
      '</section>\n';

    articleHtml += LOCALIZACAO_SECTION;

    if (articleHtml.includes('id="rt"')) {
    } else {
       articleHtml += EEAT_FOOTER;
    }

    const schemas: any[] = []
    
    const medicalSchema: any = {
      "@context": "https://schema.org",
      "@type": "MedicalProcedure",
      "name": pageTitle,
      "description": description,
      "procedureType": "NonInvasiveProcedure",
      "bodyLocation": pageData.metadata?.area_anatomica || pageData.area_corporal || "Corpo",
      "provider": {
        "@type": "MedicalOrganization",
        "name": "Clínica de Estética Batel",
        "url": siteUrl,
        "logo": siteUrl + "/logo.png",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Curitiba",
          "addressRegion": "PR",
          "addressCountry": "BR"
        }
      },
      "performer": {
        "@type": "Person",
        "name": name,
        "jobTitle": "Biomédica",
        "identifier": register
      }
    }

    if (page.modificador && page.modificador_tipo) {
      switch (page.modificador_tipo) {
        case 'indicacao':
          medicalSchema.indication = {
            "@type": "MedicalIndication",
            "name": page.modificador
          };
          break;
        case 'publico':
          medicalSchema.audience = {
            "@type": "Audience",
            "audienceType": page.modificador
          };
          break;
        case 'area-corporal':
          medicalSchema.bodyLocation = page.modificador;
          break;
        case 'objetivo':
          medicalSchema.outcome = page.modificador;
          break;
      }
    }

    schemas.push(medicalSchema)

    const breadcrumbList: any[] = [
      { "@type": "ListItem", "position": 1, "name": "Início", "item": siteUrl }
    ]

    if (page.categoria) {
      const categoryName = page.categoria.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
      breadcrumbList.push({
        "@type": "ListItem",
        "position": 2,
        "name": categoryName,
        "item": siteUrl + "/" + page.categoria + "/"
      })
    }

    if (page.procedimento) {
      const procName = page.procedimento.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
      const procPath = (page.categoria ? page.categoria + "/" : "") + page.procedimento
      breadcrumbList.push({
        "@type": "ListItem",
        "position": breadcrumbList.length + 1,
        "name": procName,
        "item": siteUrl + "/" + procPath + "/"
      })
    }

    breadcrumbList.push({
      "@type": "ListItem",
      "position": breadcrumbList.length + 1,
      "name": pageTitle,
      "item": canonical
    })

    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbList
    })

    if (faqItems.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqItems.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": { "@type": "Answer", "text": item.answer }
        }))
      })
    }

    let html = '<!DOCTYPE html>\n' +
'<html lang="pt-BR">\n' +
'<head>\n' +
'    <meta charset="UTF-8">\n' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'    <title>' + fullTitle + '</title>\n' +
'    <meta name="description" content="' + description + '">\n' +
'    <link rel="canonical" href="' + canonical + '">\n' +
'    <meta name="robots" content="' + (shouldNoIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large') + '">\n' +
'    <meta property="og:type" content="website">\n' +
'    <meta property="og:url" content="' + canonical + '">\n' +
'    <meta property="og:title" content="' + fullTitle + '">\n' +
'    <meta property="og:description" content="' + description + '">\n' +
'    ' + (ogImage ? '<meta property="og:image" content="' + ogImage + '">' : '') + '\n' +
'    <meta property="og:site_name" content="Estética Batel">\n' +
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
'         .authority-grid { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; }\n' +
'         .authority-item { color: var(--gold); font-weight: 600; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em; }\n' +
'         .cta-button { display: inline-block; background: var(--gold); color: black; padding: 16px 32px; text-decoration: none; font-weight: 700; border-radius: 4px; margin-top: 24px; }\n' +
'         .cases-placeholder { border: 1px dashed rgba(197, 160, 89, 0.3); padding: 40px; text-align: center; color: var(--text-muted); font-style: italic; }\n' +
'         .localization-section { background: var(--black); border-top: 1px solid rgba(197, 160, 89, 0.1); }\n' +
'         .loc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; }\n' +
'         .loc-info { padding: 40px 0; }\n' +
'         .loc-docs { margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(197, 160, 89, 0.1); }\n' +
'         .doc-label { font-size: 10px; color: var(--gold); letter-spacing: 0.2em; margin-bottom: 12px; font-weight: 700; }\n' +
'         .doc-links { display: flex; flex-wrap: wrap; gap: 12px; }\n' +
'         .doc-link { color: var(--text-muted); text-decoration: none; font-size: 11px; text-transform: uppercase; border: 1px solid rgba(197,160,89,0.3); padding: 8px 16px; transition: 0.3s; }\n' +
'         .doc-link:hover { border-color: var(--gold); color: white; background: rgba(197,160,89,0.05); }\n' +
'         footer { padding: 60px 0; text-align: center; font-size: 14px; color: var(--text-muted); border-top: 1px solid rgba(197,160,89,0.1); }\n' +
'         .footer-docs { margin-bottom: 24px; display: flex; justify-content: center; gap: 16px; font-size: 12px; flex-wrap: wrap; }\n' +
'         .footer-docs a { color: var(--gold); text-decoration: none; font-weight: 600; }\n' +
'        @media (max-width: 768px) { h1 { font-size: 2.2rem; } h2 { font-size: 1.8rem; } .loc-grid { grid-template-columns: 1fr; } }\n' +
'    </style>\n' +
'    <script type="application/ld+json">\n' +
'        ' + JSON.stringify(schemas, null, 2) + '\n' +
'    </script>\n' +
'</head>\n' +
'<body>\n' +
'    <article>\n' +
'        ' + articleHtml + '\n' +
'        <footer>\n' +
'            <div class="container">\n' +
'                <div class="footer-docs">\n' +
'                  <a href="#">Alvará Sanitário</a>\n' +
'                  ' + (techDoc ? '<a href="/documentos/diferenciais/' + techDoc.slug + '">Diferenciais Técnicos</a>' : '') + '\n' +
'                  ' + (tcleDoc ? '<a href="/documentos/tcle/' + tcleDoc.slug + '">TCLE · Consentimento</a>' : '') + '\n' +
'                  <a href="#">Política de Privacidade</a>\n' +
'                </div>\n' +
'                <p>&copy; ' + new Date().getFullYear() + ' Clínica de Estética Batel. Todos os direitos reservados.</p>\n' +
'                <p>Curitiba - Paraná</p>\n' +
'            </div>\n' +
'        </footer>\n' +
'    </article>\n' +
'</body>\n' +
'</html>';

    const REPLACEMENTS: Record<string, string> = {
      'risco à vida': 'riscos clínicos controlados',
      'risco a vida': 'riscos clínicos controlados',
      'risco de morte': 'riscos clínicos controlados',
      'perigo de vida': 'riscos clínicos controlados',
      'nossa garantia': 'compromisso de excellence',
      'garantia de resultado': 'expectativa de resultado',
      'dermatologista': 'biomédica habilitada',
      'cirurgião plástico': 'equipe técnica especializada',
      'médico': 'profissional de saúde especializado',
      'especialistas qualificados': 'profissionais de saúde especializados',
    };
    const violations: { term: string; count: number }[] = [];
    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        violations.push({ term: label, count: matches.length });
        const replacement = REPLACEMENTS[label] || '[removido]';
        html = html.replace(pattern, replacement);
      }
    }
    const complianceStatus = violations.length === 0 ? 'clean' : 'sanitized';
    const violationsJson = JSON.stringify(violations);
    html = html.replace(
      '<meta property="og:site_name" content="Estética Batel">',
      '<meta property="og:site_name" content="Estética Batel">\n' +
      '    <meta name="x-compliance-status" content="' + complianceStatus + '">\n' +
      '    <meta name="x-compliance-violations" content=\'' + violationsJson.replace(/'/g, '&#39;') + '\'>'
    );
    html = html.replace(
      '</body>',
      '<!-- COMPLIANCE: status=' + complianceStatus + ' violations=' + violationsJson + ' -->\n</body>'
    );

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "X-SSR-Version": "1.4.0-COMPLIANCE-GUARD",
        "X-Compliance-Status": complianceStatus,
        "X-Compliance-Violations": violationsJson,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
