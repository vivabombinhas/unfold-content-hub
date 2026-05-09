 import { useState, useEffect, useCallback } from "react";
 import { Search, Loader2, X, ExternalLink, Download, Check, Eye, Globe, Maximize2, Minimize2, LayoutGrid, List, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { searchPhotos, getCuratedPhotos, PexelsPhoto } from "@/lib/pexels";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

 interface Props {
   onSelect: (url: string) => void;
   externalFitMode?: 'cover' | 'contain';
   searchQuery?: string;
   onFocusImage?: (image: any) => void;
 }
 
 export function PexelsBank({ onSelect, externalFitMode, searchQuery = "", onFocusImage }: Props) {
   const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
   const [loading, setLoading] = useState(false);
   const [importing, setImporting] = useState<number | null>(null);
   const [page, setPage] = useState(1);
   const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
   const fitMode = externalFitMode || 'cover';

  const fetchPhotos = useCallback(async (query: string, p: number) => {
    setLoading(true);
    try {
      let data;
      if (!query.trim()) {
        data = await getCuratedPhotos(p);
      } else {
        let searchQuery = query.trim();
        // Append aesthetic keywords if not present to maintain the requested "estética" focus
        if (!searchQuery.toLowerCase().includes("aesthetic") && !searchQuery.toLowerCase().includes("estética")) {
          searchQuery += " aesthetic beauty";
        }
        data = await searchPhotos(searchQuery, p);
      }
      
      if (p === 1) {
        setPhotos(data.photos);
      } else {
        setPhotos(prev => [...prev, ...data.photos]);
      }
    } catch (error) {
      console.error("Pexels fetch error:", error);
      toast({
        title: "Erro ao buscar fotos",
        description: "Não foi possível carregar as imagens do Pexels. Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

   useEffect(() => {
     setPage(1);
     fetchPhotos(searchQuery, 1);
   }, [searchQuery, fetchPhotos]);

   const loadMore = () => {
     const nextPage = page + 1;
     setPage(nextPage);
     fetchPhotos(searchQuery, nextPage);
   };

  const saveToLibrary = async (photo: PexelsPhoto) => {
    setImporting(photo.id);
    try {
      const { error } = await supabase.from("image_bank").insert({
        url: photo.src.large2x,
        title: photo.alt || `Estética por ${photo.photographer}`,
        category: "Estética",
        tags: ["Pexels", "Externo"]
      });

      if (error) throw error;

      setImportedIds(prev => new Set([...prev, photo.id]));
      toast({
        title: "Salvo com sucesso!",
        description: "Imagem adicionada ao seu acervo interno.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a imagem no acervo.",
        variant: "destructive",
      });
    } finally {
      setImporting(null);
    }
  };

   return (
     <div className="space-y-6">
       {loading && photos.length === 0 ? (
         <div className="flex flex-col items-center justify-center py-20 gap-3">
           <Loader2 className="size-10 text-brand-gold animate-spin" />
           <p className="text-xs text-brand-text-muted uppercase tracking-widest">Consultando Pexels Global...</p>
         </div>
       ) : photos.length > 0 ? (
         <div className="space-y-8">
           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
             {photos.map((photo) => (
               <div 
                 key={photo.id}
                 onDoubleClick={() => onSelect(photo.src.large2x)}
                 onClick={() => onFocusImage?.({
                   id: photo.id.toString(),
                   url: photo.src.large2x,
                   title: photo.alt || `Foto por ${photo.photographer}`,
                   category: "Pexels Global",
                   tags: ["Pexels", "Externo"],
                   photographer: photo.photographer,
                   onSave: () => saveToLibrary(photo),
                   importing: importing === photo.id,
                   isImported: importedIds.has(photo.id)
                 })}
                 className={cn(
                   "group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 shadow-2xl bg-brand-black/40",
                   "hover:scale-[1.02] hover:shadow-brand-gold/10"
                 )}
               >
                 <div className="aspect-[3/4] overflow-hidden relative">
                   <img 
                     src={photo.src.medium} 
                     alt={photo.alt} 
                     className={cn(
                       "w-full h-full transition-all duration-1000",
                       fitMode === 'cover' ? 'object-cover' : 'object-contain p-4 bg-white/5',
                       "group-hover:scale-110"
                     )}
                     loading="lazy"
                   />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                     <div className="size-10 rounded-full bg-brand-gold text-brand-bg flex items-center justify-center shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-300">
                       <Check className="size-5" />
                     </div>
                   </div>
                 </div>
                 <div className="p-3 bg-brand-black/80 backdrop-blur-md border-t border-white/5">
                   <p className="text-[10px] text-white/40 truncate uppercase tracking-widest font-medium">@{photo.photographer}</p>
                 </div>
               </div>
             ))}
           </div>
           
           <div className="flex justify-center pb-12 pt-4">
             <Button 
               variant="outline" 
               size="lg" 
               onClick={loadMore}
               disabled={loading}
               className="h-12 text-xs uppercase tracking-[0.2em] border-brand-gold/20 text-brand-gold hover:bg-brand-gold/10 px-12 rounded-xl"
             >
               {loading ? <Loader2 className="size-4 mr-3 animate-spin" /> : null}
               Carregar mais resultados
             </Button>
           </div>
         </div>
       ) : (
         <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
           <ImageIcon className="size-16" />
           <p className="text-sm font-light uppercase tracking-[0.2em]">Nenhuma imagem encontrada</p>
         </div>
       )}
     </div>
  );
}
