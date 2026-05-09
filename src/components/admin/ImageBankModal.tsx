 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Search, Library, Loader2, X, Globe, Maximize2, Minimize2 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { PexelsBank } from "./PexelsBank";
 
 interface ImageAsset {
   id: string;
   url: string;
   title: string | null;
   category: string | null;
   tags: string[] | null;
 }
 
 interface Props {
   onSelect: (url: string) => void;
 }
 
 export function ImageBankModal({ onSelect }: Props) {
   const [isOpen, setIsOpen] = useState(false);
   const [images, setImages] = useState<ImageAsset[]>([]);
   const [loading, setLoading] = useState(false);
   const [search, setSearch] = useState("");
   const [category, setCategory] = useState<string | null>(null);
   const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
 
   const fetchImages = async () => {
     setLoading(true);
     let query = supabase.from("image_bank").select("*");
     
     if (search) {
       query = query.or(`title.ilike.%${search}%,category.ilike.%${search}%`);
     }
     
     if (category) {
       query = query.eq("category", category);
     }
 
     const { data, error } = await query.order("created_at", { ascending: false });
     
     if (!error && data) {
       setImages(data);
     }
     setLoading(false);
   };
 
   useEffect(() => {
     if (isOpen) {
       fetchImages();
     }
   }, [isOpen, search, category]);
 
   const categories = Array.from(new Set(images.map(img => img.category).filter(Boolean))) as string[];
 
   return (
     <Dialog open={isOpen} onOpenChange={setIsOpen}>
       <DialogTrigger asChild>
         <Button 
           type="button" 
           size="sm" 
           variant="outline" 
           className="h-8 text-[11px] border-brand-gold/20 hover:bg-brand-gold/10"
         >
           <Library className="size-3.5 mr-1.5" />
           Banco de Imagens
         </Button>
       </DialogTrigger>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] h-[85vh] bg-brand-black border-brand-gold/20 text-white flex flex-col p-0 overflow-hidden sm:w-full">
          <Tabs defaultValue="internal" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-6 border-b border-white/5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                <div className="flex items-center justify-between w-full lg:w-auto">
                  <DialogTitle className="text-xl font-display italic text-brand-gold">Biblioteca de Mídia</DialogTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')}
                    className={`lg:hidden size-8 ${fitMode === 'contain' ? 'text-brand-gold bg-brand-gold/10' : 'text-white/50'}`}
                    title={fitMode === 'cover' ? "Ajustar Imagens" : "Preencher Imagens"}
                  >
                    {fitMode === 'cover' ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
                  </Button>
                </div>
                <TabsList className="bg-white/5 border border-white/10 p-1">
                  <TabsTrigger value="internal" className="text-[10px] uppercase tracking-widest data-[state=active]:bg-brand-gold data-[state=active]:text-brand-bg">
                    <Library className="size-3 mr-2" />
                    Acervo Interno
                  </TabsTrigger>
                  <TabsTrigger value="external" className="text-[10px] uppercase tracking-widest data-[state=active]:bg-brand-gold data-[state=active]:text-brand-bg relative">
                    <Globe className="size-3 mr-2" />
                    Banco Externo (Pexels)
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-gold"></span>
                    </span>
                  </TabsTrigger>
                </TabsList>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')}
                  className={`hidden lg:flex size-9 ${fitMode === 'contain' ? 'text-brand-gold bg-brand-gold/10' : 'text-white/50'}`}
                  title={fitMode === 'cover' ? "Mudar para Ajustar (Contain)" : "Mudar para Preencher (Cover)"}
                >
                  {fitMode === 'cover' ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
                </Button>
              </div>
            </div>

            <TabsContent value="internal" className="flex-1 flex flex-col overflow-hidden m-0">
              <div className="p-6 pb-2">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-gold/50" />
                    <Input 
                      placeholder="Buscar por procedimento ou nome..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-xs h-10 focus-visible:ring-brand-gold/50"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <Button 
                      variant={category === null ? "secondary" : "outline"} 
                      size="sm" 
                      onClick={() => setCategory(null)}
                      className={cn(
                        "h-9 text-[10px] uppercase tracking-widest",
                        category === null ? "bg-brand-gold text-brand-bg" : "border-brand-gold/20 text-brand-gold"
                      )}
                    >
                      Todos
                    </Button>
                    {categories.map(cat => (
                      <Button 
                        key={cat}
                        variant={category === cat ? "secondary" : "outline"} 
                        size="sm" 
                        onClick={() => setCategory(cat)}
                        className={cn(
                          "h-9 text-[10px] uppercase tracking-widest whitespace-nowrap",
                          category === cat ? "bg-brand-gold text-brand-bg" : "border-brand-gold/20 text-brand-gold"
                        )}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-6 pt-2">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="size-8 text-brand-gold animate-spin" />
                    <p className="text-xs text-brand-text-muted uppercase tracking-widest">Carregando acervo...</p>
                  </div>
                ) : images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {images.map((img) => (
                      <div 
                        key={img.id}
                        className="group relative flex flex-col rounded-xl border border-white/5 bg-white/5 overflow-hidden cursor-pointer hover:border-brand-gold/50 transition-all shadow-xl"
                        onClick={() => {
                          onSelect(img.url);
                          setIsOpen(false);
                        }}
                      >
                        <div className="relative aspect-[3/4] overflow-hidden">
                          <div className="w-full h-full bg-black/20">
                            <img 
                              src={img.url} 
                              alt={img.title || ""} 
                              className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'} transition-all duration-700 ${fitMode === 'cover' ? 'group-hover:scale-110' : ''}`}
                              loading="lazy"
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-brand-black/90 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                            <p className="text-[10px] font-bold text-white truncate">{img.title}</p>
                            <p className="text-[8px] text-brand-gold uppercase tracking-widest mt-1">{img.category}</p>
                          </div>
                          {img.category && (
                            <Badge className="absolute top-2 right-2 bg-brand-gold/90 text-brand-bg text-[8px] h-4 hover:bg-brand-gold px-2 uppercase font-bold border-none">
                              {img.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
                    <X className="size-10 text-white/10" />
                    <p className="text-sm text-brand-text-muted">Nenhuma imagem encontrada para os filtros selecionados.</p>
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-white/5 flex justify-between items-center bg-white/[0.02]">
                <p className="text-[10px] text-brand-text-muted uppercase tracking-widest">
                  {images.length} imagens disponíveis no acervo interno
                </p>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white">
                  Fechar
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="external" className="flex-1 flex flex-col overflow-hidden m-0">
               <PexelsBank 
                 externalFitMode={fitMode}
                 onSelect={(url) => {
                   onSelect(url);
                   setIsOpen(false);
                 }} 
               />
            </TabsContent>
          </Tabs>
       </DialogContent>
     </Dialog>
   );
 }