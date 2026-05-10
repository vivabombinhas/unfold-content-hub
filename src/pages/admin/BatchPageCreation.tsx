 import { useState, useMemo } from "react";
 import { Link } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Textarea } from "@/components/ui/textarea";
 import { Label } from "@/components/ui/label";
 import { useToast } from "@/hooks/use-toast";
 import { 
   Sparkles, 
   ChevronLeft, 
   Play, 
   Loader2, 
   ExternalLink, 
   AlertCircle, 
   CheckCircle2,
   ListChecks,
   Search,
   Wand2
 } from "lucide-react";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { cn } from "@/lib/utils";
 
 interface BatchItem {
   id: string;
   procedimento: string;
   url: string;
   slug: string;
   type: "preserve_literal" | "inspiration_only" | "ai_only";
   status: "pending" | "processing_research" | "processing_gen" | "finalizing" | "completed" | "error";
   error?: string;
   resultSlug?: string;
 }
 
 function slugify(s: string) {
   return s
     .toLowerCase()
     .normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .replace(/[^a-z0-9\s-]/g, "")
     .trim()
     .replace(/\s+/g, "-")
     .replace(/-+/g, "-");
 }
 
 const OWN_DOMAIN = "esteticabatel.com.br";
 
 export default function BatchPageCreation() {
   const { toast } = useToast();
   const [input, setInput] = useState("");
   const [items, setItems] = useState<BatchItem[]>([]);
   const [isAnalyzing, setIsAnalyzing] = useState(false);
   const [isBatchRunning, setIsBatchRunning] = useState(false);
   const [processedCount, setProcessedCount] = useState(0);
 
   const handleAnalyze = () => {
     if (!input.trim()) {
       toast({ title: "Insira a lista de procedimentos", variant: "destructive" });
       return;
     }
 
     setIsAnalyzing(true);
     const lines = input.split("\n").filter(line => line.trim());
     const newItems: BatchItem[] = lines.map((line, idx) => {
       const parts = line.split("|").map(p => p.trim());
       const procedimento = parts[0];
       const url = parts[1] || "";
       const slug = slugify(procedimento);
       
       let type: BatchItem["type"] = "ai_only";
       if (url) {
         try {
           const hostname = new URL(url).hostname;
           type = hostname.endsWith(OWN_DOMAIN) ? "preserve_literal" : "inspiration_only";
         } catch {
           type = "inspiration_only";
         }
       }
 
       return {
         id: `item-${idx}-${Date.now()}`,
         procedimento,
         url,
         slug,
         type,
         status: "pending"
       };
     });
 
     setItems(newItems);
     setIsAnalyzing(false);
   };
 
   const runBatch = async () => {
     if (items.length === 0) return;
     setIsBatchRunning(true);
     setProcessedCount(0);
 
     for (let i = 0; i < items.length; i++) {
       const item = items[i];
       if (item.status === "completed") continue;
 
       // Update status to research
       setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: "processing_research" } : it));
 
       try {
         // Phase 1: Research
         const links = item.url ? [item.url] : [];
         const isOwnPage = item.type === "preserve_literal";
 
         const { data: researchData, error: researchErr } = await supabase.functions.invoke("research-topic", {
           timeout: 60000,
           body: { 
             tema: item.procedimento, 
             links_referencia: links, 
             own_old_page: isOwnPage && links.length > 0 
           },
         });
 
         if (researchErr) throw new Error(researchErr.message);
         if (researchData?.error) throw new Error(researchData.error);
 
         // Phase 2: Generation
         setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: "processing_gen" } : it));
 
         const { data: pageData, error: pageErr } = await supabase.functions.invoke("generate-page-from-topic", {
           timeout: 120000,
           body: {
             tema: item.procedimento,
             slug: item.slug,
             research: researchData.research,
             links_referencia: links,
             sources: researchData.sources || [],
             own_old_page: isOwnPage && links.length > 0,
             old_page_content: researchData.old_page_content || null,
             scrape_diagnostics: researchData.scrape_diagnostics || [],
             allow_ai_only_fallback: true, // In batch we want to keep going
           },
         });
 
         if (pageErr) {
           // If it's a timeout error but we suspect it might have finished
           if (pageErr.message?.includes("timeout") || pageErr.message?.includes("AbortError")) {
             setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: "finalizing" } : it));
             
             // Wait a bit and check if the page exists
             let retryCount = 0;
             const maxRetries = 5;
             let found = false;
             
             while (retryCount < maxRetries && !found) {
               await new Promise(resolve => setTimeout(resolve, 5000));
               const { data: existingPage } = await supabase
                 .from("pages")
                 .select("slug")
                 .eq("slug", item.slug)
                 .single();
               
               if (existingPage) {
                 found = true;
                 setItems(prev => prev.map(it => it.id === item.id ? { 
                   ...it, 
                   status: "completed", 
                   resultSlug: existingPage.slug 
                 } : it));
                 break;
               }
               retryCount++;
             }
             
             if (!found) throw new Error("Tempo esgotado. Verifique se a página foi criada na lista geral.");
           } else {
             throw new Error(pageErr.message);
           }
         } else if (pageData?.error) {
           throw new Error(pageData.error);
         } else {
           setItems(prev => prev.map(it => it.id === item.id ? { 
             ...it, 
             status: "completed", 
             resultSlug: pageData.slug 
           } : it));
         }

         setProcessedCount(prev => prev + 1);
       } catch (err) {
         console.error(`Error processing ${item.procedimento}:`, err);
         setItems(prev => prev.map(it => it.id === item.id ? { 
           ...it, 
           status: "error", 
           error: err instanceof Error ? err.message : "Erro desconhecido" 
         } : it));
       }
     }
 
     setIsBatchRunning(false);
     toast({ 
       title: "Processamento de lote finalizado",
       description: `${processedCount} páginas processadas com sucesso.`
     });
   };

   const checkAllStatuses = async () => {
     const pendingItems = items.filter(it => it.status !== "completed");
     if (pendingItems.length === 0) return;

     toast({ title: "Atualizando status..." });
     
     for (const item of pendingItems) {
       const { data: existingPage } = await supabase
         .from("pages")
         .select("slug")
         .eq("slug", item.slug)
         .single();
       
       if (existingPage) {
         setItems(prev => prev.map(it => it.id === item.id ? { 
           ...it, 
           status: "completed", 
           resultSlug: existingPage.slug 
         } : it));
       }
     }
   };
 
   return (
     <div className="p-8 max-w-6xl mx-auto">
       <Link to="/admin/paginas" className="text-xs text-brand-text-muted hover:text-brand-gold inline-flex items-center gap-1 mb-6 transition-colors">
         <ChevronLeft className="size-3" /> Voltar para páginas
       </Link>
 
       <div className="flex items-center justify-between mb-8">
         <div>
           <h1 className="font-display text-3xl text-brand-text-light flex items-center gap-3">
             <ListChecks className="size-8 text-brand-gold" /> Criador de Páginas em Lote
           </h1>
           <p className="text-sm text-brand-text-muted mt-1">Crie múltiplas landing pages de uma só vez de forma controlada.</p>
         </div>
         <Badge variant="outline" className="bg-brand-gold/5 border-brand-gold/20 text-brand-gold px-3 py-1">
           MVP Lote Controlado
         </Badge>
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Input Section */}
         <div className="lg:col-span-1 space-y-6">
           <div className="space-y-3">
             <Label className="text-xs uppercase tracking-widest text-brand-text-muted">Lista de Procedimentos</Label>
             <Textarea 
               placeholder="Procedimento | URL opcional&#10;Botox | https://esteticabatel.com.br/protocolo/rejuvetox/&#10;Preenchimento Labial | https://outraclinica.com/labios&#10;Skinbooster"
               className="min-h-[300px] bg-brand-graphite/30 border-brand-gold/15 text-brand-text-light font-mono text-xs"
               value={input}
               onChange={e => setInput(e.target.value)}
               disabled={isBatchRunning}
             />
             <div className="p-3 rounded-lg bg-brand-black/40 border border-brand-gold/10">
               <p className="text-[11px] text-brand-text-muted flex items-start gap-2">
                 <AlertCircle className="size-3 mt-0.5 shrink-0" />
                 Use o formato: <strong>Procedimento | URL</strong>. Recomendado até 10 páginas por lote.
               </p>
             </div>
             <Button 
               onClick={handleAnalyze} 
               disabled={isAnalyzing || isBatchRunning || !input.trim()} 
               className="w-full bg-brand-graphite border border-brand-gold/20 text-brand-text-light hover:bg-brand-graphite/50"
             >
               {isAnalyzing ? <Loader2 className="size-4 animate-spin mr-2" /> : <Search className="size-4 mr-2" />}
               Analisar Lista
             </Button>
           </div>
         </div>
 
         {/* Preview/Execution Section */}
         <div className="lg:col-span-2 space-y-6">
           {items.length > 0 ? (
             <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <h3 className="text-sm font-medium text-brand-text-light uppercase tracking-widest">Itens para Processar ({items.length})</h3>
                   <div className="flex items-center gap-2">
                     {!isBatchRunning && items.some(it => it.status !== "completed") && (
                       <Button 
                         onClick={checkAllStatuses}
                         variant="outline"
                         className="border-brand-gold/20 text-brand-text-light hover:bg-brand-white/5"
                       >
                         Atualizar Status
                       </Button>
                     )}
                     <Button 
                       onClick={runBatch} 
                       disabled={isBatchRunning} 
                       className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90"
                     >
                       {isBatchRunning ? <Loader2 className="size-4 animate-spin mr-2" /> : <Play className="size-4 mr-2" />}
                       {items.some(it => it.status === "completed") ? "Retomar Lote" : "Iniciar Processamento"}
                     </Button>
                   </div>
                 </div>
 
               <div className="rounded-xl border border-brand-gold/15 bg-brand-graphite/20 overflow-hidden">
                 <Table>
                   <TableHeader className="bg-brand-black/40">
                     <TableRow className="hover:bg-transparent border-brand-gold/10">
                       <TableHead className="text-brand-text-muted text-[10px] uppercase">Procedimento</TableHead>
                       <TableHead className="text-brand-text-muted text-[10px] uppercase">Tipo</TableHead>
                       <TableHead className="text-brand-text-muted text-[10px] uppercase">Status</TableHead>
                       <TableHead className="text-brand-text-muted text-[10px] uppercase text-right">Ações</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {items.map((item) => (
                       <TableRow key={item.id} className="border-brand-gold/5 hover:bg-brand-white/5 transition-colors">
                         <TableCell>
                           <div className="flex flex-col">
                             <span className="text-sm font-medium text-brand-text-light">{item.procedimento}</span>
                             <span className="text-[10px] text-brand-text-muted font-mono">/p/{item.slug}</span>
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex flex-col gap-1">
                             {item.type === "preserve_literal" ? (
                               <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] w-fit">Batel (Preservar)</Badge>
                             ) : item.type === "inspiration_only" ? (
                               <Badge className="bg-brand-gold/10 text-brand-gold border-brand-gold/20 text-[9px] w-fit">Inspiração</Badge>
                             ) : (
                               <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] w-fit">IA Pura</Badge>
                             )}
                             {item.url && (
                               <span className="text-[9px] text-brand-text-muted truncate max-w-[120px]">{item.url}</span>
                             )}
                           </div>
                         </TableCell>
                         <TableCell>
                           {item.status === "pending" && (
                             <div className="flex items-center gap-1.5 text-brand-text-muted text-xs">
                               <div className="size-1.5 rounded-full bg-brand-text-muted/30" />
                               Pendente
                             </div>
                           )}
                           {item.status === "processing_research" && (
                             <div className="flex items-center gap-1.5 text-brand-gold text-xs animate-pulse">
                               <Search className="size-3" />
                               Pesquisando...
                             </div>
                           )}
                            {item.status === "processing_gen" && (
                              <div className="flex items-center gap-1.5 text-brand-gold text-xs">
                                <Loader2 className="size-3 animate-spin" />
                                Criando Blocos...
                              </div>
                            )}
                            {item.status === "finalizing" && (
                              <div className="flex items-center gap-1.5 text-brand-gold text-xs">
                                <Loader2 className="size-3 animate-spin" />
                                Finalizando...
                              </div>
                            )}
                            {item.status === "completed" && (
                              <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-medium">
                                <CheckCircle2 className="size-3" />
                                Concluído
                              </div>
                            )}
                           {item.status === "error" && (
                             <div className="flex items-center gap-1.5 text-brand-bordeaux text-xs" title={item.error}>
                               <AlertCircle className="size-3" />
                               Erro
                             </div>
                           )}
                         </TableCell>
                         <TableCell className="text-right">
                           {item.status === "completed" && item.resultSlug && (
                             <Link 
                               to={`/admin/paginas/${item.resultSlug}`}
                               target="_blank"
                               className="inline-flex items-center gap-1.5 text-brand-gold hover:text-brand-gold/80 text-[11px] font-medium transition-colors"
                             >
                               Abrir Editor <ExternalLink className="size-3" />
                             </Link>
                           )}
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-brand-gold/10 rounded-xl p-12 text-center bg-brand-graphite/10">
               <div className="size-16 rounded-full bg-brand-gold/5 flex items-center justify-center mb-4">
                 <ListChecks className="size-8 text-brand-gold/30" />
               </div>
               <h4 className="text-brand-text-light font-medium mb-1">Nenhum procedimento analisado</h4>
               <p className="text-xs text-brand-text-muted max-w-sm">
                 Insira sua lista de procedimentos no campo ao lado e clique em "Analisar Lista" para começar.
               </p>
             </div>
           )}
         </div>
       </div>
     </div>
   );
 }