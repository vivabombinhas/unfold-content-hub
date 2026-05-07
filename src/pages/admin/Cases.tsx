 import { useState } from "react";
 import { useQuery, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Plus, Pencil, Trash2, Search, Image as ImageIcon, Check, X, Globe, Loader2 } from "lucide-react";
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
 import { MediaInput } from "@/components/admin/MediaInput";
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
   const [isScraping, setIsScraping] = useState(false);
   const [scrapeUrl, setScrapeUrl] = useState("");
   const [scrapedImages, setScrapedImages] = useState<{ url: string; alt: string }[]>([]);
   
   // Form states to handle MediaInput outside of native FormData if needed, 
   // but since MediaInput just calls onChange, we can use state or refs.
   const [caseData, setCaseData] = useState<Partial<Case>>({});
 
   const handleOpenForm = (c: Case | null) => {
     setEditingCase(c);
     setCaseData(c || {
       slug: "",
       area: "",
       cover_url: "",
       before_url: "",
       after_url: "",
       notes: "",
       age: "",
       dosage: "",
       duration: "",
       toxin: "",
       position: 0,
       highlight: false,
     });
     setScrapedImages([]);
     setScrapeUrl("");
     setIsFormOpen(true);
   };
 
   const handleScrape = async () => {
     if (!scrapeUrl) return;
     setIsScraping(true);
     try {
       const { data: res, error } = await supabase.functions.invoke("extract-page-images", {
         body: { url: scrapeUrl }
       });
       if (error) throw error;
       setScrapedImages(res.image_candidates || []);
       toast({ title: "Busca concluída", description: `${res.image_candidates?.length || 0} imagens encontradas.` });
     } catch (err: any) {
       toast({ title: "Erro na busca", description: err.message, variant: "destructive" });
     } finally {
       setIsScraping(false);
     }
   };
 
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
 
   const handleSave = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsSaving(true);
     
     try {
       const payload = {
         slug: caseData.slug,
         area: caseData.area,
         age: caseData.age,
         cover_url: caseData.cover_url,
         before_url: caseData.before_url,
         after_url: caseData.after_url,
         notes: caseData.notes,
         dosage: caseData.dosage,
         duration: caseData.duration,
         toxin: caseData.toxin,
         position: Number(caseData.position) || 0,
         highlight: caseData.highlight,
       };
 
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
         <Button onClick={() => handleOpenForm(null)} className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
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
                           onClick={() => handleOpenForm(c)}
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
 
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
         <DialogContent className="max-w-4xl bg-brand-graphite border-brand-gold/20 text-brand-text-light overflow-y-auto max-h-[90vh]">
           <DialogHeader>
             <DialogTitle className="text-brand-text-light flex items-center gap-2">
               {editingCase ? "Editar Caso Clínico" : "Novo Caso Clínico"}
               {editingCase && <span className="text-xs font-mono text-brand-text-muted">ID: {editingCase.id}</span>}
             </DialogTitle>
           </DialogHeader>
 
           <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
             <form onSubmit={handleSave} className="space-y-4 pt-4 border-r border-brand-gold/10 pr-8">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="slug">Slug / Identificador (ex: peeling-diamante-1)</Label>
                   <Input 
                     id="slug" 
                     value={caseData.slug || ""}
                     onChange={(e) => setCaseData(prev => ({ ...prev, slug: e.target.value }))}
                     required 
                     className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="area">Área / Procedimento (ex: Peeling de Diamante)</Label>
                   <Input 
                     id="area" 
                     value={caseData.area || ""}
                     onChange={(e) => setCaseData(prev => ({ ...prev, area: e.target.value }))}
                     className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                   />
                 </div>
               </div>
 
               <div className="space-y-6 py-2">
                 <MediaInput 
                   label="Foto de Capa (principal)" 
                   value={caseData.cover_url || ""} 
                   onChange={(url) => setCaseData(prev => ({ ...prev, cover_url: url }))} 
                 />
                 <div className="grid grid-cols-2 gap-4">
                   <MediaInput 
                     label="Foto ANTES" 
                     value={caseData.before_url || ""} 
                     onChange={(url) => setCaseData(prev => ({ ...prev, before_url: url }))} 
                   />
                   <MediaInput 
                     label="Foto DEPOIS" 
                     value={caseData.after_url || ""} 
                     onChange={(url) => setCaseData(prev => ({ ...prev, after_url: url }))} 
                   />
                 </div>
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="notes">Notas do Caso / Descrição</Label>
                 <Textarea 
                   id="notes" 
                   value={caseData.notes || ""}
                   onChange={(e) => setCaseData(prev => ({ ...prev, notes: e.target.value }))}
                   className="min-h-[80px] bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                 />
               </div>
 
               <div className="grid grid-cols-4 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="age">Idade</Label>
                   <Input 
                     id="age" 
                     value={caseData.age || ""}
                     onChange={(e) => setCaseData(prev => ({ ...prev, age: e.target.value }))}
                     className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="dosage">Dosagem</Label>
                   <Input 
                     id="dosage" 
                     value={caseData.dosage || ""}
                     onChange={(e) => setCaseData(prev => ({ ...prev, dosage: e.target.value }))}
                     className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="duration">Duração</Label>
                   <Input 
                     id="duration" 
                     value={caseData.duration || ""}
                     onChange={(e) => setCaseData(prev => ({ ...prev, duration: e.target.value }))}
                     className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="toxin">Toxina / Produto</Label>
                   <Input 
                     id="toxin" 
                     value={caseData.toxin || ""}
                     onChange={(e) => setCaseData(prev => ({ ...prev, toxin: e.target.value }))}
                     className="bg-brand-black/50 border-brand-gold/15 text-brand-text-light"
                   />
                 </div>
               </div>
 
               <div className="flex items-center gap-8 pt-2">
                 <div className="flex items-center gap-2">
                   <Switch 
                     id="highlight" 
                     checked={caseData.highlight} 
                     onCheckedChange={(val) => setCaseData(prev => ({ ...prev, highlight: val }))}
                   />
                   <Label htmlFor="highlight">Destaque na Home</Label>
                 </div>
                 <div className="flex items-center gap-2 flex-1">
                   <Label htmlFor="position">Posição</Label>
                   <Input 
                     id="position" 
                     type="number"
                     value={caseData.position || 0} 
                     onChange={(e) => setCaseData(prev => ({ ...prev, position: parseInt(e.target.value) || 0 }))}
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
 
             <div className="pt-4 space-y-4">
               <div>
                 <h3 className="text-sm font-medium text-brand-gold mb-1 flex items-center gap-2">
                   <Globe className="size-4" /> Importar de URL
                 </h3>
                 <p className="text-[11px] text-brand-text-muted mb-3 leading-relaxed">
                   Extraia fotos automaticamente de uma página existente da clínica.
                 </p>
                 <div className="flex gap-2">
                   <Input 
                     placeholder="URL da página..." 
                     className="bg-brand-black/30 border-brand-gold/10 text-xs" 
                     value={scrapeUrl}
                     onChange={(e) => setScrapeUrl(e.target.value)}
                   />
                   <Button 
                     size="sm" 
                     variant="outline" 
                     className="bg-brand-gold/5"
                     disabled={isScraping || !scrapeUrl}
                     onClick={handleScrape}
                   >
                     {isScraping ? <Loader2 className="size-3.5 animate-spin" /> : "Buscar"}
                   </Button>
                 </div>
               </div>
 
               <div className="border-t border-brand-gold/10 pt-4">
                 <h4 className="text-[10px] uppercase tracking-wider text-brand-text-muted mb-2">Imagens encontradas</h4>
                 <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                   {scrapedImages.length === 0 && !isScraping && (
                     <div className="col-span-2 py-8 text-center border border-dashed border-brand-gold/10 rounded">
                       <ImageIcon className="size-6 text-brand-text-muted/30 mx-auto mb-2" />
                       <p className="text-[10px] text-brand-text-muted px-4">Insira uma URL acima para localizar fotos.</p>
                     </div>
                   )}
                   {isScraping && (
                     <div className="col-span-2 py-8 text-center">
                       <Loader2 className="size-6 text-brand-gold animate-spin mx-auto mb-2" />
                       <p className="text-[10px] text-brand-text-muted">Analisando página...</p>
                     </div>
                   )}
                   {scrapedImages.map((img, i) => (
                     <div key={i} className="group relative aspect-square bg-brand-black/50 rounded overflow-hidden border border-brand-gold/5">
                       <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-brand-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                         <Button 
                           size="sm" 
                           className="w-full h-7 text-[9px] bg-brand-gold text-brand-bg hover:bg-brand-gold/90 py-0"
                           onClick={() => setCaseData(prev => ({ ...prev, cover_url: img.url }))}
                         >
                           Usar Capa
                         </Button>
                         <div className="flex gap-1 w-full">
                           <Button 
                             size="sm" 
                             variant="outline"
                             className="flex-1 h-7 text-[9px] border-brand-gold/30 hover:bg-brand-gold/10 py-0"
                             onClick={() => setCaseData(prev => ({ ...prev, before_url: img.url }))}
                           >
                             Antes
                           </Button>
                           <Button 
                             size="sm" 
                             variant="outline"
                             className="flex-1 h-7 text-[9px] border-brand-gold/30 hover:bg-brand-gold/10 py-0"
                             onClick={() => setCaseData(prev => ({ ...prev, after_url: img.url }))}
                           >
                             Depois
                           </Button>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
           </div>
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