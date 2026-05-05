 import { useState } from "react";
 import { useQuery, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Plus, Pencil, Trash2, Search, Star, MoveUp, MoveDown } from "lucide-react";
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
 import { Badge } from "@/components/ui/badge";
 import { Label } from "@/components/ui/label";
 import { Switch } from "@/components/ui/switch";
 
 interface Faq {
   id: string;
   question: string;
   answer: string;
   tags: string[] | null;
   featured: boolean;
   position: number;
 }
 
 export default function Faqs() {
   const queryClient = useQueryClient();
   const { isAdmin, loading: authLoading } = useAuth();
   const [search, setSearch] = useState("");
   const [isFormOpen, setIsFormOpen] = useState(false);
   const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
   const [pendingDelete, setPendingDelete] = useState<Faq | null>(null);
   const [isSaving, setIsSaving] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);
 
   const { data: faqs, isLoading } = useQuery({
     queryKey: ["admin-faqs"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("faqs")
         .select("*")
         .order("position", { ascending: true });
       if (error) throw error;
       return data as Faq[];
     },
     enabled: !authLoading && isAdmin,
   });
 
   const filteredFaqs = faqs?.filter(f => 
     f.question.toLowerCase().includes(search.toLowerCase()) || 
     f.answer.toLowerCase().includes(search.toLowerCase()) ||
     f.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
   );
 
   const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     setIsSaving(true);
     const formData = new FormData(e.currentTarget);
     const question = formData.get("question") as string;
     const answer = formData.get("answer") as string;
     const tagsStr = formData.get("tags") as string;
     const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()) : [];
     const position = parseInt(formData.get("position") as string) || 0;
     const featured = formData.get("featured") === "on";
 
     try {
       if (editingFaq) {
         const { error } = await supabase
           .from("faqs")
           .update({ question, answer, tags, position, featured })
           .eq("id", editingFaq.id);
         if (error) throw error;
         toast({ title: "FAQ atualizado", description: "As alterações foram salvas com sucesso." });
       } else {
         const { error } = await supabase
           .from("faqs")
           .insert([{ question, answer, tags, position, featured }]);
         if (error) throw error;
         toast({ title: "FAQ criado", description: "A nova pergunta foi cadastrada." });
       }
       setIsFormOpen(false);
       setEditingFaq(null);
       queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
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
         .from("faqs")
         .delete()
         .eq("id", pendingDelete.id);
       if (error) throw error;
       toast({ title: "FAQ excluído", description: "A pergunta foi removida com sucesso." });
       setPendingDelete(null);
       queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
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
           <h1 className="font-display text-3xl text-brand-text-light">Perguntas (FAQ)</h1>
           <p className="text-sm text-brand-text-muted mt-1">Gerencie as dúvidas frequentes que podem ser exibidas nas páginas.</p>
         </div>
         <Button onClick={() => { setEditingFaq(null); setIsFormOpen(true); }} className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
           <Plus className="size-4 mr-2" />
           Nova Pergunta
         </Button>
       </div>
 
       <div className="mb-6 relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-text-muted" />
         <Input 
           placeholder="Buscar por pergunta, resposta ou categoria..." 
           className="pl-10 bg-brand-graphite/30 border-brand-gold/15 text-brand-text-light"
           value={search}
           onChange={(e) => setSearch(e.target.value)}
         />
       </div>
 
       {isLoading ? (
         <p className="text-brand-text-muted">Carregando...</p>
       ) : (
         <div className="border border-brand-gold/15 bg-brand-graphite/20">
           <table className="w-full text-sm">
             <thead className="text-left text-[10px] uppercase tracking-[0.2em] text-brand-text-muted border-b border-brand-gold/15">
               <tr>
                 <th className="px-5 py-3 w-12">Pos.</th>
                 <th className="px-5 py-3">Pergunta</th>
                 <th className="px-5 py-3">Categorias</th>
                 <th className="px-5 py-3 text-center">Destaque</th>
                 <th className="px-5 py-3 w-32 text-right">Ações</th>
               </tr>
             </thead>
             <tbody>
               {filteredFaqs?.map((faq) => (
                 <tr key={faq.id} className="border-t border-brand-gold/10 hover:bg-brand-graphite/30">
                   <td className="px-5 py-3 text-brand-text-muted text-xs">{faq.position}</td>
                   <td className="px-5 py-3 text-brand-text-light max-w-md truncate font-medium">
                     {faq.question}
                   </td>
                   <td className="px-5 py-3">
                     <div className="flex flex-wrap gap-1">
                       {faq.tags?.map(tag => (
                         <Badge key={tag} variant="outline" className="text-[10px] border-brand-gold/30 text-brand-gold/80 px-1.5 py-0">
                           {tag}
                         </Badge>
                       ))}
                     </div>
                   </td>
                   <td className="px-5 py-3 text-center">
                     {faq.featured && <Star className="size-4 text-brand-gold fill-brand-gold mx-auto" />}
                   </td>
                   <td className="px-5 py-3 text-right">
                     <div className="flex items-center justify-end gap-3">
                       <button
                         onClick={() => { setEditingFaq(faq); setIsFormOpen(true); }}
                         className="text-brand-gold hover:underline inline-flex items-center gap-1.5 text-xs"
                       >
                         <Pencil className="size-3.5" />
                         Editar
                       </button>
                       <button
                         onClick={() => setPendingDelete(faq)}
                         className="text-brand-text-muted hover:text-destructive transition-colors"
                       >
                         <Trash2 className="size-4" />
                       </button>
                     </div>
                   </td>
                 </tr>
               ))}
               {filteredFaqs?.length === 0 && (
                 <tr>
                   <td colSpan={5} className="px-5 py-8 text-center text-brand-text-muted">
                     Nenhuma pergunta encontrada.
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
       )}
 
       <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingFaq(null); }}>
         <DialogContent className="max-w-2xl bg-brand-graphite border-brand-gold/20 text-brand-text-light">
           <DialogHeader>
             <DialogTitle className="text-brand-text-light">
               {editingFaq ? "Editar Pergunta" : "Nova Pergunta (FAQ)"}
             </DialogTitle>
           </DialogHeader>
           <form onSubmit={handleSave} className="space-y-4 pt-4">
             <div className="space-y-2">
               <Label htmlFor="question">Pergunta</Label>
               <Input 
                 id="question" 
                 name="question" 
                 defaultValue={editingFaq?.question} 
                 required 
                 className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 placeholder="Ex: Qual o horário de atendimento?"
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="answer">Resposta</Label>
               <Textarea 
                 id="answer" 
                 name="answer" 
                 defaultValue={editingFaq?.answer} 
                 required 
                 className="min-h-[120px] bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 placeholder="Escreva a resposta detalhada..."
               />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="tags">Categorias (separadas por vírgula)</Label>
                 <Input 
                   id="tags" 
                   name="tags" 
                   defaultValue={editingFaq?.tags?.join(", ")} 
                   className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                   placeholder="Ex: Geral, Tratamentos"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="position">Posição / Ordem</Label>
                 <Input 
                   id="position" 
                   name="position" 
                   type="number"
                   defaultValue={editingFaq?.position || 0} 
                   className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 />
               </div>
             </div>
             <div className="flex items-center space-x-2 pt-2">
               <Switch 
                 id="featured" 
                 name="featured" 
                 defaultChecked={editingFaq?.featured} 
                 className="data-[state=checked]:bg-brand-gold"
               />
               <Label htmlFor="featured">Destaque (Aparecer primeiro ou com estilo especial)</Label>
             </div>
             <DialogFooter className="pt-4">
               <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="text-brand-text-muted hover:text-brand-text-light">
                 Cancelar
               </Button>
               <Button type="submit" disabled={isSaving} className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
                 {isSaving ? "Salvando..." : "Salvar FAQ"}
               </Button>
             </DialogFooter>
           </form>
         </DialogContent>
       </Dialog>
 
       <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}>
         <AlertDialogContent className="bg-brand-graphite border-brand-gold/20 text-brand-text-light">
           <AlertDialogHeader>
             <AlertDialogTitle className="text-brand-text-light">Excluir FAQ?</AlertDialogTitle>
             <AlertDialogDescription className="text-brand-text-muted">
               Você está prestes a excluir a pergunta: <br/>
               <strong className="text-brand-text-light">"{pendingDelete?.question}"</strong>. <br/><br/>
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