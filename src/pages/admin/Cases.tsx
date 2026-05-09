 import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Search, Image as ImageIcon, Check, X, Globe, Loader2, Grid } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { ImageThumb } from "@/components/admin/ImageThumb";

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
   const [searchTerm, setSearchTerm] = useState("");
   const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Case | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapedImages, setScrapedImages] = useState<{ url: string; alt: string }[]>([]);
  const [recentImages, setRecentImages] = useState<{ url: string }[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  
  const [caseData, setCaseData] = useState<Partial<Case>>({});

  const fetchRecentImages = async () => {
    try {
      const { data, error } = await supabase.storage.from("media").list("uploads", {
        limit: 20,
        sortBy: { column: "created_at", order: "desc" }
      });
      if (error) throw error;
      const urls = data.map(f => ({
        url: supabase.storage.from("media").getPublicUrl(`uploads/${f.name}`).data.publicUrl
      }));
      setRecentImages(urls);
    } catch (e) {
      console.error("Error fetching recent images:", e);
    }
  };

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
    fetchRecentImages();
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

   // Update debounced search
   useEffect(() => {
     const timer = setTimeout(() => {
       setDebouncedSearch(searchTerm);
     }, 300);
     return () => clearTimeout(timer);
   }, [searchTerm]);

   const filteredCases = cases?.filter(c => {
     if (!debouncedSearch) return true;
     const s = debouncedSearch.toLowerCase();
     return (
       (c.area?.toLowerCase().includes(s) || 
        c.notes?.toLowerCase().includes(s) ||
        c.slug?.toLowerCase().includes(s) ||
        c.toxin?.toLowerCase().includes(s))
     );
   });

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
        toast({ title: "Caso clínico atualizado" });
      } else {
        const { error } = await supabase
          .from("cases")
          .insert([payload]);
        if (error) throw error;
        toast({ title: "Caso clínico criado" });
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
      toast({ title: "Caso excluído" });
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin-cases"] });
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl text-brand-text-light">Casos Clínicos</h1>
          <p className="text-sm text-brand-text-muted mt-1">Gerencie a biblioteca de antes e depois.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-brand-graphite/40 p-1 rounded-md border border-brand-gold/10 mr-2">
             <Button 
               variant="ghost" 
               size="sm" 
               className={cn("h-8 px-2.5", viewMode === 'list' ? "bg-brand-gold/20 text-brand-gold" : "text-brand-text-muted")}
               onClick={() => setViewMode('list')}
             >
               <Search className="size-3.5" />
             </Button>
             <Button 
               variant="ghost" 
               size="sm" 
               className={cn("h-8 px-2.5", viewMode === 'grid' ? "bg-brand-gold/20 text-brand-gold" : "text-brand-text-muted")}
               onClick={() => setViewMode('grid')}
             >
               <Grid className="size-3.5" />
             </Button>
          </div>
          <Button onClick={() => handleOpenForm(null)} className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
            <Plus className="size-4 mr-2" />
            Novo Caso
          </Button>
        </div>
      </div>

      <div className="mb-6 relative">
          <div className="relative group mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-text-muted z-10" />
           <input 
             placeholder="Buscar por área, notas, slug ou toxina..." 
             className="w-full pl-10 pr-10 h-12 rounded-lg bg-brand-graphite/40 border border-brand-gold/20 text-brand-text-light focus:outline-none focus:ring-2 focus:ring-brand-gold/30 transition-all placeholder:text-brand-text-muted/50"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             onKeyDown={(e) => {
               if (e.key === 'Enter') {
                 setDebouncedSearch(searchTerm);
               }
             }}
           />
           {searchTerm && (
             <button 
               onClick={() => {
                 setSearchTerm("");
                 setDebouncedSearch("");
               }}
               className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
             >
               <X className="size-4 text-brand-text-muted" />
             </button>
           )}
         </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 text-brand-gold animate-spin" />
        </div>
      ) : viewMode === "list" ? (
        <div className="border border-brand-gold/15 bg-brand-graphite/20 overflow-hidden rounded-sm">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-[0.2em] text-brand-text-muted border-b border-brand-gold/15">
              <tr>
                <th className="px-5 py-3 w-12 text-center">Pos.</th>
                <th className="px-5 py-3 w-24">Fotos</th>
                <th className="px-5 py-3">Área / Identificador</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 w-32 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases?.map((c) => (
                <tr key={c.id} className="border-t border-brand-gold/10 hover:bg-brand-graphite/30 group">
                  <td className="px-5 py-4 text-brand-text-muted text-xs text-center font-mono">{c.position}</td>
                  <td className="px-5 py-4">
                    <div className="flex -space-x-3">
                      {c.cover_url ? (
                        <img src={c.cover_url} className="size-10 rounded-full border-2 border-brand-graphite object-cover shadow-lg" />
                      ) : (
                        <div className="size-10 rounded-full border-2 border-brand-graphite bg-brand-black/40 flex items-center justify-center">
                          <ImageIcon className="size-4 text-brand-text-muted/30" />
                        </div>
                      )}
                      {c.before_url && <img src={c.before_url} className="size-10 rounded-full border-2 border-brand-graphite object-cover shadow-lg" />}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-brand-text-light font-medium">{c.area || "Sem área"}</div>
                    <div className="text-brand-text-muted text-[10px] mt-0.5 font-mono">{c.slug}</div>
                  </td>
                  <td className="px-5 py-4">
                    {c.highlight && (
                      <span className="text-[9px] bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded border border-brand-gold/20 uppercase font-bold">Destaque</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenForm(c)}>
                        <Pencil className="size-3.5 text-brand-gold" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPendingDelete(c)}>
                        <Trash2 className="size-3.5 text-brand-text-muted" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCases?.map((c) => (
            <div key={c.id} className="bg-brand-graphite/20 border border-brand-gold/15 rounded-sm overflow-hidden group hover:border-brand-gold/40 transition-colors">
              <div className="aspect-video relative overflow-hidden bg-brand-black/40">
                {c.cover_url ? <img src={c.cover_url} className="w-full h-full object-cover" /> : <ImageIcon className="size-8 text-brand-text-muted/20 absolute inset-0 m-auto" />}
                <div className="absolute inset-0 bg-brand-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleOpenForm(c)}><Pencil className="size-3.5 mr-1" /> Editar</Button>
                  <Button size="sm" variant="destructive" onClick={() => setPendingDelete(c)}><Trash2 className="size-3.5" /></Button>
                </div>
              </div>
              <div className="p-4">
                <p className="text-brand-text-light font-medium text-sm truncate">{c.area || "Sem área"}</p>
                <p className="text-[10px] text-brand-text-muted font-mono truncate">{c.slug}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl bg-brand-graphite border-brand-gold/20 text-brand-text-light overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingCase ? "Editar Caso" : "Novo Caso"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 mt-4">
            <form onSubmit={handleSave} className="space-y-4 pr-0 lg:pr-8 border-r-0 lg:border-r border-brand-gold/10">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Identificador (Slug)</Label>
                  <Input value={caseData.slug || ""} onChange={e => setCaseData(p => ({...p, slug: e.target.value}))} required className="bg-brand-black/40 border-brand-gold/10" />
                </div>
                <div className="space-y-2">
                  <Label>Área / Procedimento</Label>
                  <Input value={caseData.area || ""} onChange={e => setCaseData(p => ({...p, area: e.target.value}))} className="bg-brand-black/40 border-brand-gold/10" />
                </div>
              </div>

              <div className="space-y-6">
                <MediaInput label="Foto de Capa" value={caseData.cover_url || ""} onChange={url => setCaseData(p => ({...p, cover_url: url}))} />
                <div className="grid grid-cols-2 gap-4">
                  <MediaInput label="Antes" value={caseData.before_url || ""} onChange={url => setCaseData(p => ({...p, before_url: url}))} />
                  <MediaInput label="Depois" value={caseData.after_url || ""} onChange={url => setCaseData(p => ({...p, after_url: url}))} />
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Idade/Rótulo</Label>
                   <Input value={caseData.age || ""} onChange={e => setCaseData(p => ({...p, age: e.target.value}))} placeholder="Ex: 35 anos" className="bg-brand-black/40 border-brand-gold/10" />
                 </div>
                 <div className="space-y-2">
                   <Label>Toxina utilizada</Label>
                   <Input value={caseData.toxin || ""} onChange={e => setCaseData(p => ({...p, toxin: e.target.value}))} placeholder="Ex: Botox" className="bg-brand-black/40 border-brand-gold/10" />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Dosagem</Label>
                   <Input value={caseData.dosage || ""} onChange={e => setCaseData(p => ({...p, dosage: e.target.value}))} placeholder="Ex: 50 unidades" className="bg-brand-black/40 border-brand-gold/10" />
                 </div>
                 <div className="space-y-2">
                   <Label>Tempo de resultado</Label>
                   <Input value={caseData.duration || ""} onChange={e => setCaseData(p => ({...p, duration: e.target.value}))} placeholder="Ex: 14 dias" className="bg-brand-black/40 border-brand-gold/10" />
                 </div>
               </div>

               <div className="space-y-2">
                 <Label>Notas do Caso</Label>
                 <Textarea value={caseData.notes || ""} onChange={e => setCaseData(p => ({...p, notes: e.target.value}))} className="bg-brand-black/40 border-brand-gold/10 min-h-[80px]" />
               </div>

              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <Switch checked={caseData.highlight} onCheckedChange={v => setCaseData(p => ({...p, highlight: v}))} />
                  <Label>Destaque</Label>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Label>Posição</Label>
                  <Input type="number" value={caseData.position || 0} onChange={e => setCaseData(p => ({...p, position: parseInt(e.target.value) || 0}))} className="w-20 bg-brand-black/40 border-brand-gold/10" />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSaving} className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
                  {isSaving ? "Salvando..." : "Salvar Caso"}
                </Button>
              </DialogFooter>
            </form>

            <div className="space-y-6">
              <div>
                <Label className="text-brand-gold text-[10px] uppercase tracking-widest mb-3 block">Importar de URL</Label>
                <div className="flex gap-2">
                  <Input placeholder="URL da página..." value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} className="bg-brand-black/40 border-brand-gold/10 text-xs h-9" />
                  <Button size="sm" variant="outline" onClick={handleScrape} disabled={isScraping || !scrapeUrl} className="h-9">
                    {isScraping ? <Loader2 className="size-3.5 animate-spin" /> : <Globe className="size-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {scrapedImages.length > 0 && (
                  <div>
                    <p className="text-[10px] text-brand-text-muted uppercase mb-2">Resultados da Busca</p>
                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2">
                      {scrapedImages.map((img, i) => (
                        <ImageThumb key={i} url={img.url} onSelect={(type) => setCaseData(p => ({...p, [`${type}_url`]: img.url}))} />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[10px] text-brand-text-muted uppercase mb-2">Uploads Recentes</p>
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                    {recentImages.map((img, i) => (
                      <ImageThumb key={i} url={img.url} onSelect={(type) => setCaseData(p => ({...p, [`${type}_url`]: img.url}))} />
                    ))}
                    {recentImages.length === 0 && (
                      <div className="col-span-2 py-8 text-center border border-dashed border-brand-gold/10 rounded text-[10px] text-brand-text-muted">
                        Nenhum upload recente.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={o => !o && setPendingDelete(null)}>
        <AlertDialogContent className="bg-brand-graphite border-brand-gold/20 text-brand-text-light">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir caso?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
