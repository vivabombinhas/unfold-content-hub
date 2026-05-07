 import { useState } from "react";
 import { useQuery, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Plus, Pencil, Trash2, Search, Image as ImageIcon, Check, X } from "lucide-react";
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
 import { Switch } from "@/components/ui/switch";
 
 interface Case {
   id: string;
   slug: string;
   area: string | null;
   age: string | null;
   cover_url: string | null;
   before_url: string | null;
   after_url: string | null;
   notes: string | null;
   dosage: string | null;
   duration: string | null;
   toxin: string | null;
   highlight: boolean;
   position: number;
 }
 
 export default function Cases() {
   const queryClient = useQueryClient();
   const { isAdmin, loading: authLoading } = useAuth();
   const [search, setSearch] = useState("");
   const [isFormOpen, setIsFormOpen] = useState(false);
   const [editingCase, setEditingCase] = useState<Case | null>(null);
   const [pendingDelete, setPendingDelete] = useState<Case | null>(null);
   const [isSaving, setIsSaving] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);
 
   const { data: cases, isLoading } = useQuery({
     queryKey: ["admin-cases"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("cases")
         .select("*")
         .order("position", { ascending: true });
       if (error) throw error;
       return data as Case[];
     },
     enabled: !authLoading && isAdmin,
   });
 
   const filteredCases = cases?.filter(c => 
     (c.area?.toLowerCase().includes(search.toLowerCase()) || 
      c.notes?.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()))
   );
 
   const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     setIsSaving(true);
     const formData = new FormData(e.currentTarget);
     
     const payload = {
       slug: formData.get("slug") as string,
       area: formData.get("area") as string,
       age: formData.get("age") as string,
       cover_url: formData.get("cover_url") as string,
       before_url: formData.get("before_url") as string,
       after_url: formData.get("after_url") as string,
       notes: formData.get("notes") as string,
       dosage: formData.get("dosage") as string,
       duration: formData.get("duration") as string,
       toxin: formData.get("toxin") as string,
       position: parseInt(formData.get("position") as string) || 0,
       highlight: formData.get("highlight") === "on",
     };
 
     try {
       if (editingCase) {
         const { error } = await supabase
           .from("cases")
           .update(payload)
           .eq("id", editingCase.id);
         if (error) throw error;
         toast({ title: "Caso clínico atualizado", description: "As alterações foram salvas com sucesso." });
       } else {
         const { error } = await supabase
           .from("cases")
           .insert([payload]);
         if (error) throw error;
         toast({ title: "Caso clínico criado", description: "O novo caso foi cadastrado." });
       }
       setIsFormOpen(false);
       setEditingCase(null);
       queryClient.invalidateQueries({ queryKey: ["admin-cases"] });
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
         .from("cases")
         .delete()
         .eq("id", pendingDelete.id);
       if (error) throw error;
       toast({ title: "Caso excluído", description: "O caso clínico foi removido com sucesso." });
       setPendingDelete(null);
       queryClient.invalidateQueries({ queryKey: ["admin-cases"] });
     } catch (err: any) {
       toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
     } finally {
       setIsDeleting(false);
     }
   };
 
   return (
     <div className="p-8 max-w-6xl">
       <div className="flex items-center justify-between mb-8">
         <div>
           <h1 className="font-display text-3xl text-brand-text-light">Casos Clínicos</h1>
           <p className="text-sm text-brand-text-muted mt-1">Gerencie a biblioteca de antes e depois e resultados clínicos.</p>
         </div>
         <Button onClick={() => { setEditingCase(null); setIsFormOpen(true); }} className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
           <Plus className="size-4 mr-2" />
           Novo Caso
         </Button>
       </div>
 
       <div className="mb-6 relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-text-muted" />
         <input 
           placeholder="Buscar por área, notas ou slug..." 
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
                 <th className="px-5 py-3 w-20">Foto</th>
                 <th className="px-5 py-3">Área / Identificador</th>
                 <th className="px-5 py-3">Destaque</th>
                 <th className="px-5 py-3 w-32 text-right">Ações</th>
               </tr>
             </thead>
             <tbody>
               {filteredCases?.map((c) => (
                 <tr key={c.id} className="border-t border-brand-gold/10 hover:bg-brand-graphite/30 group">
                   <td className="px-5 py-3 text-brand-text-muted text-xs text-center">{c.position}</td>
                   <td className="px-5 py-3">
                     {c.cover_url ? (
                       <img src={c.cover_url} alt="" className="size-10 object-cover rounded border border-brand-gold/20" />
                     ) : (
                       <div className="size-10 bg-brand-black/40 rounded border border-brand-gold/10 flex items-center justify-center">
                         <ImageIcon className="size-4 text-brand-text-muted" />
                       </div>
                     )}
                   </td>
                   <td className="px-5 py-3">
                     <div className="text-brand-text-light font-medium">{c.area || "Sem área"}</div>
                     <div className="text-brand-text-muted text-[11px] mt-0.5">
                       slug: {c.slug}
                     </div>
                   </td>
                   <td className="px-5 py-3">
                     {c.highlight ? (
                       <span className="inline-flex items-center gap-1 text-[10px] bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                         <Check className="size-2.5" /> Sim
                       </span>
                     ) : (
                       <span className="inline-flex items-center gap-1 text-[10px] bg-brand-black/40 text-brand-text-muted px-2 py-0.5 rounded-full uppercase tracking-wider">
                         <X className="size-2.5" /> Não
                       </span>
                     )}
                   </td>
                   <td className="px-5 py-3 text-right">
                     <div className="flex items-center justify-end gap-3">
                       <button
                         onClick={() => { setEditingCase(c); setIsFormOpen(true); }}
                         className="text-brand-gold hover:underline inline-flex items-center gap-1.5 text-xs"
                       >
                         <Pencil className="size-3.5" />
                         Editar
                       </button>
                       <button
                         onClick={() => setPendingDelete(c)}
                         className="text-brand-text-muted hover:text-destructive transition-colors"
                       >
                         <Trash2 className="size-4" />
                       </button>
                     </div>
                   </td>
                 </tr>
               ))}
               {filteredCases?.length === 0 && (
                 <tr>
                   <td colSpan={5} className="px-5 py-8 text-center text-brand-text-muted">
                     Nenhum caso clínico encontrado.
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
       )}
 
       <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingCase(null); }}>
         <DialogContent className="max-w-3xl bg-brand-graphite border-brand-gold/20 text-brand-text-light overflow-y-auto max-h-[90vh]">
           <DialogHeader>
             <DialogTitle className="text-brand-text-light">
               {editingCase ? "Editar Caso Clínico" : "Novo Caso Clínico"}
             </DialogTitle>
           </DialogHeader>
           <form onSubmit={handleSave} className="space-y-4 pt-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="slug">Slug / Identificador (ex: peeling-diamante-1)</Label>
                 <Input 
                   id="slug" 
                   name="slug" 
                   defaultValue={editingCase?.slug} 
                   required 
                   className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="area">Área / Procedimento (ex: Peeling de Diamante)</Label>
                 <Input 
                   id="area" 
                   name="area" 
                   defaultValue={editingCase?.area || ""} 
                   className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 />
               </div>
             </div>
 
             <div className="grid grid-cols-3 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="cover_url">URL da Foto de Capa</Label>
                 <Input 
                   id="cover_url" 
                   name="cover_url" 
                   defaultValue={editingCase?.cover_url || ""} 
                   className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="before_url">URL da Foto Antes</Label>
                 <Input 
                   id="before_url" 
                   name="before_url" 
                   defaultValue={editingCase?.before_url || ""} 
                   className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="after_url">URL da Foto Depois</Label>
                 <Input 
                   id="after_url" 
                   name="after_url" 
                   defaultValue={editingCase?.after_url || ""} 
                   className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 />
               </div>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="notes">Notas do Caso / Descrição</Label>
               <Textarea 
                 id="notes" 
                 name="notes" 
                 defaultValue={editingCase?.notes || ""} 
                 className="min-h-[80px] bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
               />
             </div>
 
             <div className="grid grid-cols-4 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="age">Idade</Label>
                 <Input 
                   id="age" 
                   name="age" 
                   defaultValue={editingCase?.age || ""} 
                   className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="dosage">Dosagem</Label>
                 <Input 
                   id="dosage" 
                   name="dosage" 
                   defaultValue={editingCase?.dosage || ""} 
                   className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="duration">Duração</Label>
                 <Input 
                   id="duration" 
                   name="duration" 
                   defaultValue={editingCase?.duration || ""} 
                   className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="toxin">Toxina / Produto</Label>
                 <Input 
                   id="toxin" 
                   name="toxin" 
                   defaultValue={editingCase?.toxin || ""} 
                   className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 />
               </div>
             </div>
 
             <div className="flex items-center gap-8 pt-2">
               <div className="flex items-center gap-2">
                 <Switch id="highlight" name="highlight" defaultChecked={editingCase?.highlight} />
                 <Label htmlFor="highlight">Destaque na Home</Label>
               </div>
               <div className="flex items-center gap-2 flex-1">
                 <Label htmlFor="position">Posição</Label>
                 <Input 
                   id="position" 
                   name="position" 
                   type="number"
                   defaultValue={editingCase?.position || 0} 
                   className="w-20 bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 />
               </div>
             </div>
 
             <DialogFooter className="pt-4">
               <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="text-brand-text-muted hover:text-brand-text-light">
                 Cancelar
               </Button>
               <Button type="submit" disabled={isSaving} className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
                 {isSaving ? "Salvando..." : "Salvar Caso Clínico"}
               </Button>
             </DialogFooter>
           </form>
         </DialogContent>
       </Dialog>
 
       <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}>
         <AlertDialogContent className="bg-brand-graphite border-brand-gold/20 text-brand-text-light">
           <AlertDialogHeader>
             <AlertDialogTitle className="text-brand-text-light">Excluir caso clínico?</AlertDialogTitle>
             <AlertDialogDescription className="text-brand-text-muted">
               Você está prestes a excluir o caso: <br/>
               <strong className="text-brand-text-light">"{pendingDelete?.slug}"</strong>. <br/><br/>
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