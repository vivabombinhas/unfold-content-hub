import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
 import { ExternalLink, ListChecks, Pencil, Sparkles, Trash2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

export default function PagesList() {
  const queryClient = useQueryClient();
  // Gate the query on auth readiness. Without this, useQuery fires before the
  // Supabase session is restored, RLS returns empty/errors, and the user has to
  // refresh until it works.
  const { isAdmin, loading: authLoading } = useAuth();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string; slug: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !authLoading && isAdmin,
  });

  const filteredPages = useMemo(() => {
    if (!pages) return [];
    if (!searchTerm) return pages;
    const lowerSearch = searchTerm.toLowerCase();
    return pages.filter(p => 
      p.title?.toLowerCase().includes(lowerSearch) || 
      p.slug?.toLowerCase().includes(lowerSearch)
    );
  }, [pages, searchTerm]);

  const selectablePages = useMemo(() => {
    return filteredPages.filter(p => p.slug !== "modelo");
  }, [filteredPages]);

  const allSelected = selectablePages.length > 0 && selectedIds.length === selectablePages.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectablePages.map(p => p.id));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      // Atomic backend deletion: validates admin role, removes blocks + case overrides,
      // then the page itself — all in one transaction.
      const { data, error } = await supabase.rpc("admin_delete_page" as any, {
        _page_id: pendingDelete.id,
      });
      if (error) throw error;
      const result = (data ?? {}) as { blocks_deleted?: number; overrides_deleted?: number };
      toast({
        title: "Página excluída",
        description: `"${pendingDelete.title}" removida (${result.blocks_deleted ?? 0} blocos, ${result.overrides_deleted ?? 0} overrides).`,
      });
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    try {
      let totalBlocks = 0;
      let totalOverrides = 0;
      
      for (const id of selectedIds) {
        const { data, error } = await supabase.rpc("admin_delete_page" as any, {
          _page_id: id,
        });
        if (error) throw error;
        const result = (data ?? {}) as { blocks_deleted?: number; overrides_deleted?: number };
        totalBlocks += (result.blocks_deleted ?? 0);
        totalOverrides += (result.overrides_deleted ?? 0);
      }

      toast({
        title: `${selectedIds.length} páginas excluídas`,
        description: `Total de ${totalBlocks} blocos e ${totalOverrides} overrides removidos.`,
      });
      
      setSelectedIds([]);
      setPendingBulkDelete(false);
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
    } catch (err: any) {
      toast({ title: "Erro na exclusão em lote", description: err?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-brand-text-light">Páginas</h1>
          <p className="text-sm text-brand-text-muted mt-1">Crie e edite landings. A IA gera o rascunho a partir de um tema.</p>
        </div>
         <div className="flex gap-3">
           <Button asChild variant="outline" className="border-brand-gold/20 text-brand-text-muted hover:bg-brand-gold/5 hover:text-brand-gold">
             <Link to="/admin/paginas/lote">
               <ListChecks className="size-4 mr-2" />
               Criar em Lote
             </Link>
           </Button>
           <Button asChild variant="outline" className="border-brand-gold/30 text-brand-gold hover:bg-brand-gold/5">
             <Link to="/admin/paginas/nova-legado">Pesquisa Web</Link>
           </Button>
           <Button asChild className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
             <Link to="/admin/paginas/nova">
               <Sparkles className="size-4 mr-2" />
               Nova Página (Wizard)
             </Link>
           </Button>
         </div>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-text-muted" />
            <Input
              placeholder="Filtrar por título ou slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-brand-graphite/40 border-brand-gold/20 text-brand-text-light focus:border-brand-gold/40"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text-light"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
              <span className="text-sm text-brand-text-muted">
                {selectedIds.length} {selectedIds.length === 1 ? "selecionada" : "selecionadas"}
              </span>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setPendingBulkDelete(true)}
                className="h-9 px-4"
              >
                <Trash2 className="size-4 mr-2" />
                Excluir Selecionadas
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedIds([])}
                className="h-9 text-brand-text-muted hover:text-brand-text-light"
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-brand-text-muted">Carregando…</p>
      ) : (
        <div className="border border-brand-gold/15 bg-brand-graphite/20 overflow-hidden rounded-sm">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-[0.2em] text-brand-text-muted border-b border-brand-gold/15 bg-brand-graphite/40">
              <tr>
                <th className="px-5 py-3 w-10">
                  <Checkbox 
                    checked={allSelected} 
                    onCheckedChange={toggleSelectAll}
                    className="border-brand-gold/30 data-[state=checked]:bg-brand-gold data-[state=checked]:text-brand-bg"
                  />
                </th>
                <th className="px-5 py-3">Título</th>
                <th className="px-5 py-3">Slug</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Atualizada</th>
                <th className="px-5 py-3 w-40"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPages?.map((p) => (
                <tr key={p.id} className={`border-t border-brand-gold/10 transition-colors ${selectedIds.includes(p.id) ? 'bg-brand-gold/5' : 'hover:bg-brand-graphite/30'}`}>
                  <td className="px-5 py-3">
                    {p.slug !== "modelo" && (
                      <Checkbox 
                        checked={selectedIds.includes(p.id)} 
                        onCheckedChange={() => toggleSelect(p.id)}
                        className="border-brand-gold/30 data-[state=checked]:bg-brand-gold data-[state=checked]:text-brand-bg"
                      />
                    )}
                  </td>
                  <td className="px-5 py-3 text-brand-text-light font-medium">{p.title}</td>
                  <td className="px-5 py-3 text-brand-text-muted font-mono text-xs">/p/{p.slug}</td>
                  <td className="px-5 py-3">
                    <Badge variant={p.status === "published" ? "default" : "secondary"} className={p.status === "published" ? "bg-brand-gold/20 text-brand-gold border-brand-gold/30" : ""}>
                      {p.status === "published" ? "Publicada" : "Rascunho"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-brand-text-muted text-xs">
                    {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <CopyLinkButton
                        slug={p.slug}
                        status={p.status as "draft" | "published"}
                        variant="icon"
                      />
                      <a
                        href={p.status === "published" ? `/p/${p.slug}` : `/p/${p.slug}?preview=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-text-muted hover:text-brand-gold"
                        title={p.status === "published" ? "Ver página publicada" : "Ver rascunho"}
                      >
                        <ExternalLink className="size-4" />
                      </a>
                      <Link
                        to={`/admin/paginas/${p.slug}`}
                        className="text-brand-gold hover:underline inline-flex items-center gap-1.5 text-xs"
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </Link>
                      {p.slug !== "modelo" ? (
                        <button
                          type="button"
                          onClick={() => setPendingDelete({ id: p.id, title: p.title, slug: p.slug })}
                          className="text-brand-text-muted hover:text-destructive transition-colors"
                          title="Excluir página"
                          aria-label={`Excluir ${p.title}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : (
                        <div className="size-4" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={pendingBulkDelete} onOpenChange={(open) => !open && !deleting && setPendingBulkDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.length} páginas?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? "página" : "páginas"} selecionadas.
              Todos os blocos e overrides de casos vinculados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo…" : `Excluir ${selectedIds.length} ${selectedIds.length === 1 ? "página" : "páginas"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir página?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{pendingDelete?.title}</strong> (/p/{pendingDelete?.slug}).
              Todos os blocos e overrides de casos desta página serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo…" : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}