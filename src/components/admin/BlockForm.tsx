import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MediaInput } from "./MediaInput";
  import { Plus, Trash2, Sparkles, Wand2, Loader2, Library, Settings2, Eye } from "lucide-react";
 function HeroImagePreview({ 
   imageUrl, 
   style, 
   bgStyle, 
   align, 
   scale,
   captionTop,
   captionBottom
 }: { 
   imageUrl: string; 
   style: string; 
   bgStyle: string; 
   align: string; 
   scale: number;
   captionTop?: string;
   captionBottom?: string;
 }) {
   if (!imageUrl) return null;
 
   const imageScale = scale / 100;
 
   return (
     <div className="mt-6 space-y-3">
       <div className="flex items-center gap-2 mb-1">
         <Eye className="size-3 text-brand-gold" />
         <span className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">Preview do Estilo</span>
       </div>
       
       <div className="relative aspect-video rounded-lg border border-white/10 bg-brand-black overflow-hidden flex items-center justify-center p-4">
         {/* Grid background for scale reference */}
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent pointer-events-none" />
         
         <div 
           className={cn(
             "relative w-full h-full max-w-[140px] aspect-[4/5] transition-all duration-500",
             align === "left" ? "mr-auto ml-0" : align === "right" ? "ml-auto mr-0" : "mx-auto"
           )}
         >
           {/* Container mimics HeroBlock logic */}
           <div 
             className={cn(
               "w-full h-full relative transition-all duration-500",
               style === "full" && "overflow-hidden border border-brand-gold/10 bg-brand-graphite",
               style === "cutout" && "overflow-visible",
               style === "soft-card" && "overflow-hidden rounded-2xl border border-brand-gold/20 shadow-xl bg-brand-graphite",
               style === "editorial" && "overflow-hidden border-x border-brand-gold/10 bg-brand-graphite"
             )}
           >
              {/* BG Effects - Mirrored from HeroBlock */}
              {bgStyle === "glow" && (
                <div className="absolute inset-0 bg-brand-gold/25 blur-[30px] rounded-full scale-125 animate-pulse-slow" />
              )}
              {bgStyle === "gradient" && (
                <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/15 via-transparent to-brand-black/60" />
              )}
              {bgStyle === "solid" && (
                <div className="absolute inset-0 bg-brand-graphite" />
              )}
 
             <div 
               className="w-full h-full"
               style={{ transform: `scale(${imageScale})` }}
             >
               <img 
                 src={imageUrl} 
                 alt="Preview" 
                 className={cn(
                   "w-full h-full",
                   style === "cutout" ? "object-contain" : "object-cover"
                 )} 
               />
             </div>
 
             {/* Overlays */}
             {style === "full" && (
               <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent 50%, hsl(0 0% 0% / 0.6) 100%)" }} />
             )}
             {style === "editorial" && (
               <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-brand-black via-transparent to-brand-gold/10 mix-blend-overlay" />
             )}
 
             {/* Captions simplified */}
             {(captionTop || captionBottom) && (
               <div className="absolute bottom-2 left-2 right-2 z-10">
                 {captionTop && <p className="text-[6px] uppercase tracking-widest text-brand-gold truncate">{captionTop}</p>}
                 {captionBottom && <p className="font-display italic text-[8px] text-white truncate">{captionBottom}</p>}
               </div>
             )}
           </div>
         </div>
         
         {/* Label showing the combination */}
         <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-none">
           <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10">
             <p className="text-[8px] text-white/50 uppercase tracking-tighter">
               {style} + {bgStyle}
             </p>
           </div>
         </div>
       </div>
     </div>
   );
 }
 
 import { useState } from "react";
 import { cn } from "@/lib/utils";
 import { CaseBlockEditor } from "./CaseBlockEditor";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { BlockType } from "@/types/blocks";

/**
 * Editor declarativo de blocos. Cada tipo tem campos próprios.
 * `data` é um objeto livre — o componente confia no shape esperado por tipo.
 */
interface Props {
  type: BlockType;
  data: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** Contexto opcional para os botões "Gerar com IA / Melhorar com IA". */
  pageTitle?: string;
}

