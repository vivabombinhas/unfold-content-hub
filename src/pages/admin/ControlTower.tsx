 import { useState, useMemo } from "react";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { 
   ShieldCheck, 
   Search, 
   ExternalLink, 
   Pencil, 
   Eye, 
   CheckCircle2, 
   AlertTriangle, 
   XCircle,
   Image as ImageIcon,
   FileText,
   RefreshCw,
   Filter,
   MoreHorizontal
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Badge } from "@/components/ui/badge";
 import { Checkbox } from "@/components/ui/checkbox";
 import { toast } from "sonner";
 import { Link } from "react-router-dom";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { cn } from "@/lib/utils";
 import { useAuth } from "@/hooks/use-auth";
 
 interface PageHealth {
   id: string;
   title: string;
   slug: string;
   status: string;
   is_reviewed: boolean;
   fidelity_score: 'low' | 'medium' | 'high' | null;
   seo_score: number;
   compliance_score: number;
   updated_at: string;
   metadata: any;
   meta_title: string;
   meta_description: string;
   blocks_count: number;
   has_hero: boolean;
 }
 
 export default function ControlTower() {
   const queryClient = useQueryClient();
   const { isAdmin, loading: authLoading } = useAuth();
   const [searchTerm, setSearchTerm] = useState("");
   const [filterStatus, setFilterStatus] = useState<string>("all");
   const [filterReviewed, setFilterReviewed] = useState<string>("all");
   const [isScanning, setIsScanning] = useState(false);
 
   const { data: pages, isLoading } = useQuery({
     queryKey: ["admin-control-tower"],
     queryFn: async () => {
       // Fetch pages
       const { data: pagesData, error: pagesError } = await supabase
         .from("pages")
         .select("id, title, slug, status, is_reviewed, fidelity_score, seo_score, compliance_score, updated_at, metadata, meta_title, meta_description")
         .order("updated_at", { ascending: false });
 
       if (pagesError) throw pagesError;
 
       // Fetch blocks count and hero check
       const { data: blocksData, error: blocksError } = await supabase
         .from("page_blocks")
         .select("page_id, type, enabled");
 
       if (blocksError) throw blocksError;
 
       // Map data
       return pagesData.map(page => {
         const pageBlocks = blocksData.filter(b => b.page_id === page.id && b.enabled);
         return {
           ...page,
           blocks_count: pageBlocks.length,
           has_hero: pageBlocks.some(b => b.type === 'hero'),
         } as PageHealth;
       });
     },
     enabled: !authLoading && isAdmin,
   });
 
   const updateReviewedMutation = useMutation({
     mutationFn: async ({ id, is_reviewed }: { id: string, is_reviewed: boolean }) => {
       const { error } = await supabase
         .from("pages")
         .update({ is_reviewed } as any)
         .eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-control-tower"] });
       toast.success("Status de revisão atualizado");
     }
   });
 
   const filteredPages = useMemo(() => {
     if (!pages) return [];
     return pages.filter(p => {
       const matchesSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.slug?.toLowerCase().includes(searchTerm.toLowerCase());
       const matchesStatus = filterStatus === "all" || p.status === filterStatus;
       const matchesReviewed = filterReviewed === "all" || 
                                (filterReviewed === "reviewed" ? p.is_reviewed : !p.is_reviewed);
       return matchesSearch && matchesStatus && matchesReviewed;
     });
   }, [pages, searchTerm, filterStatus, filterReviewed]);
 
   const handleScanAll = async () => {
     setIsScanning(true);
     try {
       // For each page, we'll calculate basic scores locally and update them in bulk (or one by one for simplicity now)
       // In a real scenario, this would be an Edge Function.
       for (const page of filteredPages) {
         let seo = 0;
         if (page.meta_title) seo += 25;
         if (page.meta_description) seo += 25;
         if (page.slug && page.slug.length > 3) seo += 25;
         if (page.metadata?.area_anatomica) seo += 25;
 
         let compliance = 100;
         if (page.metadata?.compliance_warnings?.length > 0) compliance -= 20 * page.metadata.compliance_warnings.length;
         compliance = Math.max(0, compliance);
 
         let fidelity: 'low' | 'medium' | 'high' = 'low';
         if (page.blocks_count > 8) fidelity = 'high';
         else if (page.blocks_count > 4) fidelity = 'medium';
 
         await supabase
           .from("pages")
           .update({ 
             seo_score: seo, 
             compliance_score: compliance, 
             fidelity_score: fidelity,
             last_scanned_at: new Date().toISOString()
           } as any)
           .eq("id", page.id);
       }
       queryClient.invalidateQueries({ queryKey: ["admin-control-tower"] });
       toast.success("Varredura completa!");
     } catch (err) {
       toast.error("Erro durante a varredura");
     } finally {
       setIsScanning(false);
     }
   };
 
   if (isLoading) return <div className="p-8 flex items-center justify-center min-h-[400px]">Carregando Torre de Controle...</div>;
 
   return (
     <div className="p-8 max-w-[1600px] mx-auto">
       <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
         <div>
           <div className="flex items-center gap-2 mb-1">
             <ShieldCheck className="size-6 text-brand-gold" />
             <h1 className="font-display text-3xl text-brand-text-light">Torre de Controle</h1>
           </div>
           <p className="text-sm text-brand-text-muted">Dashboard central de qualidade, SEO e compliance para todas as landing pages.</p>
         </div>
         <div className="flex items-center gap-3">
           <Button 
             variant="outline" 
             className="border-brand-gold/20 text-brand-gold hover:bg-brand-gold/5"
             onClick={handleScanAll}
             disabled={isScanning}
           >
             <RefreshCw className={cn("size-4 mr-2", isScanning && "animate-spin")} />
             {isScanning ? "Escaneando..." : "Escanear Todas"}
           </Button>
         </div>
       </div>
 
       {/* Filtros */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
         <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-text-muted" />
           <Input
             placeholder="Buscar página..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="pl-9 bg-brand-graphite/40 border-brand-gold/20 text-brand-text-light"
           />
         </div>
         <select 
           value={filterStatus}
           onChange={(e) => setFilterStatus(e.target.value)}
           className="bg-brand-graphite/40 border-brand-gold/20 text-brand-text-light rounded-md px-3 text-sm focus:ring-1 focus:ring-brand-gold outline-none"
         >
           <option value="all">Todos Status</option>
           <option value="published">Publicadas</option>
           <option value="draft">Rascunhos</option>
         </select>
         <select 
           value={filterReviewed}
           onChange={(e) => setFilterReviewed(e.target.value)}
           className="bg-brand-graphite/40 border-brand-gold/20 text-brand-text-light rounded-md px-3 text-sm focus:ring-1 focus:ring-brand-gold outline-none"
         >
           <option value="all">Todas Revisões</option>
           <option value="reviewed">Revisadas</option>
           <option value="pending">Pendentes</option>
         </select>
         <div className="flex items-center justify-end text-xs text-brand-text-muted gap-4">
           <span>{filteredPages.length} páginas encontradas</span>
         </div>
       </div>
 
       <div className="border border-brand-gold/15 bg-brand-graphite/20 overflow-hidden rounded-xl shadow-2xl">
         <div className="overflow-x-auto">
           <table className="w-full text-sm">
             <thead className="text-left text-[10px] uppercase tracking-[0.2em] text-brand-text-muted border-b border-brand-gold/15 bg-brand-graphite/40">
               <tr>
                 <th className="px-6 py-4 w-10">Revisada</th>
                 <th className="px-6 py-4">Página</th>
                 <th className="px-6 py-4">Fidelidade</th>
                 <th className="px-6 py-4">Saúde SEO</th>
                 <th className="px-6 py-4">Compliance</th>
                 <th className="px-6 py-4">Mídia</th>
                 <th className="px-6 py-4">Ações</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-brand-gold/10">
               {filteredPages.map((page) => (
                 <tr key={page.id} className="hover:bg-brand-gold/[0.02] transition-colors group">
                   <td className="px-6 py-4 text-center">
                     <Checkbox 
                       checked={page.is_reviewed} 
                       onCheckedChange={(checked) => updateReviewedMutation.mutate({ id: page.id, is_reviewed: !!checked })}
                       className="border-brand-gold/40 data-[state=checked]:bg-brand-gold data-[state=checked]:text-brand-bg"
                     />
                   </td>
                   <td className="px-6 py-4">
                     <div className="flex flex-col">
                       <span className="font-medium text-brand-text-light group-hover:text-brand-gold transition-colors">{page.title}</span>
                       <span className="text-[10px] font-mono text-brand-text-muted">/p/{page.slug}</span>
                     </div>
                   </td>
                   <td className="px-6 py-4">
                     <FidelityBadge score={page.fidelity_score} />
                   </td>
                   <td className="px-6 py-4">
                     <SEOHealthScore score={page.seo_score} />
                   </td>
                   <td className="px-6 py-4">
                     <ComplianceStatus score={page.compliance_score} warnings={page.metadata?.compliance_warnings} />
                   </td>
                   <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                       <ImageIcon className={cn("size-4", page.has_hero ? "text-green-500" : "text-brand-text-muted")} />
                       {page.has_hero ? <CheckCircle2 className="size-3 text-green-500" /> : <XCircle className="size-3 text-red-400" />}
                     </div>
                   </td>
                   <td className="px-6 py-4">
                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button asChild size="icon" variant="ghost" className="size-8 text-brand-text-muted hover:text-brand-gold">
                         <Link to={`/admin/paginas/${page.slug}`} title="Editar no CMS">
                           <Pencil className="size-4" />
                         </Link>
                       </Button>
                       <Button asChild size="icon" variant="ghost" className="size-8 text-brand-text-muted hover:text-brand-gold">
                         <a href={`/p/${page.slug}?preview=1`} target="_blank" rel="noreferrer" title="Visualizar Página">
                           <Eye className="size-4" />
                         </a>
                       </Button>
                       <Button asChild size="icon" variant="ghost" className="size-8 text-brand-text-muted hover:text-brand-gold">
                         <a href={`/functions/v1/render-page?slug=${page.slug}`} target="_blank" rel="noreferrer" title="Ver SSR (Claude/Google view)">
                           <FileText className="size-4" />
                         </a>
                       </Button>
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>
     </div>
   );
 }
 
 function FidelityBadge({ score }: { score: 'low' | 'medium' | 'high' | null }) {
   if (!score) return <Badge variant="outline" className="border-brand-gold/10 text-brand-text-muted">N/A</Badge>;
   
   const styles = {
     low: "bg-red-500/10 text-red-400 border-red-500/20",
     medium: "bg-orange-500/10 text-orange-400 border-orange-500/20",
     high: "bg-green-500/10 text-green-400 border-green-500/20"
   };
 
   const labels = {
     low: "Baixa Fidelidade",
     medium: "Média Fidelidade",
     high: "Alta Fidelidade"
   };
 
   return (
     <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] uppercase tracking-wider", styles[score])}>
       {labels[score]}
     </Badge>
   );
 }
 
 function SEOHealthScore({ score }: { score: number }) {
   const colorClass = score >= 90 ? "bg-green-500" : score >= 60 ? "bg-brand-gold" : "bg-red-500";
   
   return (
     <div className="flex items-center gap-3 min-w-[120px]">
       <div className="flex-1 h-1.5 bg-brand-graphite/60 rounded-full overflow-hidden">
         <div 
           className={cn("h-full transition-all duration-500", colorClass)} 
           style={{ width: `${score}%` }}
         />
       </div>
       <span className="text-xs font-mono font-bold text-brand-text-light">{score}%</span>
     </div>
   );
 }
 
 function ComplianceStatus({ score, warnings }: { score: number, warnings?: string[] }) {
   const hasWarnings = warnings && warnings.length > 0;
   
   return (
     <div className="flex items-center gap-2">
       {score >= 100 ? (
         <div className="flex items-center gap-1.5 text-green-400">
           <CheckCircle2 className="size-4" />
           <span className="text-[10px] uppercase font-bold tracking-wider">OK</span>
         </div>
       ) : hasWarnings ? (
         <div className="flex items-center gap-1.5 text-orange-400" title={warnings.join('\n')}>
           <AlertTriangle className="size-4" />
           <span className="text-[10px] uppercase font-bold tracking-wider">{warnings.length} Alertas</span>
         </div>
       ) : (
         <div className="flex items-center gap-1.5 text-red-400">
           <XCircle className="size-4" />
           <span className="text-[10px] uppercase font-bold tracking-wider">Revisar</span>
         </div>
       )}
     </div>
   );
 }