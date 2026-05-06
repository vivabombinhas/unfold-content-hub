 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
 
 export const handler = async (req: Request) => {
   if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
 
   try {
     const { url, page_title, page_category } = await req.json();
 
     if (!url || !url.includes("esteticabatel.com.br")) {
       throw new Error("URL inválida ou fora do domínio permitido.");
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
 
       // Filter noise
       const isNoise = /logo|favicon|icon|whatsapp|social|facebook|instagram|youtube|pixel|loader|placeholder|banner-repetido/i.test(imgUrl) ||
                       /logo|ícone|whatsapp/i.test(attrs);
       
       if (isNoise) continue;
 
       // Extract alt
       const altMatch = attrs.match(/alt="([^"]*)"/i);
       const alt = altMatch ? altMatch[1] : "";
 
       // Score logic
       let score = 0.5;
       let usage: "hero" | "section" | "gallery" | "unknown" = "section";
 
       // Hero detection
       if (alt.toLowerCase().includes(page_title?.toLowerCase() || "") || 
           imgUrl.toLowerCase().includes(page_title?.toLowerCase() || "")) {
         score += 0.3;
         usage = "hero";
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
 };
 
 serve(handler);