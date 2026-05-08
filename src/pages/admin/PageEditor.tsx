import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BLOCK_LABELS, type BlockType, type PageBlockRow } from "@/types/blocks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ExternalLink,
  Save,
  Send,
  Undo2,
  Plus,
  Trash2,
  Download,
  Search,
  Loader2,
  Image as ImageIcon,
  AlertTriangle,
  Layout,
  Settings2,
  Sparkles,
  GripVertical,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BlockForm } from "@/components/admin/BlockForm";
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
  });
  const [blocks, setBlocks] = useState<DraftBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [extractingImages, setExtractingImages] = useState(false);
  const [scanUrl, setScanUrl] = useState("");
  const [extractError, setExtractError] = useState<{ url: string; message: string; status?: number } | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  async function handleExtractImages() {
    if (!scanUrl || !scanUrl.includes("esteticabatel.com.br")) {
      toast({ title: "URL inválida", description: "Use uma URL da clínica Batel.", variant: "destructive" });
      return;
    }
    setExtractingImages(true);
    setExtractError(null);
    try {
      const { data: res, error } = await supabase.functions.invoke("extract-page-images", {
        timeout: 60000,
        body: { url: scanUrl, page_title: pageMeta.title, page_category: (pageMeta.metadata?.categoria as string) || "" },
      });
      if (error) throw error;
      const candidates = res.image_candidates || [];
      setPageMeta(prev => ({
        ...prev,
        metadata: { ...prev.metadata, image_candidates: candidates, old_url: scanUrl }
      }));
      toast({ title: "Busca concluída", description: `${candidates.length} imagens encontradas.` });
    } catch (e: any) {
      setExtractError({ url: scanUrl, message: e.message || "Erro na Edge Function" });
    } finally {
      setExtractingImages(false);
    }
  }

  useEffect(() => {
    if (!data?.page) return;
    setPageMeta({
      title: data.page.title ?? "",
      meta_title: data.page.meta_title ?? "",
      meta_description: data.page.meta_description ?? "",
      metadata: (data.page as any).metadata ?? {},
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
    setBlocks((prev) => [...prev, { id, type, position: prev.length, enabled: true, mode: "structured", data: {}, html_content: null, _new: true, _dirty: true }]);
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
      isDrawerOpen={!!selectedId}
      onCloseDrawer={() => setSelectedId(null)}
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      topbar={
        <header className="h-[64px] border-b border-white/5 bg-[#0F0F0F] px-6 flex items-center justify-between shadow-sm relative z-50">
          <div className="flex items-center gap-6">
            <Link to="/admin/paginas" className="text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="size-5" />
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-sm font-semibold text-white/90 tracking-tight">{pageMeta.title || data.page.slug}</h1>
                <Badge className={cn("text-[10px] h-5 px-2 rounded-full font-bold uppercase tracking-widest", data.page.status === "published" ? "bg-brand-gold/20 text-brand-gold border-brand-gold/30" : "bg-white/5 text-white/40")}>
                  {data.page.status === "published" ? "Publicada" : "Rascunho"}
                </Badge>
                {dirty && <span className="text-brand-bordeaux text-[9px] font-bold uppercase animate-pulse">● Não salvo</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5 mr-4">
              <CopyLinkButton slug={data.page.slug} status={data.page.status as any} />
              <Button variant="ghost" size="sm" asChild className="h-8 text-white/60">
                <a href={data.page.status === "published" ? `/p/${data.page.slug}` : `/p/${data.page.slug}?preview=1`} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5 mr-2" /> <span className="text-xs">Preview</span>
                </a>
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRevert} className="text-white/40">Reverter</Button>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !dirty} className="bg-white/[0.02] border-white/10 text-white rounded-xl px-4">
              {saving ? <Loader2 className="size-3.5 animate-spin mr-2" /> : <Save className="size-3.5 mr-2" />} Salvar
            </Button>
            <Button size="sm" onClick={handlePublish} disabled={publishing || dirty} className="bg-brand-gold text-brand-green rounded-xl px-6 font-bold">
              {publishing ? <Loader2 className="size-3.5 animate-spin mr-2" /> : <Send className="size-3.5 mr-2" />} Publicar
            </Button>
          </div>
        </header>
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
                <div><h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Editando</h4><p className="text-sm font-semibold text-white/90">{BLOCK_LABELS[selected.type]}</p></div>
              </div>
              <BlockForm type={selected.type} data={selected.data} onChange={(next) => markDirty(selected.id, { data: next })} pageTitle={pageMeta.title} />
            </>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10"><Settings2 className="size-4 text-white/60" /></div>
                <div><h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Página</h4><p className="text-sm font-semibold text-white/90">Configurações Gerais</p></div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2"><Label className="text-[11px] font-bold uppercase text-white/30">Título</Label><Input className="bg-white/5 border-white/10 rounded-xl" value={pageMeta.title} onChange={(e) => setPageMeta((p) => ({ ...p, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="text-[11px] font-bold uppercase text-white/30">SEO Title</Label><Input className="bg-white/5 border-white/10 rounded-xl" value={pageMeta.meta_title} onChange={(e) => setPageMeta((p) => ({ ...p, meta_title: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="text-[11px] font-bold uppercase text-white/30">SEO Description</Label><Textarea rows={4} className="bg-white/5 border-white/10 rounded-xl" value={pageMeta.meta_description} onChange={(e) => setPageMeta((p) => ({ ...p, meta_description: e.target.value }))} /></div>
              </div>
              <div className="pt-8 border-t border-white/5 space-y-6">
                <div className="flex items-center gap-2"><Sparkles className="size-3.5 text-brand-gold" /><h3 className="text-[11px] font-bold uppercase text-brand-gold/80">IA Context</h3></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-[11px] font-bold uppercase text-white/30">Tema</Label><Input className="bg-white/5 border-white/10 rounded-xl" value={String(pageMeta.metadata?.tema ?? "")} onChange={(e) => setPageMeta((p) => ({ ...p, metadata: { ...p.metadata, tema: e.target.value } }))} /></div>
                  <div className="space-y-2"><Label className="text-[11px] font-bold uppercase text-white/30">Categoria</Label><Input className="bg-white/5 border-white/10 rounded-xl" value={String(pageMeta.metadata?.categoria ?? "")} onChange={(e) => setPageMeta((p) => ({ ...p, metadata: { ...p.metadata, categoria: e.target.value } }))} /></div>
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
