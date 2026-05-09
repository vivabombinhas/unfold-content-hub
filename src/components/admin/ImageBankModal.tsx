  import { useState, useEffect, useCallback, useRef } from "react";
  import { createPortal } from "react-dom";
 import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
  import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
   import { Search, Library, Loader2, X, Globe, Maximize2, Minimize2, Upload, Eye, Check, Filter, Image as ImageIcon, Info, ChevronRight, MousePointer2, ExternalLink, Download, Star } from "lucide-react";
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
    isolateKeyboardEvents?: boolean;
  }
 
   export function ImageBankModal({ onSelect, trigger, isolateKeyboardEvents = false }: Props & { trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
   const [images, setImages] = useState<ImageAsset[]>([]);
   const [loading, setLoading] = useState(false);
     const [search, setSearch] = useState("");
     const [debouncedSearch, setDebouncedSearch] = useState("");
    const [category, setCategory] = useState<string | null>(null);
    const [onlyHero, setOnlyHero] = useState(false);
   const [columns, setColumns] = useState<2 | 4>(4);
   const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
    const [uploading, setUploading] = useState(false);
    const [focusedImage, setFocusedImage] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<"internal" | "external">("internal");
 
   const fetchImages = async () => {
     setLoading(true);
     let query = supabase.from("image_bank").select("*");
     
     if (search) {
       query = query.or(`title.ilike.%${search}%,category.ilike.%${search}%`);
     }
     
      if (category) {
        query = query.eq("category", category);
      }

      if (onlyHero) {
        query = query.ilike("title", "%hero%");
      }
 
     const { data, error } = await query.order("created_at", { ascending: false });
     
     if (!error && data) {
       setImages(data);
     }
     setLoading(false);
   };
 
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearch(search);
      }, 400);
      return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
      if (isOpen && activeTab === "internal") {
        fetchImages();
      }
    }, [isOpen, debouncedSearch, category, onlyHero, activeTab]);

    const close = useCallback(() => setIsOpen(false), []);
    const select = useCallback((url: string) => {
      onSelect(url);
      setIsOpen(false);
    }, [onSelect]);

    useEffect(() => {
      if (!isOpen) return;
      
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isolateKeyboardEvents) {
          if (e.key === "Escape") close();
          if (e.key === "Enter" && focusedImage) select(focusedImage.url);
          return;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          if (isolateKeyboardEvents) e.stopImmediatePropagation();
          close();
          return;
        }

        if (e.key === "Enter" && focusedImage && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          if (isolateKeyboardEvents) e.stopImmediatePropagation();
          select(focusedImage.url);
        }
      };
      window.addEventListener("keydown", handleKeyDown, isolateKeyboardEvents);
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", handleKeyDown, isolateKeyboardEvents);
        document.body.style.overflow = "";
        clearTimeout(timer);
      };
    }, [isOpen, focusedImage, close, select, isolateKeyboardEvents]);
 
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `bank/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('image_bank').insert({
        url: publicUrl,
        title: file.name.split('.')[0],
        category: 'Uploads',
        tags: ['manual']
      });

      if (dbError) throw dbError;

      fetchImages();
      toast({
        title: "Sucesso!",
        description: "Imagem enviada para o seu acervo.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar a imagem.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

   const categories = Array.from(new Set(images.map(img => img.category).filter(Boolean))) as string[];
 
   return (
     <>
       {trigger ? (
         <div onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}>{trigger}</div>
       ) : (
         <Button 
           type="button" 
           size="sm" 
           variant="outline" 
           onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
           className="h-8 text-[11px] border-brand-gold/20 hover:bg-brand-gold/10"
         >
           <Library className="size-3.5 mr-1.5" />
           Banco de Imagens
         </Button>
       )}

         {isOpen && createPortal(
           <div 
             className="fixed inset-0 z-[99999] bg-brand-black text-white flex flex-col overflow-hidden animate-in fade-in duration-300"
             style={{ pointerEvents: 'auto' }}
             onClick={(e) => {
               e.stopPropagation();
             }}
             onMouseDown={(e) => e.stopPropagation()}
             onKeyDown={(e) => {
               // No need to stop propagation here unless we want to block GLOBAL listeners
               // But we want to ensure typing works.
               if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                 e.stopPropagation();
               }
             }}
           >
            {/* Header / Top Bar: Search, Tabs, Actions */}
            <div className="h-20 shrink-0 border-b border-white/10 bg-brand-black/95 flex items-center justify-between px-8 backdrop-blur-md z-50">
              <div className="flex items-center gap-8 flex-1">
                <div className="flex items-center gap-4 shrink-0">
                  <div className="size-10 rounded-xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20">
                    <Library className="size-5 text-brand-gold" />
                  </div>
                  <div className="hidden xl:block">
                    <h2 className="text-lg font-display italic text-brand-gold tracking-tight">Media Library</h2>
                    <p className="text-[9px] text-brand-text-muted uppercase tracking-widest font-sans not-italic">Premium Assets</p>
                  </div>
                </div>

                {/* SEARCH IN TOP BAR */}
                <div className="relative group max-w-md w-full">
                      <div 
                        className="relative w-full"
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-brand-gold/40 group-focus-within:text-brand-gold transition-colors" />
                       <input 
                         ref={searchInputRef}
                         placeholder={activeTab === 'internal' ? "Pesquisar no seu acervo..." : "Explorar fotos no Pexels..."} 
                         value={search}
                         onChange={(e) => setSearch(e.target.value)}
                         onKeyDown={(e) => {
                           e.stopPropagation();
                           if (e.key === "Enter") {
                             setDebouncedSearch(search);
                             if (activeTab === "internal") fetchImages();
                           }
                         }}
                         onFocus={(e) => e.stopPropagation()}
                         className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-3 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:bg-white/10 text-white relative z-[100001]"
                         autoFocus
                       />
                      </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("internal")}
                    className={cn(
                      "h-9 px-6 text-[11px] uppercase tracking-widest transition-all rounded-lg",
                      activeTab === "internal" ? "bg-brand-gold text-brand-bg font-bold shadow-lg" : "text-white/60 hover:text-white"
                    )}
                  >
                    Acervo Interno
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("external")}
                    className={cn(
                      "h-9 px-6 text-[11px] uppercase tracking-widest transition-all rounded-lg",
                      activeTab === "external" ? "bg-brand-gold text-brand-bg font-bold shadow-lg" : "text-white/60 hover:text-white"
                    )}
                  >
                    Pexels Global
                  </Button>
                </div>

                <div className="h-10 w-px bg-white/10" />

                <div className="flex items-center gap-3">
                   <input
                     type="file"
                     id="image-upload"
                     className="hidden"
                     accept="image/*"
                     onChange={handleUpload}
                     disabled={uploading}
                   />
                   <Button
                     asChild
                     variant="ghost"
                     size="sm"
                     className="h-9 text-[11px] uppercase tracking-widest text-white/60 hover:text-brand-gold hover:bg-brand-gold/10 cursor-pointer px-4"
                   >
                    <label htmlFor="image-upload" className="flex items-center gap-2">
                       {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                       Upload
                     </label>
                   </Button>

                   <Button
                    variant="ghost"
                    size="icon"
                    onClick={close}
                    className="size-9 rounded-xl hover:bg-white/10 text-white/60 hover:text-white"
                   >
                    <X className="size-5" />
                   </Button>
                </div>
              </div>
            </div>

            {/* Main Content: 3 Columns - Ensure minimum height for children */}
            <div className="flex-1 flex min-h-0 overflow-hidden bg-[#0a0a0a] isolate">
              {/* LEFT SIDEBAR: Categories & Visualization */}
              <aside className="w-64 shrink-0 border-r border-white/10 flex flex-col bg-brand-black/40 overflow-hidden">
                <div className="p-6 space-y-10">
                  {/* Categories */}
                  {activeTab === 'internal' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-brand-gold/60 font-bold">Categorias</label>
                        <Filter className="size-3 text-brand-gold/40" />
                      </div>
                      <ScrollArea className="h-full w-full">
                        <div className="space-y-1.5 pr-4 p-1 pb-10">
                            <Button 
                              variant="ghost" 
                              onClick={() => {
                                setCategory(null);
                                setOnlyHero(false);
                              }}
                              className={cn(
                                "w-full justify-start h-10 text-[11px] uppercase tracking-widest rounded-xl px-4",
                                category === null && !onlyHero ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/20" : "text-white/50 hover:text-white hover:bg-white/5"
                              )}
                            >
                              <ImageIcon className="size-3.5 mr-3 opacity-60" />
                              Todas as Fotos
                            </Button>
                            
                            <Button 
                              variant="ghost" 
                              onClick={() => {
                                setCategory(null);
                                setOnlyHero(true);
                              }}
                              className={cn(
                                "w-full justify-start h-10 text-[11px] uppercase tracking-widest rounded-xl px-4",
                                onlyHero ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/20" : "text-white/50 hover:text-white hover:bg-white/5"
                              )}
                            >
                              <Star className="size-3.5 mr-3 opacity-60" />
                              Sugestões Hero
                            </Button>
                          {categories.map(cat => (
                            <Button 
                              key={cat}
                              variant="ghost" 
                              onClick={() => setCategory(cat)}
                              className={cn(
                                "w-full justify-start h-10 text-[11px] uppercase tracking-widest rounded-xl px-4",
                                category === cat ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/20" : "text-white/50 hover:text-white hover:bg-white/5"
                              )}
                            >
                              <ChevronRight className="size-3.5 mr-3 opacity-60" />
                              {cat}
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Visualization Options */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-brand-gold/60 font-bold ml-1">Visualização</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setFitMode('cover')}
                        className={cn(
                          "h-12 flex flex-col gap-1 rounded-xl border",
                          fitMode === 'cover' ? "border-brand-gold/30 bg-brand-gold/5 text-brand-gold" : "border-white/5 text-white/40 hover:bg-white/5"
                        )}
                      >
                        <Maximize2 className="size-4" />
                        <span className="text-[8px] uppercase tracking-widest font-bold">Preencher</span>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setFitMode('contain')}
                        className={cn(
                          "h-12 flex flex-col gap-1 rounded-xl border",
                          fitMode === 'contain' ? "border-brand-gold/30 bg-brand-gold/5 text-brand-gold" : "border-white/5 text-white/40 hover:bg-white/5"
                        )}
                      >
                        <Minimize2 className="size-4" />
                        <span className="text-[8px] uppercase tracking-widest font-bold">Inteira</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-auto p-6 bg-brand-black/60 border-t border-white/10">
                  <div className="flex items-center gap-3 text-white/30">
                    <MousePointer2 className="size-4" />
                    <span className="text-[9px] uppercase tracking-[0.2em]">Double click para escolher</span>
                  </div>
                </div>
              </aside>

              {/* MAIN CENTER: Image Grid - Use standard overflow for reliability */}
              <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative isolate">
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 py-10 custom-scrollbar-premium pointer-events-auto">
                  {activeTab === 'internal' ? (
                    loading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-brand-black/20 backdrop-blur-sm z-10">
                        <Loader2 className="size-10 text-brand-gold animate-spin" />
                        <p className="text-sm text-brand-gold uppercase tracking-[0.3em] font-light animate-pulse">Carregando Acervo Premium...</p>
                      </div>
                    ) : images.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-20">
                        {images.map((img) => (
                          <div 
                            key={img.id}
                             onDoubleClick={() => select(img.url)}
                            onClick={() => setFocusedImage(img)}
                            className={cn(
                              "group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 shadow-2xl bg-brand-black/40",
                              focusedImage?.id === img.id ? "ring-2 ring-brand-gold scale-[0.98] z-10" : "hover:scale-[1.02] hover:shadow-brand-gold/10"
                            )}
                          >
                            <div className="aspect-[3/4] overflow-hidden relative">
                              <img 
                                src={img.url} 
                                alt={img.title || ""} 
                                className={cn(
                                  "w-full h-full transition-all duration-1000",
                                  fitMode === 'cover' ? 'object-cover' : 'object-contain p-4 bg-white/5',
                                  focusedImage?.id === img.id ? "scale-105 contrast-110" : "group-hover:scale-110"
                                )}
                                loading="lazy"
                              />
                              {/* Overlay on select/hover */}
                              <div className={cn(
                                "absolute inset-0 transition-opacity duration-300 flex flex-col items-center justify-center gap-3",
                                focusedImage?.id === img.id ? "bg-brand-gold/10 opacity-100" : "bg-black/40 opacity-0 group-hover:opacity-100"
                              )}>
                                <div className="size-10 rounded-full bg-brand-gold text-brand-bg flex items-center justify-center shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-300">
                                  <Check className="size-5" />
                                </div>
                              </div>
                            </div>
                            {img.title && (
                              <div className="p-3 bg-brand-black/80 backdrop-blur-md border-t border-white/5">
                                <p className="text-[10px] text-white/60 truncate uppercase tracking-widest font-medium">{img.title}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                        <ImageIcon className="size-16" />
                        <p className="text-sm font-light uppercase tracking-[0.2em]">Nenhuma imagem encontrada</p>
                      </div>
                    )
                   ) : (
                        <PexelsBank 
                          externalFitMode={fitMode}
                          searchQuery={debouncedSearch}
                          onFocusImage={setFocusedImage}
                          onSelect={select} 
                        />
                   )}
                </div>
              </main>

              {/* RIGHT SIDEBAR: Selection Preview & Metadata */}
              <aside className="w-80 shrink-0 border-l border-white/10 bg-brand-black flex flex-col shadow-2xl z-40 overflow-hidden">
                {focusedImage ? (
                  <div className="flex flex-col h-full animate-in slide-in-from-right duration-500">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-brand-black/40">
                      <div className="flex items-center gap-2">
                        <Info className="size-4 text-brand-gold" />
                        <h3 className="text-xs font-display italic text-brand-gold">Detalhes do Arquivo</h3>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setFocusedImage(null)} className="size-8 rounded-lg text-white/30 hover:text-white">
                        <X className="size-4" />
                      </Button>
                    </div>

                    <ScrollArea className="flex-1 p-6">
                      <div className="space-y-8">
                        {/* Big Preview */}
                        <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl aspect-video relative group">
                          <img 
                            src={focusedImage.url} 
                            className="w-full h-full object-cover"
                            alt="Preview"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="outline" className="text-[10px] uppercase tracking-widest border-brand-gold/50 text-brand-gold hover:bg-brand-gold/10" onClick={() => window.open(focusedImage.url, '_blank')}>
                              <ExternalLink className="size-3 mr-2" />
                              Ver Original
                            </Button>
                          </div>
                        </div>

                        {/* Metadata grid */}
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">Título / Nome</p>
                            <p className="text-sm text-white italic font-display">{focusedImage.title || "Sem título"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">Categoria</p>
                            <Badge variant="outline" className="bg-brand-gold/5 border-brand-gold/20 text-brand-gold text-[10px] uppercase tracking-widest px-3 py-1">
                              {focusedImage.category || "Geral"}
                            </Badge>
                          </div>
                          {focusedImage.photographer && (
                            <div className="space-y-1">
                              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">Créditos</p>
                              <p className="text-xs text-white/60">@{focusedImage.photographer}</p>
                            </div>
                          )}
                          {focusedImage.tags && focusedImage.tags.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">Tags Relacionadas</p>
                              <div className="flex flex-wrap gap-1.5">
                                {focusedImage.tags.map(tag => (
                                  <span key={tag} className="text-[9px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 uppercase tracking-widest">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>

                    {/* Action Buttons */}
                    <div className="p-6 border-t border-white/10 space-y-3 bg-brand-black/95">
                      {focusedImage.onSave && !focusedImage.isImported && (
                        <Button 
                          onClick={focusedImage.onSave}
                          disabled={focusedImage.importing}
                          variant="outline"
                          className="w-full h-12 border-brand-gold/30 text-brand-gold hover:bg-brand-gold/5 text-[10px] uppercase tracking-[0.15em] rounded-xl"
                        >
                          {focusedImage.importing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Download className="size-4 mr-2" />}
                          Salvar no Acervo
                        </Button>
                      )}
                      
                        <Button 
                          onClick={() => select(focusedImage.url)}
                          className="w-full h-14 bg-brand-gold text-brand-bg hover:bg-brand-gold/90 text-xs uppercase tracking-[0.2em] font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Usar no Hero
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => select(focusedImage.url)}
                          className="w-full h-12 border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-[10px] uppercase tracking-[0.15em] rounded-xl"
                        >
                          Usar no Bloco
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-20">
                      <div className="size-20 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
                        <MousePointer2 className="size-8" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] font-bold">Nenhuma seleção</p>
                        <p className="text-[10px] mt-2 leading-relaxed">Clique em uma imagem para ver os detalhes e opções de uso.</p>
                      </div>
                    </div>
                  )}
                </aside>
              </div>

              {/* Bottom Status Bar */}
              <footer className="h-10 shrink-0 border-t border-white/10 bg-brand-black/90 px-6 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-white/30 z-50">
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Banco de dados conectado
                  </span>
                  <span>{images.length} imagens no acervo</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>ESC para fechar</span>
                  <span>ENTER para confirmar</span>
                </div>
              </footer>
         </div>,
         document.body
       )}
     </>
   );
 }