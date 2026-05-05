import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Search, GraduationCap } from "lucide-react";
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

interface Course {
  id: string;
  title: string;
  audience: string | null;
  duration: string | null;
  description: string | null;
  long_description: string | null;
  price_label: string | null;
  position: number;
}

export default function Courses() {
  const queryClient = useQueryClient();
  const { isAdmin, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return data as Course[];
    },
    enabled: !authLoading && isAdmin,
  });

  const filteredCourses = courses?.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      title: formData.get("title") as string,
      audience: formData.get("audience") as string,
      duration: formData.get("duration") as string,
      description: formData.get("description") as string,
      long_description: formData.get("long_description") as string,
      price_label: formData.get("price_label") as string,
      position: parseInt(formData.get("position") as string) || 0,
    };

    try {
      if (editingCourse) {
        const { error } = await supabase
          .from("courses")
          .update(payload)
          .eq("id", editingCourse.id);
        if (error) throw error;
        toast({ title: "Curso atualizado", description: "As alterações foram salvas com sucesso." });
      } else {
        const { error } = await supabase
          .from("courses")
          .insert([payload]);
        if (error) throw error;
        toast({ title: "Curso criado", description: "O novo curso foi cadastrado." });
      }
      setIsFormOpen(false);
      setEditingCourse(null);
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
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
        .from("courses")
        .delete()
        .eq("id", pendingDelete.id);
      if (error) throw error;
      toast({ title: "Curso excluído", description: "O curso foi removido com sucesso." });
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
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
          <h1 className="font-display text-3xl text-brand-text-light">Cursos</h1>
          <p className="text-sm text-brand-text-muted mt-1">Gerencie os cursos para profissionais oferecidos pela clínica.</p>
        </div>
        <Button onClick={() => { setEditingCourse(null); setIsFormOpen(true); }} className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
          <Plus className="size-4 mr-2" />
          Novo Curso
        </Button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-text-muted" />
        <input 
          placeholder="Buscar por título ou descrição..." 
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
                <th className="px-5 py-3">Título / Público</th>
                <th className="px-5 py-3">Duração</th>
                <th className="px-5 py-3">Preço</th>
                <th className="px-5 py-3 w-32 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses?.map((course) => (
                <tr key={course.id} className="border-t border-brand-gold/10 hover:bg-brand-graphite/30 group">
                  <td className="px-5 py-3 text-brand-text-muted text-xs text-center">{course.position}</td>
                  <td className="px-5 py-3">
                    <div className="text-brand-text-light font-medium">{course.title}</div>
                    <div className="text-brand-gold text-[10px] uppercase tracking-wider mt-0.5">
                      {course.audience || "Público geral"}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-brand-text-muted text-xs">
                    {course.duration || "-"}
                  </td>
                  <td className="px-5 py-3 text-brand-text-muted text-xs">
                    {course.price_label || "Sob consulta"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => { setEditingCourse(course); setIsFormOpen(true); }}
                        className="text-brand-gold hover:underline inline-flex items-center gap-1.5 text-xs"
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => setPendingDelete(course)}
                        className="text-brand-text-muted hover:text-destructive transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCourses?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-brand-text-muted">
                    Nenhum curso encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingCourse(null); }}>
        <DialogContent className="max-w-2xl bg-brand-graphite border-brand-gold/20 text-brand-text-light">
          <DialogHeader>
            <DialogTitle className="text-brand-text-light flex items-center gap-2">
              <GraduationCap className="size-5 text-brand-gold" />
              {editingCourse ? "Editar Curso" : "Novo Curso"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Curso</Label>
              <Input 
                id="title" 
                name="title" 
                defaultValue={editingCourse?.title} 
                required 
                className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                placeholder="Ex: Masterclass de Toxina Botulínica"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="audience">Público-alvo</Label>
                <Input 
                  id="audience" 
                  name="audience" 
                  defaultValue={editingCourse?.audience || ""} 
                  className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                  placeholder="Ex: Médicos e Biomédicos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duração / Carga Horária</Label>
                <Input 
                  id="duration" 
                  name="duration" 
                  defaultValue={editingCourse?.duration || ""} 
                  className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                  placeholder="Ex: 2 dias intensivos (16h)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição Curta (para o card)</Label>
              <Textarea 
                id="description" 
                name="description" 
                defaultValue={editingCourse?.description || ""} 
                className="min-h-[60px] bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                placeholder="Resumo que aparece na listagem principal..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="long_description">Descrição Longa / Detalhes (HTML opcional)</Label>
              <Textarea 
                id="long_description" 
                name="long_description" 
                defaultValue={editingCourse?.long_description || ""} 
                className="min-h-[120px] bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                placeholder="Conteúdo programático, diferenciais, etc..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_label">Preço / Condição</Label>
                <Input 
                  id="price_label" 
                  name="price_label" 
                  defaultValue={editingCourse?.price_label || ""} 
                  className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                  placeholder="Ex: R$ 4.500 ou 10x"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Posição / Ordem</Label>
                <Input 
                  id="position" 
                  name="position" 
                  type="number"
                  defaultValue={editingCourse?.position || 0} 
                  className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="text-brand-text-muted hover:text-brand-text-light">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
                {isSaving ? "Salvando..." : "Salvar Curso"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}>
        <AlertDialogContent className="bg-brand-graphite border-brand-gold/20 text-brand-text-light">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-brand-text-light">Excluir curso?</AlertDialogTitle>
            <AlertDialogDescription className="text-brand-text-muted">
              Você está prestes a excluir o curso: <br/>
              <strong className="text-brand-text-light">"{pendingDelete?.title}"</strong>. <br/><br/>
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