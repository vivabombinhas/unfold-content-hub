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

  const { data, isLoading } = useQuery({
    queryKey: ["admin-page", slug],
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
  const [pageMeta, setPageMeta] = useState({ title: "", meta_title: "", meta_description: "" });
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
          <Button variant="ghost" size="sm" asChild>
            <a href={`/?preview=${data.page.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5 mr-1.5" /> Ver site
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
                title="Preview"
                src={`/?preview=${data.page.slug}#${selected?.type ?? ""}`}
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