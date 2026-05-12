import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BLOCK_LABELS, type BlockType, type PageBlockRow } from "@/types/blocks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ExternalLink,
  Save,
  Send,
   Undo2,
   Loader2,
   Layout,
   Settings2,
   Sparkles,
   AlertTriangle,
   ShieldCheck,
   History,
 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
 import { BlockForm } from "@/components/admin/BlockForm";
 import { DiffViewer } from "@/components/admin/DiffViewer";
import { ImportBlockModal } from "@/components/admin/ImportBlockModal";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { useAuth } from "@/hooks/use-auth";
import { arrayMove } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { EditorLayout } from "@/components/admin/editor/EditorLayout";
import { SidebarBlockList } from "@/components/admin/editor/SidebarBlockList";

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];
const asJson = (v: unknown) => v as Json;

type DraftBlock = Omit<PageBlockRow, "page_id"> & { _new?: boolean; _dirty?: boolean };

const ALL_TYPES: BlockType[] = [
  "hero",
  "authority_strip",
  "manifesto_curto",
  "metodo",
  "casos",
  "preco_ancora",
  "depoimentos",
  "ai_opinions",
  "equipe_rt",
  "cursos",
  "faq",
  "cta_final",
  "beneficios_grid",
  "procedimento_detalhado_v2",
];