function field(value: unknown, fallback: string = ""): string {
  return typeof value === "string" ? value : fallback;
}

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function obj(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function BlockForm({ type, data, onChange, pageTitle }: Props) {
  function set<K extends string>(key: K, value: unknown) {
    onChange({ ...data, [key]: value });
  }

  // Helpers locais que injetam blockType + pageTitle nos AIFields.
  const aiCtx = { blockType: type, pageTitle };

  switch (type) {
    case "hero":
      return (
        <div className="space-y-4">
          <AIField label="Eyebrow" fieldKey="eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} ctx={aiCtx} />
          <AITextArea label="Título (HTML, use <em> para itálico dourado)" fieldKey="title_html" value={field(data.title_html)} onChange={(v) => set("title_html", v)} rows={3} ctx={aiCtx} />
          <AITextArea label="Parágrafo" fieldKey="paragraph" value={field(data.paragraph)} onChange={(v) => set("paragraph", v)} rows={4} ctx={aiCtx} />
          <CtaField label="CTA primário" value={data.cta_primary} onChange={(v) => set("cta_primary", v)} />
          <CtaField label="CTA secundário" value={data.cta_secondary} onChange={(v) => set("cta_secondary", v)} />
           <div className="pt-4 border-t border-brand-gold/10 space-y-4">
             <div className="flex items-center gap-2 mb-2">
               <Settings2 className="size-3.5 text-brand-gold" />
               <h3 className="text-[10px] uppercase tracking-[0.2em] text-brand-gold font-bold">Configurações da Imagem Hero</h3>
             </div>
             
             <MediaInput label="Imagem hero" value={field(data.image_url)} onChange={(v) => set("image_url", v)} />
             
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <Label className="text-[10px] uppercase tracking-wider text-brand-text-muted">Estilo Visual</Label>
                 <Select value={field(data.hero_image_style, "full")} onValueChange={(v) => set("hero_image_style", v)}>
                   <SelectTrigger className="h-9 bg-white/5 border-white/10">
                     <SelectValue placeholder="Selecione o estilo" />
                   </SelectTrigger>
                  <SelectContent className="z-[100]">
                     <SelectItem value="full">Normal (Full)</SelectItem>
                     <SelectItem value="cutout">Recortada (Cutout)</SelectItem>
                     <SelectItem value="soft-card">Card Suave</SelectItem>
                     <SelectItem value="editorial">Editorial (Overlay)</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
 
               <div className="space-y-1.5">
                 <Label className="text-[10px] uppercase tracking-wider text-brand-text-muted">Fundo da Imagem</Label>
                  <Select value={field(data.hero_bg_style, "gradient")} onValueChange={(v) => set("hero_bg_style", v)}>
                   <SelectTrigger className="h-9 bg-white/5 border-white/10">
                     <SelectValue placeholder="Selecione o fundo" />
                   </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="solid">Sólido Profundo (Solid)</SelectItem>
                      <SelectItem value="gradient">Degradê Sutil (Padrão)</SelectItem>
                      <SelectItem value="glow">Brilho Suave (Glow)</SelectItem>
                      <SelectItem value="none">Sem Fundo (Transparente)</SelectItem>
                    </SelectContent>
                 </Select>
               </div>
             </div>
 
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <Label className="text-[10px] uppercase tracking-wider text-brand-text-muted">Alinhamento</Label>
                 <Select value={field(data.hero_image_align, "center")} onValueChange={(v) => set("hero_image_align", v)}>
                   <SelectTrigger className="h-9 bg-white/5 border-white/10">
                     <SelectValue placeholder="Alinhamento" />
                   </SelectTrigger>
                    <SelectContent className="z-[100]">
                     <SelectItem value="left">Esquerda</SelectItem>
                     <SelectItem value="center">Centralizado</SelectItem>
                     <SelectItem value="right">Direita</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
 
               <div className="space-y-1.5">
                 <div className="flex justify-between">
                   <Label className="text-[10px] uppercase tracking-wider text-brand-text-muted">Tamanho (Escala)</Label>
                   <span className="text-[10px] text-brand-gold">{field(data.hero_image_scale, "100")}%</span>
                 </div>
                 <div className="pt-2">
                   <Slider 
                     value={[parseInt(field(data.hero_image_scale, "100"))]} 
                     min={50} 
                     max={150} 
                     step={5} 
                     onValueChange={([v]) => set("hero_image_scale", v.toString())}
                   />
                </div>
              </div>

                <HeroImagePreview 
                  imageUrl={field(data.image_url)}
                  style={field(data.hero_image_style, "full")}
                  bgStyle={field(data.hero_bg_style, "gradient")}
                  align={field(data.hero_image_align, "center")}
                  scale={parseInt(field(data.hero_image_scale, "100"))}
                  captionTop={field(data.caption_top)}
                  captionBottom={field(data.caption_bottom)}
                />
            </div>
           </div>
          <Field label="Caption (linha de cima)" value={field(data.caption_top)} onChange={(v) => set("caption_top", v)} />
          <Field label="Caption (linha de baixo)" value={field(data.caption_bottom)} onChange={(v) => set("caption_bottom", v)} />
          <Field label="Footnote" value={field(data.footnote)} onChange={(v) => set("footnote", v)} />
        </div>
      );

    case "authority_strip": {
      const items = arr<{ label: string; value: string }>(data.items);
      return (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <Input value={it.value ?? ""} placeholder="Valor (30)" onChange={(e) => {
                const next = [...items]; next[i] = { ...it, value: e.target.value }; set("items", next);
              }} />
              <Input value={it.label ?? ""} placeholder="Label (Anos)" onChange={(e) => {
                const next = [...items]; next[i] = { ...it, label: e.target.value }; set("items", next);
              }} />
              <Button size="icon" variant="ghost" onClick={() => set("items", items.filter((_, idx) => idx !== i))}>
                <Trash2 className="size-4 text-brand-bordeaux" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set("items", [...items, { label: "", value: "" }])}>
            <Plus className="size-3.5 mr-1" /> Adicionar selo
          </Button>
        </div>
      );
    }

    case "manifesto_curto":
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <AITextArea label="Citação curta (HTML)" fieldKey="quote_html" value={field(data.quote_html)} onChange={(v) => set("quote_html", v)} rows={5} ctx={aiCtx} />
          <Field label="Autor" value={field(data.author)} onChange={(v) => set("author", v)} />
          <AITextArea label="Texto longo (side-sheet)" fieldKey="long_text" value={field(data.long_text)} onChange={(v) => set("long_text", v)} rows={8} ctx={aiCtx} />
          <Field label="Label do botão" value={field(data.cta_label)} onChange={(v) => set("cta_label", v)} />
        </div>
      );

    case "metodo": {
      const steps = arr<{ title: string; summary: string; detail: string }>(data.steps);
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <AIField label="Título (HTML)" fieldKey="title_html" value={field(data.title_html)} onChange={(v) => set("title_html", v)} ctx={aiCtx} />
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={i} className="border border-brand-gold/15 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-brand-text-muted">Passo {i + 1}</span>
                  <Button size="icon" variant="ghost" onClick={() => set("steps", steps.filter((_, idx) => idx !== i))}>
                    <Trash2 className="size-4 text-brand-bordeaux" />
                  </Button>
                </div>
                <AIField label="Título" fieldKey="title" value={s.title ?? ""} onChange={(v) => { const n = [...steps]; n[i] = { ...s, title: v }; set("steps", n); }} ctx={{ ...aiCtx, extraContext: `Passo ${i + 1} do método.` }} />
                <AIField label="Resumo" fieldKey="summary" value={s.summary ?? ""} onChange={(v) => { const n = [...steps]; n[i] = { ...s, summary: v }; set("steps", n); }} ctx={{ ...aiCtx, extraContext: `Resumo do passo "${s.title || i + 1}".` }} />
                <AITextArea label="Detalhe (acordeão)" fieldKey="detail" value={s.detail ?? ""} onChange={(v) => { const n = [...steps]; n[i] = { ...s, detail: v }; set("steps", n); }} rows={3} ctx={{ ...aiCtx, extraContext: `Detalhe técnico do passo "${s.title || i + 1}".` }} />
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => set("steps", [...steps, { title: "", summary: "", detail: "" }])}>
              <Plus className="size-3.5 mr-1" /> Adicionar passo
            </Button>
          </div>
        </div>
      );
    }

     case "casos": {
       const items = arr<any>(data.cases);
       const hasCustomCases = "cases" in data;
 
       return (
         <div className="space-y-6">
           <div className="space-y-4">
             <Field label="Eyebrow" value={field(data.eyebrow, "Casos clínicos")} onChange={(v) => set("eyebrow", v)} />
             <AIField label="Título (HTML)" fieldKey="title_html" value={field(data.title_html)} onChange={(v) => set("title_html", v)} ctx={aiCtx} />
           </div>
 
           <div className="space-y-3">
             <div className="flex items-center justify-between">
               <Label className="text-xs font-bold uppercase tracking-widest text-brand-gold">Seleção de Casos</Label>
               {!hasCustomCases ? (
                 <Button 
                   size="sm" 
                   variant="outline" 
                   className="h-7 text-[10px] border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10"
                   onClick={() => set("cases", [])}
                 >
                   <Plus className="size-3 mr-1" /> Customizar para esta página
                 </Button>
               ) : (
                 <Button 
                   size="sm" 
                   variant="ghost" 
                   className="h-7 text-[10px] text-brand-bordeaux hover:bg-brand-bordeaux/10"
                   onClick={() => {
                     if (confirm("Voltar para o pool global? Suas seleções manuais desta página serão perdidas.")) {
                       const next = { ...data };
                       delete next.cases;
                       onChange(next);
                     }
                   }}
                 >
                   Reverter para Global
                 </Button>
               )}
             </div>
 
             {!hasCustomCases ? (
               <div className="p-4 border border-dashed border-brand-gold/15 rounded-lg bg-brand-gold/5 text-center space-y-2">
                 <p className="text-xs text-brand-text-muted">
                   Atualmente exibindo casos automaticamente do pool global com base na categoria da página.
                 </p>
                 <p className="text-[10px] text-brand-gold/60 uppercase tracking-widest">
                   (Recomendado para SEO e Frescor)
                 </p>
               </div>
             ) : (
               <CaseBlockEditor 
                 items={items} 
                 onChange={(next) => set("cases", next)} 
               />
             )}
           </div>
 
           {!hasCustomCases && (
             <Field label="Quantos casos exibir (Fallback Global)" value={String(data.show_count ?? 6)} onChange={(v) => set("show_count", parseInt(v) || 6)} />
           )}
         </div>
       );
     }

    case "preco_ancora": {
      const bullets = arr<string>(data.bullets);
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <AIField label="Título (HTML)" fieldKey="title_html" value={field(data.title_html)} onChange={(v) => set("title_html", v)} ctx={aiCtx} />
          <AITextArea label="Descrição" fieldKey="description" value={field(data.description)} onChange={(v) => set("description", v)} rows={3} ctx={aiCtx} />
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-2">Bullets do que está incluso</p>
            <div className="space-y-2">
              {bullets.map((b, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={b} onChange={(e) => { const n = [...bullets]; n[i] = e.target.value; set("bullets", n); }} />
                  <Button size="icon" variant="ghost" onClick={() => set("bullets", bullets.filter((_, idx) => idx !== i))}>
                    <Trash2 className="size-4 text-brand-bordeaux" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set("bullets", [...bullets, ""])}>
                <Plus className="size-3.5 mr-1" /> Adicionar bullet
              </Button>
            </div>
          </div>
          <CtaField label="CTA primário" value={data.cta_primary} onChange={(v) => set("cta_primary", v)} />
          <CtaField label="CTA secundário" value={data.cta_secondary} onChange={(v) => set("cta_secondary", v)} />
          <Field label="Título do side-sheet" value={field(data.sheet_title)} onChange={(v) => set("sheet_title", v)} />
          <AITextArea label="Conteúdo do side-sheet (HTML simples)" fieldKey="sheet_html" value={field(data.sheet_html)} onChange={(v) => set("sheet_html", v)} rows={6} ctx={aiCtx} />
        </div>
      );
    }

    case "depoimentos":
    case "ai_opinions":
    case "cursos":
    {
      const depItems = type === "depoimentos"
        ? arr<{ name?: string; text?: string; rating?: number; date_label?: string; source?: string }>(data.items)
        : [];
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <AIField label="Título (HTML)" fieldKey="title_html" value={field(data.title_html)} onChange={(v) => set("title_html", v)} ctx={aiCtx} />
           {type === "depoimentos" && (
             <div className="grid grid-cols-2 gap-4">
               <Field label="Quantos exibir" value={String(data.show_count ?? 6)} onChange={(v) => set("show_count", parseInt(v) || 6)} />
               <Field label="Filtro por Tag (opcional)" value={field(data.tag_filter)} onChange={(v) => set("tag_filter", v)} />
             </div>
           )}
          {type === "ai_opinions" && <AIField label="Subtítulo" fieldKey="subtitle" value={field(data.subtitle)} onChange={(v) => set("subtitle", v)} ctx={aiCtx} />}
          {type === "cursos" && (
            <>
              <AITextArea label="Intro" fieldKey="intro" value={field(data.intro)} onChange={(v) => set("intro", v)} rows={3} ctx={aiCtx} />
              <Field label="Footnote" value={field(data.footnote)} onChange={(v) => set("footnote", v)} />
            </>
          )}
          {type === "depoimentos" ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-2">
                Depoimentos próprios da página{depItems.length > 0 ? ` (${depItems.length})` : ""}
              </p>
              <p className="text-[11px] text-brand-text-muted mb-3">
                Se vazio, o bloco usa o pool global de Google Reviews. Quando houver itens aqui, eles têm prioridade — útil para depoimentos extraídos de páginas antigas da clínica.
              </p>
              <div className="space-y-3">
                {depItems.map((it, i) => (
                  <div key={i} className="border border-brand-gold/15 p-3 space-y-2">
                    <div className="flex justify-end">
                      <Button size="icon" variant="ghost" onClick={() => set("items", depItems.filter((_, idx) => idx !== i))}>
                        <Trash2 className="size-4 text-brand-bordeaux" />
                      </Button>
                    </div>
                    <Field label="Nome" value={it.name ?? ""} onChange={(v) => { const n = [...depItems]; n[i] = { ...it, name: v }; set("items", n); }} />
                    <FieldArea label="Texto" value={it.text ?? ""} onChange={(v) => { const n = [...depItems]; n[i] = { ...it, text: v }; set("items", n); }} rows={3} />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Data (rótulo)" value={it.date_label ?? ""} onChange={(v) => { const n = [...depItems]; n[i] = { ...it, date_label: v }; set("items", n); }} />
                      <Field label="Estrelas (1-5)" value={String(it.rating ?? 5)} onChange={(v) => { const n = [...depItems]; n[i] = { ...it, rating: Math.max(1, Math.min(5, parseInt(v) || 5)) }; set("items", n); }} />
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => set("items", [...depItems, { name: "", text: "", rating: 5, date_label: "" }])}>
                  <Plus className="size-3.5 mr-1" /> Adicionar depoimento próprio
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-brand-text-muted">
              O conteúdo dos cards vem do pool global. Edite no menu correspondente.
            </p>
          )}
        </div>
      );
    }

    case "equipe_rt": {
      const accs = arr<{ question: string; answer: string }>(data.accordions);
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <AIField label="Título (HTML)" fieldKey="title_html" value={field(data.title_html)} onChange={(v) => set("title_html", v)} ctx={aiCtx} />
          <Field label="Registro (CRBM 8242 PR)" value={field(data.register_label)} onChange={(v) => set("register_label", v)} />
          <MediaInput label="Foto" value={field(data.image_url)} onChange={(v) => set("image_url", v)} />
          <AITextArea label="Bio" fieldKey="bio" value={field(data.bio)} onChange={(v) => set("bio", v)} rows={4} ctx={aiCtx} />
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-2">Acordeões</p>
            <div className="space-y-3">
              {accs.map((a, i) => (
                <div key={i} className="border border-brand-gold/15 p-3 space-y-2">
                  <div className="flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => set("accordions", accs.filter((_, idx) => idx !== i))}>
                      <Trash2 className="size-4 text-brand-bordeaux" />
                    </Button>
                  </div>
                  <AIField label="Pergunta" fieldKey="question" value={a.question ?? ""} onChange={(v) => { const n = [...accs]; n[i] = { ...a, question: v }; set("accordions", n); }} ctx={aiCtx} />
                  <AITextArea label="Resposta" fieldKey="answer" value={a.answer ?? ""} onChange={(v) => { const n = [...accs]; n[i] = { ...a, answer: v }; set("accordions", n); }} rows={3} ctx={{ ...aiCtx, extraContext: a.question ? `Pergunta: "${a.question}"` : undefined }} />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set("accordions", [...accs, { question: "", answer: "" }])}>
                <Plus className="size-3.5 mr-1" /> Adicionar acordeão
              </Button>
            </div>
          </div>
          <Field label="Label do botão" value={field(data.cta_label)} onChange={(v) => set("cta_label", v)} />
        </div>
      );
    }

    case "faq":
    {
      const faqItems = arr<{ question?: string; answer?: string; source?: "old_page" | "ai" }>(data.items);
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <AIField label="Título (HTML)" fieldKey="title_html" value={field(data.title_html)} onChange={(v) => set("title_html", v)} ctx={aiCtx} />
          <p className="text-[11px] text-brand-text-muted">
            FAQs próprias desta página{faqItems.length > 0 ? ` (${faqItems.length})` : ""}. Se vazio, cai no pool global. Quando importadas de uma página antiga da clínica, ficam aqui.
          </p>
          <div className="space-y-3">
            {faqItems.map((f, i) => (
              <div key={i} className="border border-brand-gold/15 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  {f.source === "old_page" ? (
                    <span className="text-[10px] uppercase tracking-wider text-brand-gold">Da página antiga</span>
                  ) : f.source === "ai" ? (
                    <span className="text-[10px] uppercase tracking-wider text-brand-text-muted">Gerada por IA</span>
                  ) : <span />}
                  <Button size="icon" variant="ghost" onClick={() => set("items", faqItems.filter((_, idx) => idx !== i))}>
                    <Trash2 className="size-4 text-brand-bordeaux" />
                  </Button>
                </div>
                <AIField label="Pergunta" fieldKey="question" value={f.question ?? ""} onChange={(v) => { const n = [...faqItems]; n[i] = { ...f, question: v }; set("items", n); }} ctx={aiCtx} />
                <AITextArea label="Resposta" fieldKey="answer" value={f.answer ?? ""} onChange={(v) => { const n = [...faqItems]; n[i] = { ...f, answer: v }; set("items", n); }} rows={3} ctx={{ ...aiCtx, extraContext: f.question ? `Pergunta: "${f.question}"` : undefined }} />
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => set("items", [...faqItems, { question: "", answer: "" }])}>
              <Plus className="size-3.5 mr-1" /> Adicionar pergunta
            </Button>
          </div>
        </div>
      );
    }

    case "procedimento_detalhado": {
      const paragraphs = arr<string>(data.paragraphs);
      const bullets = arr<{ title?: string; text?: string }>(data.bullets);
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <AIField label="Título (HTML)" fieldKey="title_html" value={field(data.title_html)} onChange={(v) => set("title_html", v)} ctx={aiCtx} />
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-2">Parágrafos</p>
            <div className="space-y-2">
              {paragraphs.map((p, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Textarea rows={3} value={p} onChange={(e) => { const n = [...paragraphs]; n[i] = e.target.value; set("paragraphs", n); }} />
                  <Button size="icon" variant="ghost" onClick={() => set("paragraphs", paragraphs.filter((_, idx) => idx !== i))}>
                    <Trash2 className="size-4 text-brand-bordeaux" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set("paragraphs", [...paragraphs, ""])}>
                <Plus className="size-3.5 mr-1" /> Adicionar parágrafo
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-2">Cards de benefícios</p>
            <div className="space-y-3">
              {bullets.map((b, i) => (
                <div key={i} className="border border-brand-gold/15 p-3 space-y-2">
                  <div className="flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => set("bullets", bullets.filter((_, idx) => idx !== i))}>
                      <Trash2 className="size-4 text-brand-bordeaux" />
                    </Button>
                  </div>
                  <Field label="Título" value={b.title ?? ""} onChange={(v) => { const n = [...bullets]; n[i] = { ...b, title: v }; set("bullets", n); }} />
                  <FieldArea label="Texto" value={b.text ?? ""} onChange={(v) => { const n = [...bullets]; n[i] = { ...b, text: v }; set("bullets", n); }} rows={2} />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set("bullets", [...bullets, { title: "", text: "" }])}>
                <Plus className="size-3.5 mr-1" /> Adicionar card
              </Button>
            </div>
          </div>
          <CtaField label="CTA (opcional)" value={data.cta} onChange={(v) => set("cta", v)} />
        </div>
      );
    }

    case "beneficios_grid": {
      const cards = arr<{ title: string; text: string }>(data.cards);
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <AIField label="Título (HTML)" fieldKey="title_html" value={field(data.title_html)} onChange={(v) => set("title_html", v)} ctx={aiCtx} />
          <AITextArea label="Subtítulo (opcional)" fieldKey="subtitle" value={field(data.subtitle)} onChange={(v) => set("subtitle", v)} rows={3} ctx={aiCtx} />
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-2">Cards de benefícios</p>
            <div className="space-y-3">
              {cards.map((c, i) => (
                <div key={i} className="border border-brand-gold/15 p-3 space-y-2">
                  <div className="flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => set("cards", cards.filter((_, idx) => idx !== i))}>
                      <Trash2 className="size-4 text-brand-bordeaux" />
                    </Button>
                  </div>
                  <AIField label="Título" fieldKey="title" value={c.title ?? ""} onChange={(v) => { const n = [...cards]; n[i] = { ...c, title: v }; set("cards", n); }} ctx={{ ...aiCtx, extraContext: `Card ${i + 1} de benefícios.` }} />
                  <FieldArea label="Texto" value={c.text ?? ""} onChange={(v) => { const n = [...cards]; n[i] = { ...c, text: v }; set("cards", n); }} rows={2} />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set("cards", [...cards, { title: "", text: "" }])}>
                <Plus className="size-3.5 mr-1" /> Adicionar card
              </Button>
            </div>
          </div>
        </div>
      );
    }

    case "procedimento_detalhado_v2": {
      const paragraphs = arr<string>(data.paragraphs);
      const sideCards = arr<{ title: string; text: string }>(data.side_cards);
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <AIField label="Título (HTML)" fieldKey="title_html" value={field(data.title_html)} onChange={(v) => set("title_html", v)} ctx={aiCtx} />
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-2">Texto principal (Parágrafos)</p>
            <div className="space-y-2">
              {paragraphs.map((p, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Textarea rows={3} value={p} onChange={(e) => { const n = [...paragraphs]; n[i] = e.target.value; set("paragraphs", n); }} />
                  <Button size="icon" variant="ghost" onClick={() => set("paragraphs", paragraphs.filter((_, idx) => idx !== i))}>
                    <Trash2 className="size-4 text-brand-bordeaux" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set("paragraphs", [...paragraphs, ""])}>
                <Plus className="size-3.5 mr-1" /> Adicionar parágrafo
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-2">Cards laterais (Destaques)</p>
            <div className="space-y-3">
              {sideCards.map((c, i) => (
                <div key={i} className="border border-brand-gold/15 p-3 space-y-2">
                  <div className="flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => set("side_cards", sideCards.filter((_, idx) => idx !== i))}>
                      <Trash2 className="size-4 text-brand-bordeaux" />
                    </Button>
                  </div>
                  <AIField label="Título" fieldKey="title" value={c.title ?? ""} onChange={(v) => { const n = [...sideCards]; n[i] = { ...c, title: v }; set("side_cards", n); }} ctx={{ ...aiCtx, extraContext: `Card lateral ${i + 1}.` }} />
                  <FieldArea label="Texto" value={c.text ?? ""} onChange={(v) => { const n = [...sideCards]; n[i] = { ...c, text: v }; set("side_cards", n); }} rows={2} />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set("side_cards", [...sideCards, { title: "", text: "" }])}>
                <Plus className="size-3.5 mr-1" /> Adicionar card lateral
              </Button>
            </div>
          </div>
          <MediaInput label="Imagem (opcional)" value={field(data.image_url)} onChange={(v) => set("image_url", v)} />
          <CtaField label="CTA (opcional)" value={data.cta} onChange={(v) => set("cta", v)} />
        </div>
      );
    }

    case "cta_final":
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <AIField label="Título (HTML)" fieldKey="title_html" value={field(data.title_html)} onChange={(v) => set("title_html", v)} ctx={aiCtx} />
          <AITextArea label="Parágrafo" fieldKey="paragraph" value={field(data.paragraph)} onChange={(v) => set("paragraph", v)} rows={3} ctx={aiCtx} />
          <CtaField label="CTA primário" value={data.cta_primary} onChange={(v) => set("cta_primary", v)} />
          <CtaField label="CTA secundário" value={data.cta_secondary} onChange={(v) => set("cta_secondary", v)} />
        </div>
      );
  }
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-brand-text-muted">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FieldArea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-brand-text-muted">{label}</Label>
      <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CtaField({ label, value, onChange }: { label: string; value: unknown; onChange: (v: { label?: string; href?: string; opens_sheet?: boolean }) => void }) {
  const v = obj(value) as { label?: string; href?: string; opens_sheet?: boolean };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-brand-text-muted">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Texto do botão" value={v.label ?? ""} onChange={(e) => onChange({ ...v, label: e.target.value })} />
        <Input placeholder="Link (https://… ou #ancora)" value={v.href ?? ""} onChange={(e) => onChange({ ...v, href: e.target.value })} />
      </div>
    </div>
  );
}

// ============================================================================
// AIField / AITextArea — campos com botões "Gerar com IA" e "Melhorar com IA"
// ============================================================================

interface AICtx {
  blockType: string;
  pageTitle?: string;
  extraContext?: string;
}

function useAI() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<"generate" | "improve" | null>(null);

  async function run(opts: {
    mode: "generate" | "improve";
    blockType: string;
    fieldKey: string;
    fieldLabel: string;
    currentValue: string;
    pageTitle?: string;
    extraContext?: string;
    onResult: (text: string) => void;
  }) {
    setLoading(opts.mode);
    try {
      const { data, error } = await supabase.functions.invoke("improve-block-text", {
        body: {
          mode: opts.mode,
          blockType: opts.blockType,
          fieldKey: opts.fieldKey,
          fieldLabel: opts.fieldLabel,
          currentValue: opts.currentValue,
          pageTitle: opts.pageTitle,
          extraContext: opts.extraContext,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.text) {
        opts.onResult(data.text);
        toast({ title: opts.mode === "generate" ? "Texto gerado" : "Texto melhorado" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Falhou", description: msg, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  return { run, loading };
}

function AIButtons({
  fieldKey,
  fieldLabel,
  value,
  onResult,
  ctx,
}: {
  fieldKey: string;
  fieldLabel: string;
  value: string;
  onResult: (text: string) => void;
  ctx: AICtx;
}) {
  const { run, loading } = useAI();
  const hasValue = value.trim().length >= 2;
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[10px] uppercase tracking-wider text-brand-gold hover:bg-brand-gold/10"
        disabled={loading !== null}
        onClick={() =>
          run({
            mode: "generate",
            blockType: ctx.blockType,
            fieldKey,
            fieldLabel,
            currentValue: value,
            pageTitle: ctx.pageTitle,
            extraContext: ctx.extraContext,
            onResult,
          })
        }
        title="Gerar texto novo com IA seguindo o tom Batel"
      >
        {loading === "generate" ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
        Gerar
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[10px] uppercase tracking-wider text-brand-gold hover:bg-brand-gold/10 disabled:opacity-30"
        disabled={loading !== null || !hasValue}
        onClick={() =>
          run({
            mode: "improve",
            blockType: ctx.blockType,
            fieldKey,
            fieldLabel,
            currentValue: value,
            pageTitle: ctx.pageTitle,
            extraContext: ctx.extraContext,
            onResult,
          })
        }
        title={hasValue ? "Reescrever o texto atual mantendo a intenção" : "Escreva um rascunho para poder melhorar"}
      >
        {loading === "improve" ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}
        Melhorar
      </Button>
    </div>
  );
}

function AIField({
  label,
  fieldKey,
  value,
  onChange,
  ctx,
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (v: string) => void;
  ctx: AICtx;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs uppercase tracking-wider text-brand-text-muted">{label}</Label>
        <AIButtons fieldKey={fieldKey} fieldLabel={label} value={value} onResult={onChange} ctx={ctx} />
      </div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AITextArea({
  label,
  fieldKey,
  value,
  onChange,
  rows = 4,
  ctx,
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  ctx: AICtx;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs uppercase tracking-wider text-brand-text-muted">{label}</Label>
        <AIButtons fieldKey={fieldKey} fieldLabel={label} value={value} onResult={onChange} ctx={ctx} />
      </div>
      <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}