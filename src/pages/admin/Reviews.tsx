import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";

interface Review {
  id: string;
  name: string;
  rating: number;
  date_label: string | null;
  text: string;
  position: number;
}

export default function Reviews() {
  const queryClient = useQueryClient();
  const { isAdmin, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Review | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return data as Review[];
    },
    enabled: !authLoading && isAdmin,
  });

  const filteredReviews = reviews?.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.text.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const text = formData.get("text") as string;
    const rating = parseInt(formData.get("rating") as string) || 5;
    const date_label = formData.get("date_label") as string;
    const position = parseInt(formData.get("position") as string) || 0;

    try {
      if (editingReview) {
        const { error } = await supabase
          .from("reviews")
          .update({ name, text, rating, date_label, position })
          .eq("id", editingReview.id);
        if (error) throw error;
        toast({ title: "Depoimento atualizado", description: "As alterações foram salvas com sucesso." });
      } else {
        const { error } = await supabase
          .from("reviews")
          .insert([{ name, text, rating, date_label, position }]);
        if (error) throw error;
        toast({ title: "Depoimento criado", description: "O novo depoimento foi cadastrado." });
      }
      setIsFormOpen(false);
      setEditingReview(null);
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", pendingDelete.id);
      if (error) throw error;
      toast({ title: "Depoimento excluído", description: "O depoimento foi removido com sucesso." });
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-brand-text-light">Depoimentos</h1>
          <p className="text-sm text-brand-text-muted mt-1">Gerencie as avaliações e depoimentos de pacientes.</p>
        </div>
        <Button onClick={() => { setEditingReview(null); setIsFormOpen(true); }} className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
          <Plus className="size-4 mr-2" />
          Novo Depoimento
        </Button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-text-muted" />
        <input 
          placeholder="Buscar por nome ou conteúdo..." 
          className="w-full pl-10 h-10 rounded-md bg-brand-graphite/30 border border-brand-gold/15 text-brand-text-light focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-brand-text-muted">Carregando...</p>
      ) : (
        <div className="border border-brand-gold/15 bg-brand-graphite/20 overflow-hidden rounded-sm">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-[0.2em] text-brand-text-muted border-b border-brand-gold/15">
              <tr>
                <th className="px-5 py-3 w-12 text-center">Pos.</th>
                <th className="px-5 py-3">Paciente</th>
                <th className="px-5 py-3">Nota</th>
                <th className="px-5 py-3">Data/Rótulo</th>
                <th className="px-5 py-3 w-32 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews?.map((review) => (
                <tr key={review.id} className="border-t border-brand-gold/10 hover:bg-brand-graphite/30 group">
                  <td className="px-5 py-3 text-brand-text-muted text-xs text-center">{review.position}</td>
                  <td className="px-5 py-3">
                    <div className="text-brand-text-light font-medium">{review.name}</div>
                    <div className="text-brand-text-muted text-[11px] mt-0.5 max-w-sm truncate group-hover:whitespace-normal group-hover:overflow-visible">
                      {review.text}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="size-3 text-brand-gold fill-brand-gold" />
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-brand-text-muted text-xs">
                    {review.date_label || "-"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => { setEditingReview(review); setIsFormOpen(true); }}
                        className="text-brand-gold hover:underline inline-flex items-center gap-1.5 text-xs"
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => setPendingDelete(review)}
                        className="text-brand-text-muted hover:text-destructive transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReviews?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-brand-text-muted">
                    Nenhum depoimento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingReview(null); }}>
        <DialogContent className="max-w-2xl bg-brand-graphite border-brand-gold/20 text-brand-text-light">
          <DialogHeader>
            <DialogTitle className="text-brand-text-light">
              {editingReview ? "Editar Depoimento" : "Novo Depoimento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Paciente</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={editingReview?.name} 
                  required 
                  className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                  placeholder="Ex: Maria Oliveira"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_label">Data / Rótulo de Tempo</Label>
                <Input 
                  id="date_label" 
                  name="date_label" 
                  defaultValue={editingReview?.date_label || ""} 
                  className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                  placeholder="Ex: há 2 meses, Abril de 2025"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="text">Texto do Depoimento</Label>
              <Textarea 
                id="text" 
                name="text" 
                defaultValue={editingReview?.text} 
                required 
                className="min-h-[100px] bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                placeholder="O que o paciente escreveu..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Nota (1 a 5 estrelas)</Label>
                <Input 
                  id="rating" 
                  name="rating" 
                  type="number"
                  min="1"
                  max="5"
                  defaultValue={editingReview?.rating || 5} 
                  required
                  className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Posição / Ordem</Label>
                <Input 
                  id="position" 
                  name="position" 
                  type="number"
                  defaultValue={editingReview?.position || 0} 
                  className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="text-brand-text-muted hover:text-brand-text-light">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
                {isSaving ? "Salvando..." : "Salvar Depoimento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}>
        <AlertDialogContent className="bg-brand-graphite border-brand-gold/20 text-brand-text-light">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-brand-text-light">Excluir depoimento?</AlertDialogTitle>
            <AlertDialogDescription className="text-brand-text-muted">
              Você está prestes a excluir o depoimento de: <br/>
              <strong className="text-brand-text-light">"{pendingDelete?.name}"</strong>. <br/><br/>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="bg-transparent text-brand-text-muted border-brand-gold/15">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}