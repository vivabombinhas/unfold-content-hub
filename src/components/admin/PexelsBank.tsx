import { useState, useEffect } from "react";
import { Search, Loader2, X, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { searchPhotos, getCuratedPhotos, PexelsPhoto } from "@/lib/pexels";
import { toast } from "@/hooks/use-toast";

interface Props {
  onSelect: (url: string) => void;
}

export function PexelsBank({ onSelect }: Props) {
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchPhotos = async (query: string, p: number) => {
    setLoading(true);
    try {
      const data = query 
        ? await searchPhotos(query, p)
        : await getCuratedPhotos(p);
      
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
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchPhotos(search, 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPhotos(search, nextPage);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-gold/50" />
          <Input 
            placeholder="Buscar milhões de fotos profissionais (ex: skincare, clinic, luxury)..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-xs h-10 focus-visible:ring-brand-gold/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-6 pt-2">
        {loading && photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="size-8 text-brand-gold animate-spin" />
            <p className="text-xs text-brand-text-muted uppercase tracking-widest">Consultando Pexels...</p>
          </div>
        ) : photos.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div 
                  key={photo.id}
                  className="group relative aspect-square rounded-lg border border-white/5 bg-white/5 overflow-hidden cursor-pointer hover:border-brand-gold/50 transition-all shadow-xl"
                  onClick={() => onSelect(photo.src.large2x)}
                >
                  <img 
                    src={photo.src.medium} 
                    alt={photo.alt} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-black/90 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                    <p className="text-[8px] text-white/70 truncate">Foto por {photo.photographer}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center pb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadMore}
                disabled={loading}
                className="text-[10px] uppercase tracking-widest border-brand-gold/20 text-brand-gold hover:bg-brand-gold/10"
              >
                {loading ? <Loader2 className="size-3 mr-2 animate-spin" /> : null}
                Carregar mais fotos
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
            <X className="size-10 text-white/10" />
            <p className="text-sm text-brand-text-muted">Nenhuma imagem encontrada no Pexels.</p>
          </div>
        )}
      </ScrollArea>
      
      <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-brand-text-muted uppercase tracking-widest">Powered by</span>
          <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
            <img src="https://images.pexels.com/lib/api/pexels-white.png" alt="Pexels" className="h-3" />
          </a>
        </div>
        <p className="text-[8px] text-brand-text-muted uppercase tracking-widest">Imagens gratuitas de alta qualidade</p>
      </div>
    </div>
  );
}
