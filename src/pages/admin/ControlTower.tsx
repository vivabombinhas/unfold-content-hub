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
    MoreHorizontal,
    Download,
    Check,
    Info
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
 
  interface PageAlert {
    type: 'error' | 'warning' | 'info';
    message: string;
  }
  
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
    alerts: PageAlert[];
  }
  
  export default function ControlTower() {
   const queryClient = useQueryClient();
   const { isAdmin, loading: authLoading } = useAuth();
   const [searchTerm, setSearchTerm] = useState("");
   const [filterStatus, setFilterStatus] = useState<string>("all");
   const [filterReviewed, setFilterReviewed] = useState<string>("all");
   const [isScanning, setIsScanning] = useState(false);
 
   const { data: allBlocks, isLoading: blocksLoading } = useQuery({
     queryKey: ["admin-all-blocks"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("page_blocks")
         .select("page_id, type, data, enabled");
       if (error) throw error;
       return data;
     },
     enabled: !authLoading && isAdmin,
   });
 
   const { data: pages, isLoading } = useQuery({
     queryKey: ["admin-control-tower"],
     queryFn: async () => {
       // Fetch pages
       const { data: pagesData, error: pagesError } = await supabase
         .from("pages")
         .select("id, title, slug, status, is_reviewed, fidelity_score, seo_score, compliance_score, updated_at, metadata, meta_title, meta_description")
         .order("updated_at", { ascending: false });
 
       if (pagesError) throw pagesError;
 
        // Map data
        return pagesData.map(page => {
          const pageBlocks = (allBlocks || []).filter(b => b.page_id === page.id && b.enabled);
          const metadata = (page.metadata || {}) as any;
          return {
            ...page,
            blocks_count: pageBlocks.length,
            has_hero: pageBlocks.some(b => b.type === 'hero'),
            alerts: metadata.alerts || [],
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
      let count = 0;
      try {
        for (const page of filteredPages) {
          const pageBlocks = (allBlocks || []).filter(b => b.page_id === page.id && b.enabled);
          const pageContentStr = JSON.stringify(pageBlocks).toLowerCase();
          const alerts: PageAlert[] = [];
          
          // 1. SEO Score (0-100)
          let seo = 0;
          if (page.meta_title) seo += 20; else alerts.push({ type: 'warning', message: 'Faltando Meta Title' });
          if (page.meta_description) seo += 20; else alerts.push({ type: 'warning', message: 'Faltando Meta Description' });
          if (page.slug && page.slug.length > 5) seo += 10;
          
          const faqBlock = pageBlocks.find(b => b.type === 'faq');
          if (faqBlock) {
            seo += 20;
            const items = (faqBlock.data as any)?.items || [];
            const questions = items.map((i: any) => (i.question || '').toLowerCase());
            
            // 1.5 FAQ Quality Audit
            if (items.length > 15) {
              alerts.push({ type: 'error', message: `FAQ Excessiva: ${items.length} itens (Máx sugerido: 15)` });
              seo -= 10;
            }
            if (items.length < 5) {
              alerts.push({ type: 'warning', message: 'FAQ Curta: < 5 perguntas' });
            }

            // Redundância
            const intents = ['dor', 'recuperação', 'resultado', 'segurança', 'preço', 'sessão'];
            intents.forEach(intent => {
              const count = questions.filter((q: string) => q.includes(intent)).length;
              if (count > 2) alerts.push({ type: 'warning', message: `Possível redundância na FAQ (termo "${intent}" aparece ${count}x)` });
            });

            // Valor AEO
            const startsWithQuestion = questions.filter((q: string) => 
              /^(como|qual|o que|quando|onde|quem|por que|quanto|é)/i.test(q)
            ).length;
            if (startsWithQuestion < items.length * 0.7) {
              alerts.push({ type: 'info', message: 'FAQ com baixo valor AEO (perguntas pouco naturais)' });
            }
          } else {
            alerts.push({ type: 'error', message: 'Faltando Bloco FAQ' });
          }
          
          const hasHero = pageBlocks.some(b => b.type === 'hero');
          if (hasHero) seo += 30; else alerts.push({ type: 'error', message: 'Faltando Hero Image' });

          // 2. Compliance Score (0-100)
          let compliance = 0;
          const metadata = page.metadata || {};
          
          // Sensitive terms check
          const forbiddenTerms = [
            { term: 'dermatologista', message: 'Termo sensível (Profissão não presente na clínica): dermatologista' },
            { term: 'cirurgião plástico', message: 'Termo sensível (Profissão não presente na clínica): cirurgião plástico' },
            { term: 'médico', message: 'Equipe é exclusivamente Biomédica/Esteticista. Evitar termo: médico' },
            { term: 'risco à vida', message: 'Termo proibido (Compliance): risco à vida' },
            { term: 'nossa garantia', message: 'Termo proibido (Compliance): nossa garantia' }
          ];
          
          forbiddenTerms.forEach(({ term, message }) => {
            if (pageContentStr.includes(term)) {
              alerts.push({ type: 'error', message });
            }
          });
          
          // Required EEAT elements
          const hasByline = pageContentStr.includes('daniele florêncio');
          if (hasByline) compliance += 25; else alerts.push({ type: 'error', message: 'Faltando Byline (Dra. Daniele Florêncio)' });
          
          const hasCRBM = pageContentStr.includes('crbm 8242-pr');
          if (hasCRBM) compliance += 25; else alerts.push({ type: 'error', message: 'Faltando CRBM correto' });

          const hasClinicalReviewer = pageContentStr.includes('revisão clínica');
          if (hasClinicalReviewer) compliance += 25; else alerts.push({ type: 'warning', message: 'Faltando selo de Revisão Clínica' });
          
          const hasDisclaimer = pageContentStr.includes('disclaimer') || pageContentStr.includes('nota:') || pageContentStr.includes('os resultados podem variar');
          if (hasDisclaimer) compliance += 25; else alerts.push({ type: 'warning', message: 'Faltando Disclaimer EEAT' });

          // 3. Fidelity Score
          let fidelity: 'low' | 'medium' | 'high' = 'low';
          const totalBlocks = pageBlocks.length;
          if (totalBlocks >= 10) fidelity = 'high';
          else if (totalBlocks >= 5) fidelity = 'medium';
          else alerts.push({ type: 'info', message: 'Página Pobre (poucos blocos)' });

          // 4. Media Quality
          const heroBlock = pageBlocks.find(b => b.type === 'hero');
          if (heroBlock) {
            const heroImg = (heroBlock.data as any)?.imageUrl || (heroBlock.data as any)?.image;
            if (!heroImg) alerts.push({ type: 'error', message: 'Hero sem imagem válida' });
            else if (heroImg.includes('anatomia') || heroImg.includes('muscle') || heroImg.includes('anatomy')) {
              alerts.push({ type: 'warning', message: 'Hero pode ser imagem anatômica' });
            }
          }

          // Update Database
          await supabase
            .from("pages")
            .update({ 
              seo_score: Math.min(100, seo), 
              compliance_score: Math.min(100, compliance), 
              fidelity_score: fidelity,
              metadata: { ...metadata, alerts },
              last_scanned_at: new Date().toISOString()
            } as any)
            .eq("id", page.id);
            
          count++;
        }
        queryClient.invalidateQueries({ queryKey: ["admin-control-tower"] });
        toast.success(`Varredura completa! ${count} páginas processadas.`);
      } catch (err) {
        console.error(err);
        toast.error("Erro durante a varredura");
      } finally {
        setIsScanning(false);
      }
    };

    const handleExportCSV = () => {
      if (!filteredPages.length) return;
      
      const headers = [
        "Título", "Slug", "Status", "Revisada", "Fidelidade", "SEO (%)", "Compliance (%)", "Alertas", "Última Atualização"
      ];
      
      const rows = filteredPages.map(p => [
        p.title,
        p.slug,
        p.status,
        p.is_reviewed ? "Sim" : "Não",
        p.fidelity_score || "N/A",
        p.seo_score,
        p.compliance_score,
        (p.alerts || []).map(a => a.message).join(" | "),
        new Date(p.updated_at).toLocaleDateString()
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `qa-report-torre-controle-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Relatório QA exportado com sucesso!");
    };
  
    if (isLoading) return <div className="p-8 flex items-center justify-center min-h-[400px] text-brand-text-muted">Carregando Torre de Controle...</div>;
 
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
              onClick={handleExportCSV}
              disabled={isScanning || !filteredPages.length}
            >
              <Download className="size-4 mr-2" />
              Exportar QA
            </Button>
            <Button 
              variant="outline" 
              className="border-brand-gold/20 text-brand-gold hover:bg-brand-gold/5"
              onClick={handleScanAll}
              disabled={isScanning}
            >
              <RefreshCw className={cn("size-4 mr-2", isScanning && "animate-spin")} />
              {isScanning ? "Escaneando..." : "Revalidar em Lote"}
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
                  <th className="px-6 py-4">FAQ Audit</th>
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
                      <ComplianceStatus score={page.compliance_score} alerts={page.alerts} />
                    </td>
                    <td className="px-6 py-4">
                      <FAQHealthStatus alerts={page.alerts || []} />
                    </td>

  function FAQHealthStatus({ alerts }: { alerts: PageAlert[] }) {
    const faqAlerts = alerts.filter(a => a.message.toLowerCase().includes('faq'));
    const critical = faqAlerts.filter(a => a.type === 'error').length;
    const warnings = faqAlerts.filter(a => a.type === 'warning').length;
    
    if (faqAlerts.length === 0) return <Badge variant="outline" className="text-[10px] text-green-500/70 border-green-500/20 bg-green-500/5">Excelente</Badge>;
    
    return (
      <div className="flex flex-col gap-1">
        {critical > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-red-400 font-bold">
            <XCircle className="size-3 text-red-400" /> {critical} Críticos
          </div>
        )}
        {warnings > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-orange-400">
            <AlertTriangle className="size-3 text-orange-400" /> {warnings} Alertas
          </div>
        )}
        {critical === 0 && warnings === 0 && faqAlerts.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-brand-gold">
            <Info className="size-3 text-brand-gold" /> {faqAlerts.length} Notas
          </div>
        )}
      </div>
    );
  }

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
 
  function ComplianceStatus({ score, alerts }: { score: number, alerts?: PageAlert[] }) {
    const errors = (alerts || []).filter(a => a.type === 'error');
    const warnings = (alerts || []).filter(a => a.type === 'warning');
    
    return (
      <div className="flex items-center gap-2">
        {score >= 100 && !errors.length ? (
          <div className="flex items-center gap-1.5 text-green-400">
            <CheckCircle2 className="size-4" />
            <span className="text-[10px] uppercase font-bold tracking-wider">OK</span>
          </div>
        ) : errors.length > 0 ? (
          <div className="flex items-center gap-1.5 text-red-400" title={errors.map(e => e.message).join('\n')}>
            <XCircle className="size-4" />
            <span className="text-[10px] uppercase font-bold tracking-wider">{errors.length} Críticos</span>
          </div>
        ) : warnings.length > 0 ? (
          <div className="flex items-center gap-1.5 text-orange-400" title={warnings.map(w => w.message).join('\n')}>
            <AlertTriangle className="size-4" />
            <span className="text-[10px] uppercase font-bold tracking-wider">{warnings.length} Alertas</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-brand-text-muted">
            <Info className="size-4" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Pendente</span>
          </div>
        )}
      </div>
    );
  }