export default function PageEditor() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-page", slug],
    enabled: !authLoading && isAdmin,
    queryFn: async () => {
      const { data: page, error } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!page) return null;
      const { data: blocks, error: be } = await supabase
        .from("page_blocks")
        .select("*")
        .eq("page_id", page.id)
        .order("position");
      if (be) throw be;
      return { page, blocks: blocks ?? [] };
    },
  });

   const [pageMeta, setPageMeta] = useState({
     title: "",
     meta_title: "",
     meta_description: "",
     metadata: {} as Record<string, unknown>,
     source_snapshot: null as string | null,
   });
  const [blocks, setBlocks] = useState<DraftBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
 const [siteSettings, setSiteSettings] = useState<any>(null);
   const [showAddMenu, setShowAddMenu] = useState(false);
   const [showAudit, setShowAudit] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

 useEffect(() => {
   const fetchSiteSettings = async () => {
     const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
     if (data) setSiteSettings(data);
   };
   fetchSiteSettings();
 }, []);

  useEffect(() => {
    if (!data?.page) return;
     setPageMeta({
       title: data.page.title ?? "",
       meta_title: data.page.meta_title ?? "",
       meta_description: data.page.meta_description ?? "",
       metadata: (data.page as any).metadata ?? {},
       source_snapshot: (data.page as any).source_snapshot ?? null,
     });
    setBlocks(
      (data.blocks as PageBlockRow[]).map((b) => ({
        id: b.id,
        type: b.type as BlockType,
        position: b.position,
        enabled: b.enabled,
        mode: b.mode,
        data: (b.data ?? {}) as Record<string, unknown>,
        html_content: b.html_content,
      })),
    );
    if (!selectedId && data.blocks.length > 0) setSelectedId(null);
  }, [data?.page?.id]);

  useEffect(() => {
    if (selectedId) {
      const iframe = document.querySelector('iframe');
      iframe?.contentWindow?.postMessage({ type: 'SELECT_BLOCK', id: selectedId }, '*');
    }
  }, [selectedId]);

  const previewSrc = useMemo(() => (data?.page?.slug ? `/p/${data.page.slug}?preview=1` : ""), [data?.page?.slug]);

  function markDirty(id: string, patch: Partial<DraftBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch, _dirty: true } : b)));
  }

  function handleDragEnd(e: any) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIdx = prev.findIndex((b) => b.id === active.id);
      const newIdx = prev.findIndex((b) => b.id === over.id);
      return arrayMove(prev, oldIdx, newIdx).map((b, i) => ({ ...b, position: i, _dirty: true }));
    });
  }

 function addBlock(type: BlockType) {
   const id = `new-${crypto.randomUUID()}`;
   let initialData: Record<string, any> = {};
   
   if (type === "equipe_rt" && siteSettings?.rt_image) {
     initialData = {
       image_url: siteSettings.rt_image,
       register_label: siteSettings.rt_register || "",
     };
   }

   setBlocks((prev) => [
     ...prev, 
     { 
       id, 
       type, 
       position: prev.length, 
       enabled: true, 
       mode: "structured", 
       data: initialData, 
       html_content: null, 
       _new: true, 
       _dirty: true 
     }
   ]);
   setSelectedId(id);
   setShowAddMenu(false);
 }

  function handleImportBlock(type: BlockType, data: any) {
    const id = `new-${crypto.randomUUID()}`;
    setBlocks((prev) => [...prev, { id, type, position: prev.length, enabled: true, mode: "structured", data, html_content: null, _new: true, _dirty: true }]);
    setSelectedId(id);
    setIsImportModalOpen(false);
  }

  function removeBlock(id: string) {
    if (!confirm("Remover este bloco?")) return;
    const block = blocks.find((b) => b.id === id);
    if (block && !block._new) setDeletedIds((prev) => [...prev, id]);
    setBlocks((prev) => prev.filter((b) => b.id !== id).map((b, i) => ({ ...b, position: i, _dirty: true })));
    if (selectedId === id) setSelectedId(null);
  }

  async function handleSave() {
    if (!data?.page) return;
    setSaving(true);
    try {
      await supabase.from("pages").update({ title: pageMeta.title, meta_title: pageMeta.meta_title || null, meta_description: pageMeta.meta_description || null, metadata: asJson(pageMeta.metadata ?? {}) }).eq("id", data.page.id);
      if (deletedIds.length) await supabase.from("page_blocks").delete().in("id", deletedIds);
      const inserts = blocks.filter((b) => b._new).map((b) => ({ page_id: data.page.id, type: b.type, position: b.position, enabled: b.enabled, mode: b.mode, data: asJson(b.data), html_content: b.html_content }));
      if (inserts.length) await supabase.from("page_blocks").insert(inserts as any);
      const updates = blocks.filter((b) => !b._new && b._dirty).map((b) => supabase.from("page_blocks").update({ position: b.position, enabled: b.enabled, data: asJson(b.data), mode: b.mode, html_content: b.html_content }).eq("id", b.id));
      await Promise.all(updates);
      toast({ title: "Salvo com sucesso" });
      qc.invalidateQueries({ queryKey: ["admin-page", slug] });
      setDeletedIds([]);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handlePublish() {
    if (!data?.page) return;
    setPublishing(true);
    try {
      const { data: fresh } = await supabase.from("page_blocks").select("*").eq("page_id", data.page.id).order("position");
      const snapshot = { page: { slug: data.page.slug, title: pageMeta.title, metadata: pageMeta.metadata ?? {} }, blocks: fresh };
      await supabase.from("pages").update({ status: "published", published_at: new Date().toISOString(), published_snapshot: asJson(snapshot) }).eq("id", data.page.id);
      toast({ title: "Página publicada" });
      qc.invalidateQueries({ queryKey: ["admin-page", slug] });
    } catch (e: any) {
      toast({ title: "Erro ao publicar", description: e.message, variant: "destructive" });
    } finally { setPublishing(false); }
  }

  async function handleRevert() {
    if (!data?.page?.published_snapshot) return;
    if (!confirm("Reverter para a última versão publicada?")) return;
    qc.invalidateQueries({ queryKey: ["admin-page", slug] });
  }

  if (isLoading) return <div className="p-8 text-brand-text-muted">Carregando editor…</div>;
  if (!data?.page) return <div className="p-8"><Button onClick={() => navigate("/admin/paginas")}>Voltar</Button></div>;

  const dirty = blocks.some((b) => b._dirty || b._new) || deletedIds.length > 0;
  const selected = blocks.find((b) => b.id === selectedId) || null;

  return (
    <EditorLayout
      title={pageMeta.title || (data?.page ? data.page.slug : "")}
      isDrawerOpen={!!selectedId}
      onCloseDrawer={() => setSelectedId(null)}
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      topbar={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5 mr-4">
            <CopyLinkButton slug={data?.page?.slug || ""} status={data?.page?.status as any} />
            <Button variant="ghost" size="sm" asChild className="h-8 text-white/60 hover:text-white hover:bg-white/5 rounded-lg px-3 transition-colors">
              <a 
                href={data?.page?.status === "published" ? `/p/${data?.page?.slug}` : `/p/${data?.page?.slug}?preview=1`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center"
              >
                <ExternalLink className="size-3.5 mr-2" /> 
                <span className="text-sm font-medium">Preview</span>
              </a>
            </Button>
          </div>

          {dirty && (
            <Badge variant="outline" className="bg-brand-bordeaux/10 text-brand-bordeaux border-brand-bordeaux/20 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full animate-pulse mr-2">
              Não salvo
            </Badge>
          )}

          <Button variant="ghost" size="sm" onClick={handleRevert} className="h-9 text-white/40 hover:text-white rounded-xl px-3 transition-colors font-medium">
            <Undo2 className="size-3.5 mr-2" />
            <span className="text-sm">Reverter</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !dirty} className="h-9 bg-white/[0.02] border-white/10 text-white rounded-xl px-4 hover:bg-white/5 transition-all font-medium">
            {saving ? <Loader2 className="size-3.5 animate-spin mr-2" /> : <Save className="size-3.5 mr-2" />} 
            <span className="text-sm">Salvar</span>
          </Button>

          <Button size="sm" onClick={handlePublish} disabled={publishing || dirty} className="h-9 bg-brand-gold text-brand-green hover:bg-brand-gold/90 rounded-xl px-6 font-medium shadow-[0_0_20px_rgba(209,180,111,0.2)] transition-all active:scale-95">
            {publishing ? <Loader2 className="size-3.5 animate-spin mr-2" /> : <Send className="size-3.5 mr-2" />} 
            <span className="text-xs uppercase tracking-wider">Publicar</span>
          </Button>
        </div>
      }
      sidebar={
        <SidebarBlockList
          blocks={blocks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToggle={(id, enabled) => markDirty(id, { enabled })}
          onRemove={removeBlock}
          onDragEnd={handleDragEnd}
          onAddBlock={addBlock}
          onImportBlock={() => setIsImportModalOpen(true)}
          isCollapsed={isSidebarCollapsed}
          allBlockTypes={ALL_TYPES}
          showAddMenu={showAddMenu}
          setShowAddMenu={setShowAddMenu}
        />
      }
      preview={<iframe key={previewSrc} title="Preview" src={previewSrc} className="w-full h-full bg-white" />}
      drawer={
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          {selected ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="size-8 rounded-xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20"><Layout className="size-4 text-brand-gold" /></div>
                <div><h4 className="text-xs uppercase tracking-[0.2em] text-white/40 font-medium">Editando</h4><p className="text-sm font-medium text-white/90">{BLOCK_LABELS[selected.type]}</p></div>
              </div>
              <BlockForm type={selected.type} data={selected.data} onChange={(next) => markDirty(selected.id, { data: next })} pageTitle={pageMeta.title} />
            </>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10"><Settings2 className="size-4 text-white/60" /></div>
                <div><h4 className="text-xs uppercase tracking-[0.2em] text-white/40 font-medium">Página</h4><p className="text-sm font-medium text-white/90">Configurações Gerais</p></div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2"><Label className="text-[11px] uppercase text-white/30 font-medium">Título</Label><Input className="bg-white/5 border-white/10 rounded-xl focus:ring-brand-gold/50" value={pageMeta.title} onChange={(e) => setPageMeta((p) => ({ ...p, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="text-[11px] uppercase text-white/30 font-medium">SEO Title</Label><Input className="bg-white/5 border-white/10 rounded-xl focus:ring-brand-gold/50" value={pageMeta.meta_title} onChange={(e) => setPageMeta((p) => ({ ...p, meta_title: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="text-[11px] uppercase text-white/30 font-medium">SEO Description</Label><Textarea rows={4} className="bg-white/5 border-white/10 rounded-xl focus:ring-brand-gold/50" value={pageMeta.meta_description} onChange={(e) => setPageMeta((p) => ({ ...p, meta_description: e.target.value }))} /></div>
              </div>
               <div className="pt-8 border-t border-white/5 space-y-8">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2"><Sparkles className="size-3.5 text-brand-gold" /><h3 className="text-[11px] uppercase text-brand-gold/80 font-medium">IA Context & Compliance</h3></div>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setShowAudit(!showAudit)}
                     className={cn(
                       "h-7 text-[9px] uppercase tracking-wider transition-all",
                       showAudit ? "bg-brand-gold text-brand-green border-brand-gold" : "bg-white/5 border-white/10 text-white/60"
                     )}
                   >
                     <History className="size-3 mr-1.5" />
                     {showAudit ? "Fechar Auditoria" : "Ver Diff Original"}
                   </Button>
                 </div>

                 {showAudit && pageMeta.source_snapshot && (
                   <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                     <div className="flex items-center gap-2 text-brand-gold">
                       <History className="size-3" />
                       <span className="text-[10px] uppercase tracking-wider font-bold">Auditoria: Original vs Gerado</span>
                     </div>
                     <DiffViewer
                       oldText={pageMeta.source_snapshot}
                       newText={blocks.map(b => {
                         const d = b.data as any;
                         return `${d.title || d.title_html || ''}\n${d.paragraphs?.join('\n') || d.body || d.text || ''}`;
                       }).join('\n\n')}
                       className="max-h-[500px] overflow-y-auto"
                     />
                     <p className="text-[9px] text-white/30 italic">O diff compara o snapshot extraído (snapshot bruto) com o texto principal dos blocos gerados.</p>
                   </div>
                 )}
                   {pageMeta.metadata?.compliance_valid !== undefined && (
                     <Badge variant="outline" className={cn(
                       "text-[9px] uppercase tracking-widest",
                       pageMeta.metadata.compliance_valid ? "text-green-400 border-green-400/20 bg-green-400/5" : "text-yellow-400 border-yellow-400/20 bg-yellow-400/5"
                     )}>
                       {pageMeta.metadata.compliance_valid ? "Compliance OK" : "Compliance Requer Atenção"}
                     </Badge>
                   )}
                 </div>

                 {pageMeta.metadata?.compliance_warnings && (pageMeta.metadata.compliance_warnings as string[]).length > 0 && (
                   <div className="bg-yellow-400/5 border border-yellow-400/20 p-4 rounded-xl space-y-2">
                     <div className="flex items-center gap-2 text-yellow-400">
                       <AlertTriangle className="size-3" />
                       <span className="text-[10px] uppercase tracking-wider font-bold">Alertas de Compliance</span>
                     </div>
                     <ul className="space-y-1">
                       {(pageMeta.metadata.compliance_warnings as string[]).map((w, i) => (
                         <li key={i} className="text-[11px] text-white/60 flex items-start gap-2">
                           <span className="mt-1 size-1 rounded-full bg-yellow-400/40 shrink-0" />
                           {w}
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}

                 {(data.page as any).source_metadata?.origin === "batel_legacy" && (
                   <div className="bg-brand-gold/5 border border-brand-gold/20 p-4 rounded-xl space-y-3">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-brand-gold">
                         <ShieldCheck className="size-3" />
                         <span className="text-[10px] uppercase tracking-wider font-bold">Origem Legada Batel</span>
                       </div>
                       <History className="size-3 text-brand-gold/40 cursor-help" />
                     </div>
                     <div className="grid grid-cols-2 gap-2 text-[10px]">
                       <div className="p-2 bg-white/5 rounded-lg">
                         <span className="text-white/40 block mb-1">FAQs Reais</span>
                         <span className="text-white/90 font-mono">{(data.page as any).source_metadata.stats?.faqs_count ?? 0}</span>
                       </div>
                       <div className="p-2 bg-white/5 rounded-lg">
                         <span className="text-white/40 block mb-1">Depoimentos</span>
                         <span className="text-white/90 font-mono">{(data.page as any).source_metadata.stats?.testimonials_count ?? 0}</span>
                       </div>
                     </div>
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2"><Label className="text-[11px] uppercase text-white/30 font-medium">Tema</Label><Input className="bg-white/5 border-white/10 rounded-xl" value={String(pageMeta.metadata?.tema ?? "")} onChange={(e) => setPageMeta((p) => ({ ...p, metadata: { ...p.metadata, tema: e.target.value } }))} /></div>
                   <div className="space-y-2"><Label className="text-[11px] uppercase text-white/30 font-medium">Categoria</Label><Input className="bg-white/5 border-white/10 rounded-xl" value={String(pageMeta.metadata?.categoria ?? "")} onChange={(e) => setPageMeta((p) => ({ ...p, metadata: { ...p.metadata, categoria: e.target.value } }))} /></div>
                 </div>
               </div>
            </div>
          )}
          {isImportModalOpen && <ImportBlockModal open={isImportModalOpen} onOpenChange={setIsImportModalOpen} onImport={handleImportBlock} pageTitle={pageMeta.title} pageCategory={(pageMeta.metadata?.category as any) || ""} />}
        </div>
      }
    />
  );
}
