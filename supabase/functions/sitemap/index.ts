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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Fetch published pages
    const { data: pages, error } = await supabase
      .from('pages')
      .select('slug, url_path, updated_at')
      .eq('status', 'published')
      .neq('slug', 'modelo')
      .order('updated_at', { ascending: false })

    if (error) throw error

    const baseUrl = 'https://esteticabatel.com.br'
    
    // Start XML string
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    // Add Home page first
    const today = new Date().toISOString().split('T')[0]
    xml += `  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n`

    pages?.forEach((page: any) => {
      // If it's the home page, we already added it or we skip if it's same
      if (page.slug === 'home' || page.slug === '') return

      const path = page.url_path || page.slug
      const url = `${baseUrl}/${path}/`
      const lastmod = new Date(page.updated_at).toISOString().split('T')[0]
      
      xml += `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`
    })

    xml += '</urlset>'

    console.log(`Generated sitemap with ${pages?.length} dynamic pages + home`)
    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
