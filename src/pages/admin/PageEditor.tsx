import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BLOCK_LABELS, type BlockType, type PageBlockRow } from "@/types/blocks";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ExternalLink,
  GripVertical,
  Save,
  Send,
  Undo2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BlockForm } from "@/components/admin/BlockForm";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { useAuth } from "@/hooks/use-auth";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

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
];

export default function PageEditor() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  // Wait for auth/admin check before firing the query — otherwise RLS returns
  // nothing and the user has to refresh until the session is restored.
  const { isAdmin, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-page", slug],
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
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

  // Estado local editável
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

  useEffect(() => {
    if (!data?.page) return;
    setPageMeta({
      title: data.page.title ?? "",
      meta_title: data.page.meta_title ?? "",
      meta_description: data.page.meta_description ?? "",
      metadata:
        (data.page as unknown as { metadata?: Record<string, unknown> }).metadata ?? {},
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
    setDeletedIds([]);
    if (!selectedId && data.blocks.length > 0) setSelectedId(data.blocks[0].id);
  }, [data?.page?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const selected = useMemo(() => blocks.find((b) => b.id === selectedId) ?? null, [blocks, selectedId]);
  const previewSrc = useMemo(
    () => (data?.page?.slug ? `/p/${data.page.slug}?preview=1` : ""),
    [data?.page?.slug],
  );

  function markDirty(id: string, patch: Partial<DraftBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch, _dirty: true } : b)));
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIdx = prev.findIndex((b) => b.id === active.id);
      const newIdx = prev.findIndex((b) => b.id === over.id);
      const next = arrayMove(prev, oldIdx, newIdx).map((b, i) => ({
        ...b,
        position: i,
        _dirty: true,
      }));
      return next;
    });
  }

  function addBlock(type: BlockType) {
    const id = `new-${crypto.randomUUID()}`;
    setBlocks((prev) => [
      ...prev,
      {
        id,
        type,
        position: prev.length,
        enabled: true,
        mode: "structured",
        data: {},
        html_content: null,
        _new: true,
        _dirty: true,
      },
    ]);
    setSelectedId(id);
    setShowAddMenu(false);
  }

  function removeBlock(id: string) {
    if (!confirm("Remover este bloco? A ação só é definitiva ao salvar.")) return;
    const block = blocks.find((b) => b.id === id);
    if (block && !block._new) setDeletedIds((prev) => [...prev, id]);
    setBlocks((prev) => prev.filter((b) => b.id !== id).map((b, i) => ({ ...b, position: i, _dirty: true })));
    if (selectedId === id) setSelectedId(null);
  }

  async function handleSave() {
    if (!data?.page) return;
    setSaving(true);
    try {
      // Atualiza metadados da página
      const { error: pe } = await supabase
        .from("pages")
        .update({
          title: pageMeta.title,
          meta_title: pageMeta.meta_title || null,
          meta_description: pageMeta.meta_description || null,
          metadata: asJson(pageMeta.metadata ?? {}),
        })
        .eq("id", data.page.id);
      if (pe) throw pe;

      // Deletes
      if (deletedIds.length) {
        const { error: de } = await supabase.from("page_blocks").delete().in("id", deletedIds);
        if (de) throw de;
      }

      // Inserts (novos blocos)
      const inserts = blocks
        .filter((b) => b._new)
        .map((b) => ({
          page_id: data.page.id,
          type: b.type,
          position: b.position,
          enabled: b.enabled,
          mode: b.mode,
          data: asJson(b.data),
          html_content: b.html_content,
        }));
      let insertedMap: Record<string, string> = {};
      if (inserts.length) {
        const { data: ins, error: ie } = await supabase
          .from("page_blocks")
          .insert(inserts)
          .select("id, position, type");
        if (ie) throw ie;
        // Mapear pelo par (position+type) — único o suficiente neste lote
        const newBlocks = blocks.filter((b) => b._new);
        ins?.forEach((row, i) => {
          insertedMap[newBlocks[i].id] = row.id;
        });
      }

      // Updates (blocos existentes alterados)
      const updates = blocks
        .filter((b) => !b._new && b._dirty)
        .map((b) =>
          supabase
            .from("page_blocks")
            .update({
              position: b.position,
              enabled: b.enabled,
              data: asJson(b.data),
              mode: b.mode,
              html_content: b.html_content,
            })
            .eq("id", b.id),
        );
      const results = await Promise.all(updates);
      const updateErr = results.find((r) => r.error)?.error;
      if (updateErr) throw updateErr;

      toast({ title: "Rascunho salvo", description: "Suas alterações foram gravadas." });
      // Marca página como draft (até publicar)
      await supabase.from("pages").update({ status: "draft" }).eq("id", data.page.id);
      // Reset flags trocando ids de novos blocos pelos reais
      setBlocks((prev) =>
        prev.map((b) =>
          b._new && insertedMap[b.id]
            ? { ...b, id: insertedMap[b.id], _new: false, _dirty: false }
            : { ...b, _dirty: false },
        ),
      );
      setDeletedIds([]);
      qc.invalidateQueries({ queryKey: ["admin-page", slug] });
      qc.invalidateQueries({ queryKey: ["admin-pages"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      toast({ title: "Falha ao salvar", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!data?.page) return;
    if (blocks.some((b) => b._dirty || b._new) || deletedIds.length) {
      toast({ title: "Salve antes de publicar", description: "Você tem alterações não salvas." });
      return;
    }
    setPublishing(true);
    try {
      // Re-busca blocos do banco para snapshot fiel
      const { data: fresh, error } = await supabase
        .from("page_blocks")
        .select("*")
        .eq("page_id", data.page.id)
        .order("position");
      if (error) throw error;
      const snapshot = {
        page: {
          slug: data.page.slug,
          title: pageMeta.title,
          meta_title: pageMeta.meta_title || null,
          meta_description: pageMeta.meta_description || null,
          metadata: pageMeta.metadata ?? {},
        },
        blocks: fresh,
      };
      const { error: ue } = await supabase
        .from("pages")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          published_snapshot: asJson(snapshot),
        })
        .eq("id", data.page.id);
      if (ue) throw ue;
      toast({ title: "Página publicada", description: "O site público já reflete as mudanças." });
      qc.invalidateQueries({ queryKey: ["admin-page", slug] });
      qc.invalidateQueries({ queryKey: ["admin-pages"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao publicar";
      toast({ title: "Falha ao publicar", description: msg, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  }

  async function handleRevert() {
    if (!data?.page?.published_snapshot) {
      toast({ title: "Sem versão publicada", description: "Esta página ainda não foi publicada." });
      return;
    }
    if (!confirm("Reverter para a última versão publicada? Alterações não salvas serão perdidas."))
      return;
    const snap = data.page.published_snapshot as unknown as { blocks: PageBlockRow[] };
    // Deleta blocos atuais e reinsere do snapshot
    const { error: de } = await supabase.from("page_blocks").delete().eq("page_id", data.page.id);
    if (de) {
      toast({ title: "Erro ao reverter", description: de.message, variant: "destructive" });
      return;
    }
    const reinserts = snap.blocks.map((b) => ({
      page_id: data.page.id,
      type: b.type,
      position: b.position,
      enabled: b.enabled,
      mode: b.mode,
      data: asJson(b.data),
      html_content: b.html_content,
    }));
    if (reinserts.length) {
      const { error: ie } = await supabase.from("page_blocks").insert(reinserts);
      if (ie) {
        toast({ title: "Erro ao reverter", description: ie.message, variant: "destructive" });
        return;
      }
    }
    toast({ title: "Revertido", description: "Voltamos à versão publicada." });
    qc.invalidateQueries({ queryKey: ["admin-page", slug] });
  }

  if (isLoading) {
    return <div className="p-8 text-brand-text-muted">Carregando editor…</div>;
  }
  if (!data?.page) {
    return (
      <div className="p-8">
        <p className="text-brand-text-light mb-4">Página não encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/admin/paginas")}>
          Voltar
        </Button>
      </div>
    );
  }

  const dirty = blocks.some((b) => b._dirty || b._new) || deletedIds.length > 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Topbar */}
      <header className="border-b border-brand-gold/15 bg-brand-graphite/40 px-5 py-3 flex items-center gap-4 shrink-0">
        <Link to="/admin/paginas" className="text-brand-text-muted hover:text-brand-text-light">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg text-brand-text-light truncate">{pageMeta.title || data.page.slug}</h1>
            <Badge
              variant={data.page.status === "published" ? "default" : "secondary"}
              className={cn(
                data.page.status === "published"
                  ? "bg-brand-gold/20 text-brand-gold border-brand-gold/30"
                  : "",
              )}
            >
              {data.page.status === "published" ? "Publicada" : "Rascunho"}
            </Badge>
            {dirty && <span className="text-[10px] uppercase tracking-wider text-brand-bordeaux">● não salvo</span>}
          </div>
          <p className="text-xs text-brand-text-muted font-mono">/{data.page.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <CopyLinkButton
            slug={data.page.slug}
            status={data.page.status as "draft" | "published"}
          />
          <Button variant="ghost" size="sm" asChild>
            <a
              href={data.page.status === "published" ? `/p/${data.page.slug}` : `/p/${data.page.slug}?preview=1`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-3.5 mr-1.5" />
              {data.page.status === "published" ? "Ver publicada" : "Ver rascunho"}
            </a>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRevert}>
            <Undo2 className="size-3.5 mr-1.5" /> Reverter
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !dirty}>
            <Save className="size-3.5 mr-1.5" /> {saving ? "Salvando…" : "Salvar rascunho"}
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishing || dirty}
            className="bg-brand-gold text-brand-green hover:bg-brand-gold/90"
          >
            <Send className="size-3.5 mr-1.5" /> {publishing ? "Publicando…" : "Publicar"}
          </Button>
        </div>
      </header>

      {/* 3-col body */}
      <div className="flex-1 grid grid-cols-[300px_1fr_380px] overflow-hidden">
        {/* LEFT — Block list */}
        <aside className="border-r border-brand-gold/15 bg-brand-graphite/20 overflow-y-auto">
          <div className="p-4 sticky top-0 bg-brand-graphite/60 backdrop-blur border-b border-brand-gold/15">
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-text-muted">Blocos</p>
          </div>
          <div className="p-3 space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                {blocks.map((b) => (
                  <SortableBlock
                    key={b.id}
                    block={b}
                    selected={b.id === selectedId}
                    onSelect={() => setSelectedId(b.id)}
                    onToggle={(v) => markDirty(b.id, { enabled: v })}
                    onRemove={() => removeBlock(b.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <div className="relative pt-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setShowAddMenu((s) => !s)}
              >
                <Plus className="size-3.5 mr-1.5" /> Adicionar bloco
              </Button>
              {showAddMenu && (
                <div className="mt-2 border border-brand-gold/20 bg-brand-graphite/80 rounded p-1 max-h-72 overflow-y-auto">
                  {ALL_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => addBlock(t)}
                      className="w-full text-left px-3 py-2 text-xs text-brand-text-soft hover:bg-brand-gold/10 hover:text-brand-gold rounded"
                    >
                      {BLOCK_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* CENTER — Preview */}
        <section className="bg-brand-black overflow-hidden">
          <div className="h-full p-4">
            <div className="h-full border border-brand-gold/15 bg-brand-graphite/10 rounded overflow-hidden">
              <iframe
                key={previewSrc}
                title="Preview"
                src={previewSrc}
                className="w-full h-full bg-white"
              />
            </div>
          </div>
        </section>

        {/* RIGHT — Field editor */}
        <aside className="border-l border-brand-gold/15 bg-brand-graphite/20 overflow-y-auto">
          <div className="p-4 sticky top-0 bg-brand-graphite/60 backdrop-blur border-b border-brand-gold/15">
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-text-muted">
              {selected ? BLOCK_LABELS[selected.type] : "Configurações da página"}
            </p>
          </div>
          <div className="p-5">
            {selected ? (
              <BlockForm
                type={selected.type}
                data={selected.data}
                onChange={(next) => markDirty(selected.id, { data: next })}
                pageTitle={pageMeta.title}
              />
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-brand-text-muted">Título</Label>
                  <Input
                    value={pageMeta.title}
                    onChange={(e) => setPageMeta((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-brand-text-muted">Meta title (SEO)</Label>
                  <Input
                    value={pageMeta.meta_title}
                    onChange={(e) => setPageMeta((p) => ({ ...p, meta_title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-brand-text-muted">Meta description (SEO)</Label>
                  <Textarea
                    rows={4}
                    value={pageMeta.meta_description}
                    onChange={(e) => setPageMeta((p) => ({ ...p, meta_description: e.target.value }))}
                  />
                </div>

                <div className="border-t border-brand-gold/15 pt-4 mt-2 space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-brand-gold/80">
                    Contexto editorial (IA)
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-brand-text-muted">Tema / procedimento</Label>
                    <Input
                      value={String(pageMeta.metadata?.tema ?? "")}
                      onChange={(e) =>
                        setPageMeta((p) => ({ ...p, metadata: { ...p.metadata, tema: e.target.value } }))
                      }
                      placeholder="Ex.: Preenchimento Labial"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-brand-text-muted">Categoria</Label>
                    <Input
                      value={String(pageMeta.metadata?.categoria ?? "")}
                      onChange={(e) =>
                        setPageMeta((p) => ({ ...p, metadata: { ...p.metadata, categoria: e.target.value } }))
                      }
                      placeholder="injetáveis, bioestimuladores, tecnologias…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-brand-text-muted">Área anatômica</Label>
                    <Input
                      value={String(pageMeta.metadata?.area_anatomica ?? "")}
                      onChange={(e) =>
                        setPageMeta((p) => ({
                          ...p,
                          metadata: { ...p.metadata, area_anatomica: e.target.value },
                        }))
                      }
                      placeholder="labios, terco_superior, mandibula…"
                    />
                    <p className="text-[10px] text-brand-text-muted">
                      Usado para filtrar casos clínicos do pool global no bloco Casos.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-brand-text-muted">Notas para a IA</Label>
                    <Textarea
                      rows={3}
                      value={String(pageMeta.metadata?.ai_notes ?? "")}
                      onChange={(e) =>
                        setPageMeta((p) => ({ ...p, metadata: { ...p.metadata, ai_notes: e.target.value } }))
                      }
                      placeholder="Direcionamentos editoriais, o que evitar, ângulo desejado…"
                    />
                  </div>
                  {(() => {
                    const meta = pageMeta.metadata as Record<string, unknown>;
                    const refType = String(meta?.reference_type ?? "");
                    const images = Array.isArray(meta?.old_page_images) 
                      ? (meta.old_page_images as { url?: string; alt?: string; source_url?: string }[]) 
                      : [];

                    const setHeroImage = (url: string) => {
                      const hero = blocks.find(b => b.type === 'hero');
                      if (hero) {
                        markDirty(hero.id, { data: { ...hero.data, image_url: url } });
                        toast({ title: "Hero atualizado", description: "A imagem foi aplicada ao bloco Hero." });
                        // Opcionalmente seleciona o hero para o usuário ver
                        setSelectedId(hero.id);
                      } else {
                        toast({ title: "Hero não encontrado", description: "Adicione um bloco Hero primeiro.", variant: "destructive" });
                      }
                    };

                    const extracted = (meta?.old_page_extracted ?? null) as
                      | { testimonials_count?: number; faqs_count?: number; sections_count?: number; used_section_for_detalhado?: boolean }
                      | null;
                    if (refType !== "own_old_page" && images.length === 0 && !extracted) return null;
                    return (
                      <div className="border-t border-brand-gold/15 pt-4 mt-2 space-y-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-brand-gold/80">
                          Página antiga aproveitada
                        </p>
                        {extracted && (
                          <ul className="text-[11px] text-brand-text-muted space-y-1">
                            <li>Depoimentos importados: <strong className="text-brand-text-light">{extracted.testimonials_count ?? 0}</strong></li>
                            <li>FAQs importadas: <strong className="text-brand-text-light">{extracted.faqs_count ?? 0}</strong></li>
                            <li>Seções identificadas: <strong className="text-brand-text-light">{extracted.sections_count ?? 0}</strong></li>
                            <li>Bloco "procedimento detalhado": <strong className="text-brand-text-light">{extracted.used_section_for_detalhado ? "ativo" : "vazio"}</strong></li>
                          </ul>
                        )}
                        {images.length > 0 && (
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-brand-text-muted">
                              Imagens candidatas ({images.length})
                            </Label>
                            <p className="text-[10px] text-brand-text-muted mb-2">
                              URLs encontradas na página antiga. Clique para copiar e cole no campo de imagem do bloco desejado.
                            </p>
                            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                              {images.map((img, i) => (
                                <div
                                  key={i}
                                  className="group relative flex flex-col border border-brand-gold/15 bg-brand-black/20 hover:border-brand-gold/40 transition-colors overflow-hidden rounded"
                                >
                                  <div className="relative aspect-video overflow-hidden border-b border-brand-gold/10">
                                    <img
                                      src={img.url}
                                      alt={img.alt || ""}
                                      loading="lazy"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-brand-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                                      <Button 
                                        size="icon" 
                                        variant="secondary" 
                                        className="size-7 rounded-full bg-brand-gold text-brand-green hover:bg-brand-gold/90"
                                        onClick={() => img.url && setHeroImage(img.url)}
                                        title="Usar no Hero"
                                      )
                                        <Save className="size-3.5" />
                                      </Button>
                                      <Button 
                                        size="icon" 
                                        variant="outline" 
                                        className="size-7 rounded-full border-brand-gold/40 bg-brand-graphite text-brand-text-light hover:bg-brand-gold/10"
                                        onClick={() => {
                                          if (img.url) {
                                            navigator.clipboard.writeText(img.url);
                                            toast({ title: "Copiado", description: "URL da imagem copiada." });
                                          }
                                        }}
                                        title="Copiar URL"
                                      >
                                        <ExternalLink className="size-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="p-1.5 space-y-1">
                                    <Button 
                                      variant="ghost" 
                                      className="w-full h-6 px-1.5 text-[9px] uppercase tracking-wider text-brand-gold/80 hover:text-brand-gold hover:bg-brand-gold/10"
                                      onClick={() => img.url && setHeroImage(img.url)}
                                    >
                                      Usar no Hero
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <p className="text-xs text-brand-text-muted">
                  Selecione um bloco à esquerda para editar seu conteúdo.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SortableBlock({
  block,
  selected,
  onSelect,
  onToggle,
  onRemove,
}: {
  block: DraftBlock;
  selected: boolean;
  onSelect: () => void;
  onToggle: (v: boolean) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 px-2 py-2 border rounded cursor-pointer transition-colors",
        selected
          ? "border-brand-gold/60 bg-brand-gold/10"
          : "border-brand-gold/15 bg-brand-black/30 hover:border-brand-gold/30",
        !block.enabled && "opacity-50",
      )}
      onClick={onSelect}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-brand-text-muted hover:text-brand-gold cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        aria-label="Arrastar"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-brand-text-light truncate">{BLOCK_LABELS[block.type]}</p>
        <p className="text-[10px] text-brand-text-muted truncate">{block.type}</p>
      </div>
      <Switch
        checked={block.enabled}
        onCheckedChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="scale-75"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="text-brand-text-muted hover:text-brand-bordeaux opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remover"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}