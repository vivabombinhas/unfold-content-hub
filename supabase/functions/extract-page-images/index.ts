 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface ImageCandidate {
   url: string;
   source: string;
   source_url: string;
   alt: string;
   suggested_usage: "hero" | "section" | "gallery" | "unknown";
   confidence_score: number;
   status: "pending" | "ignored" | "used";
 }
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders })
   }
 
   try {
     const { url, page_title, page_category } = await req.json();
 
      if (!url) {
        throw new Error("URL é obrigatória.");
      }
 
     console.log(`Extracting images from: ${url}`);
 
     const response = await fetch(url, {
       headers: {
         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
       }
     });
 
     if (!response.ok) {
       throw new Error(`Falha ao acessar a URL: ${response.statusText}`);
     }
 
     const html = await response.text();
     const candidates: ImageCandidate[] = [];
     const seenUrls = new Set<string>();
 
     // 1. OG Image
     const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) || 
                     html.match(/content="([^"]+)"\s+property="og:image"/i);
     if (ogMatch && ogMatch[1]) {
       const imgUrl = ogMatch[1];
       if (!seenUrls.has(imgUrl)) {
         candidates.push({
           url: imgUrl,
           source: "og_image",
           source_url: url,
           alt: page_title || "",
           suggested_usage: "hero",
           confidence_score: 0.95,
           status: "pending"
         });
         seenUrls.add(imgUrl);
       }
     }
 
     // 2. Img tags (Regex based for MVP)
     const imgRegex = /<img[^>]+src="([^">]+)"([^>]*)>/gi;
     let match;
     while ((match = imgRegex.exec(html)) !== null) {
       const imgUrl = match[1];
       const attrs = match[2];
       
       if (seenUrls.has(imgUrl) || imgUrl.startsWith("data:")) continue;
 
        // Filter noise and low quality
        const isNoise = /logo|favicon|icon|whatsapp|social|facebook|instagram|youtube|pixel|loader|placeholder|banner-repetido|anatomy|anatomia|marking|marcacao|drawing|desenho|diagram|vector/i.test(imgUrl) ||
                        /logo|ícone|whatsapp|anatomia|marcacao|desenho|tecnico/i.test(attrs);

        // Ignore very small images often used for icons or tiny thumbnails
        const isSmall = /width="[1-9][0-9]?"|height="[1-9][0-9]?"/i.test(attrs) || 
                        /\-(150x150|50x50|100x100)\./i.test(imgUrl);
        
        if (isNoise || isSmall) continue;
 
       // Extract alt
       const altMatch = attrs.match(/alt="([^"]*)"/i);
       const alt = altMatch ? altMatch[1] : "";
 
       // Score logic
       let score = 0.5;
       let usage: "hero" | "section" | "gallery" | "unknown" = "section";
 
         // Hero and Clinical detection
       if (alt.toLowerCase().includes(page_title?.toLowerCase() || "") || 
           imgUrl.toLowerCase().includes(page_title?.toLowerCase() || "")) {
         score += 0.3;
         usage = "hero";
       }
 
         if (alt.toLowerCase().includes("antes") || imgUrl.toLowerCase().includes("antes")) {
           score += 0.2;
         }
         if (alt.toLowerCase().includes("depois") || imgUrl.toLowerCase().includes("depois")) {
           score += 0.2;
         }
 
       if (attrs.includes('class="wp-post-image"') || attrs.includes('class="attachment-full"')) {
         score += 0.2;
         usage = "hero";
       }
 
       candidates.push({
         url: imgUrl,
         source: "scraping",
         source_url: url,
         alt,
         suggested_usage: usage,
         confidence_score: Math.min(score, 0.9),
         status: "pending"
       });
       seenUrls.add(imgUrl);
     }
 
     // 3. Background images
     const bgRegex = /style="[^"]*background-image:\s*url\(['"]?([^'"\)]+)['"]?\)/gi;
     while ((match = bgRegex.exec(html)) !== null) {
       const imgUrl = match[1];
       if (!seenUrls.has(imgUrl) && !imgUrl.startsWith("data:")) {
         candidates.push({
           url: imgUrl,
           source: "scraping",
           source_url: url,
           alt: "",
           suggested_usage: "section",
           confidence_score: 0.4,
           status: "pending"
         });
         seenUrls.add(imgUrl);
       }
     }
 
     // Filter duplicates and return
     return new Response(JSON.stringify({ 
       image_candidates: candidates.sort((a, b) => b.confidence_score - a.confidence_score) 
     }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
 
   } catch (e: any) {
     console.error(e);
     return new Response(JSON.stringify({ error: e.message }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });