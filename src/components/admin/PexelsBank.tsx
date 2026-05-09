 import { useState, useEffect, useCallback } from "react";
 import { Search, Loader2, X, ExternalLink, Download, Check, Eye, Globe, Maximize2, Minimize2, LayoutGrid, List } from "lucide-react";
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
}

 export function PexelsBank({ onSelect, externalFitMode }: Props) {
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [previewPhoto, setPreviewPhoto] = useState<PexelsPhoto | null>(null);
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
   const [internalFitMode, setInternalFitMode] = useState<'cover' | 'contain'>('cover');
   const fitMode = externalFitMode || internalFitMode;
   const setFitMode = setInternalFitMode;
   const [columns, setColumns] = useState<2 | 3 | 4>(2);

  const fetchPhotos = useCallback(async (query: string, p: number) => {
    setLoading(true);
    try {
      // Enforce aesthetic focus and use English terms for better Pexels results
      let searchQuery = query.trim();
      if (!searchQuery) {
        searchQuery = "aesthetic medical clinic beauty treatment skincare";
      } else {
        // Append relevant aesthetic keywords to user query if they are not already there
        if (!searchQuery.toLowerCase().includes("estética") && !searchQuery.toLowerCase().includes("aesthetic")) {
          searchQuery += " aesthetic beauty";
        }
      }
      
      const data = await searchPhotos(searchQuery, p);
      
      if (p === 1) {
        setPhotos(data.photos);
      } else {
        setPhotos(prev => [...prev, ...data.photos]);
      }
    } catch (error) {
      toast({
        title: "Erro ao buscar fotos",
        description: "Não foi possível carregar as imagens do Pexels.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchPhotos(search, 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, fetchPhotos]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPhotos(search, nextPage);
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
    <div className="flex flex-col h-full bg-brand-bg/50">
        <div className="p-4 md:p-6 pb-2 sticky top-0 z-20 bg-brand-black/95 backdrop-blur-sm border-b border-white/5">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-gold/50" />
                <Input 
                  placeholder="Buscar por estética, clínica, skincare..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-xs h-10 md:h-12 focus-visible:ring-brand-gold/50 w-full"
                />
              </div>
              
              <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-lg border border-white/10 shrink-0">
                <div className="flex items-center border-r border-white/10 pr-2 mr-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')}
                    className={`size-8 ${fitMode === 'contain' ? 'text-brand-gold bg-brand-gold/10' : 'text-white/50'}`}
                    title={fitMode === 'cover' ? "Mudar para Ajustar (Contain)" : "Mudar para Preencher (Cover)"}
                  >
                    {fitMode === 'cover' ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
                  </Button>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setColumns(2)}
                    className={`size-8 ${columns === 2 ? 'text-brand-gold bg-brand-gold/10' : 'text-white/50'}`}
                    title="Visualização Ampla"
                  >
                    <LayoutGrid className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setColumns(4)}
                    className={`size-8 ${columns === 4 ? 'text-brand-gold bg-brand-gold/10' : 'text-white/50'}`}
                    title="Visualização Compacta"
                  >
                    <List className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-brand-gold/60 uppercase tracking-widest text-center sm:text-left">
              Dica: Clique na imagem para ver em tela cheia antes de selecionar
            </p>
          </div>
        </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 pt-0">
          {loading && photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="size-8 text-brand-gold animate-spin" />
              <p className="text-xs text-brand-text-muted uppercase tracking-widest">Consultando Pexels...</p>
            </div>
          ) : photos.length > 0 ? (
            <div className="space-y-6">
               <div className={`grid gap-3 md:gap-4 ${
                 columns === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
               }`}>
                {photos.map((photo) => (
                  <div 
                    key={photo.id}
                    className="group relative flex flex-col rounded-lg border border-white/5 bg-brand-black/40 overflow-hidden transition-all shadow-xl hover:border-brand-gold/30"
                  >
                    <div 
                      className={`relative ${columns === 4 ? 'aspect-square' : 'aspect-[4/5] sm:aspect-[3/4]'} overflow-hidden cursor-pointer bg-black/20`} 
                      onClick={() => setPreviewPhoto(photo)}
                    >
                      <img 
                        src={columns === 4 ? photo.src.small : photo.src.medium} 
                        alt={photo.alt} 
                        className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'} transition-all duration-700 ${fitMode === 'cover' ? 'group-hover:scale-105' : ''}`}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="size-10 rounded-full bg-brand-gold/20 backdrop-blur-md flex items-center justify-center border border-brand-gold/30">
                            <Eye className="size-5 text-brand-gold" />
                          </div>
                          <span className="text-[8px] text-brand-gold uppercase tracking-[0.2em] font-bold">Ver Foto</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2 md:p-3 bg-brand-black/60 border-t border-white/5 space-y-2">
                      <p className="text-[8px] text-white/40 truncate uppercase tracking-widest">
                        {photo.photographer}
                      </p>
                      <div className="flex gap-1.5">
                        <Button 
                          onClick={() => onSelect(photo.src.large2x)}
                          className="flex-1 h-8 text-[9px] uppercase tracking-[0.1em] bg-brand-gold text-brand-bg hover:bg-brand-gold/90 font-bold"
                        >
                          Selecionar
                        </Button>
                        <Button 
                          variant="outline"
                          size="icon"
                          disabled={importedIds.has(photo.id) || importing === photo.id}
                          onClick={() => saveToLibrary(photo)}
                          className="size-8 border-brand-gold/20 text-brand-gold hover:bg-brand-gold/10 shrink-0"
                          title="Salvar no acervo interno"
                        >
                          {importing === photo.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : importedIds.has(photo.id) ? (
                            <Check className="size-3" />
                          ) : (
                            <Download className="size-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center pb-8 pt-4">
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={loadMore}
                  disabled={loading}
                  className="text-xs uppercase tracking-widest border-brand-gold/20 text-brand-gold hover:bg-brand-gold/10 px-8"
                >
                  {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                  Carregar mais resultados
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="size-16 rounded-full bg-white/5 flex items-center justify-center">
                <X className="size-8 text-white/20" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-white/70">Nenhuma imagem encontrada</p>
                <p className="text-xs text-brand-text-muted">Tente buscar por termos diferentes ou em inglês.</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="px-6 py-3 border-t border-white/5 bg-brand-black/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-brand-text-muted uppercase tracking-widest">Powered by</span>
          <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="opacity-40 hover:opacity-100 transition-opacity">
            <img src="https://images.pexels.com/lib/api/pexels-white.png" alt="Pexels" className="h-4" />
          </a>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-brand-text-muted uppercase tracking-widest">
          <Globe className="size-3" />
          Acervo de milhões de fotos
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="max-w-3xl border-brand-gold/20 bg-brand-bg p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-4 border-b border-white/5 bg-brand-black/40">
            <DialogTitle className="text-sm font-display italic text-brand-gold flex items-center justify-between">
              <span>Pré-visualização da Imagem</span>
              <span className="text-[10px] text-brand-text-muted uppercase tracking-widest font-sans not-italic">
                Foto por {previewPhoto?.photographer}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {previewPhoto && (
            <div className="flex flex-col h-[70vh] md:h-auto">
              <div className="flex-1 relative overflow-hidden bg-black/40 min-h-[300px] flex items-center justify-center">
                <img 
                  src={previewPhoto.src.large2x} 
                  alt={previewPhoto.alt}
                  className="max-w-full max-h-[60vh] object-contain shadow-2xl"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white rounded-full z-10"
                  onClick={() => setPreviewPhoto(null)}
                >
                  <X className="size-5" />
                </Button>
              </div>
              <div className="p-4 md:p-6 bg-brand-black/90 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 min-w-0 text-center md:text-left">
                  <p className="text-xs text-white/90 line-clamp-2 md:line-clamp-1 italic font-display">{previewPhoto.alt || "Sem descrição disponível"}</p>
                  <p className="text-[10px] text-brand-gold uppercase tracking-[0.2em] mt-1 font-bold">Resolução Original • Créditos: {previewPhoto.photographer}</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={importedIds.has(previewPhoto.id) || importing === previewPhoto.id}
                    onClick={() => saveToLibrary(previewPhoto)}
                    className="flex-1 md:flex-none text-[10px] uppercase tracking-widest border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10 h-10 px-4"
                  >
                    {importing === previewPhoto.id ? (
                      <Loader2 className="size-3 mr-2 animate-spin" />
                    ) : importedIds.has(previewPhoto.id) ? (
                      <Check className="size-3 mr-2" />
                    ) : (
                      <Download className="size-3 mr-2" />
                    )}
                    Salvar no Acervo
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      onSelect(previewPhoto.src.large2x);
                      setPreviewPhoto(null);
                    }}
                    className="flex-1 md:flex-none text-[10px] uppercase tracking-widest bg-brand-gold text-brand-bg hover:bg-brand-gold/90 font-bold h-10 px-6"
                  >
                    Usar esta Imagem
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
