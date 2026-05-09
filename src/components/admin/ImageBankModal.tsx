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
 import { Search, Library, Loader2, X, Globe, Maximize2, Minimize2, Upload, Eye, Check } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImageAsset | null>(null);
 
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
        <DialogContent className="max-w-[1200px] w-[98vw] max-h-[98vh] h-[95vh] bg-brand-black border-brand-gold/20 text-white flex flex-col p-0 overflow-hidden">
          <Tabs defaultValue="internal" className="flex-1 flex flex-col overflow-hidden">
             <div className="px-4 md:px-6 pt-6 pb-2 border-b border-white/5 bg-brand-black/80 sticky top-0 z-30 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20">
                      <Library className="size-5 text-brand-gold" />
                    </div>
                    <DialogTitle className="text-xl md:text-2xl font-display italic text-brand-gold">Biblioteca de Mídia</DialogTitle>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
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
                        variant="outline"
                        size="sm"
                        className="h-9 text-[10px] uppercase tracking-widest border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10 cursor-pointer"
                      >
                        <label htmlFor="image-upload">
                          {uploading ? (
                            <Loader2 className="size-3.5 mr-2 animate-spin" />
                          ) : (
                            <Upload className="size-3.5 mr-2" />
                          )}
                          Enviar Foto
                        </label>
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')}
                      className={`size-9 border border-white/5 ${fitMode === 'contain' ? 'text-brand-gold bg-brand-gold/10 border-brand-gold/20' : 'text-white/50'}`}
                      title={fitMode === 'cover' ? "Ver imagem inteira" : "Preencher espaço"}
                    >
                      {fitMode === 'cover' ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center mb-2">
                <TabsList className="bg-white/5 border border-white/10 p-1">
                  <TabsTrigger value="internal" className="text-[10px] uppercase tracking-widest data-[state=active]:bg-brand-gold data-[state=active]:text-brand-bg">
                    <Library className="size-3 mr-2" />
                    Acervo Interno
                  </TabsTrigger>
                  <TabsTrigger value="external" className="text-[9px] md:text-[10px] uppercase tracking-widest data-[state=active]:bg-brand-gold data-[state=active]:text-brand-bg relative px-2 md:px-4">
                    <Globe className="size-3 mr-1.5 md:mr-2" />
                    Banco Externo (Pexels)
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-gold"></span>
                    </span>
                  </TabsTrigger>
                </TabsList>
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
                        className="group relative flex flex-col rounded-xl border border-white/5 bg-white/5 overflow-hidden hover:border-brand-gold/50 transition-all shadow-xl"
                      >
                        <div 
                          className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                          onClick={() => setPreviewImage(img)}
                        >
                          <div className="w-full h-full bg-black/20">
                            <img 
                              src={img.url} 
                              alt={img.title || ""} 
                              className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain p-2'} transition-all duration-700 ${fitMode === 'cover' ? 'group-hover:scale-110' : ''}`}
                              loading="lazy"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                              <div className="size-8 rounded-full bg-brand-gold/20 backdrop-blur-md flex items-center justify-center border border-brand-gold/30">
                                <Eye className="size-4 text-brand-gold" />
                              </div>
                              <span className="text-[8px] text-brand-gold uppercase tracking-widest font-bold">Ver</span>
                            </div>
                          </div>
                          {img.category && (
                            <Badge className="absolute top-2 right-2 bg-brand-gold/90 text-brand-bg text-[8px] h-4 hover:bg-brand-gold px-2 uppercase font-bold border-none">
                              {img.category}
                            </Badge>
                          )}
                        </div>
                        <div className="p-2 border-t border-white/5 bg-brand-black/40">
                          <Button 
                            onClick={() => {
                              onSelect(img.url);
                              setIsOpen(false);
                            }}
                            className="w-full h-7 text-[9px] uppercase tracking-[0.1em] bg-brand-gold text-brand-bg hover:bg-brand-gold/90 font-bold"
                          >
                            Selecionar
                          </Button>
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

          {/* Internal Preview Dialog */}
          <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
            <DialogContent className="max-w-3xl border-brand-gold/20 bg-brand-bg p-0 overflow-hidden shadow-2xl z-[100]">
              <DialogHeader className="p-4 border-b border-white/5 bg-brand-black/40">
                <DialogTitle className="text-sm font-display italic text-brand-gold flex items-center justify-between">
                  <span>Visualização de Imagem Interna</span>
                  <span className="text-[10px] text-brand-text-muted uppercase tracking-widest font-sans not-italic">
                    {previewImage?.category}
                  </span>
                </DialogTitle>
              </DialogHeader>
              
              {previewImage && (
                <div className="flex flex-col h-[70vh] md:h-auto">
                  <div className="flex-1 relative overflow-hidden bg-black/60 min-h-[300px] flex items-center justify-center p-4 md:p-8">
                    <img 
                      src={previewImage.url} 
                      alt={previewImage.title || ""}
                      className="max-w-full max-h-[50vh] object-contain shadow-2xl rounded-lg"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white rounded-full z-10"
                      onClick={() => setPreviewImage(null)}
                    >
                      <X className="size-5" />
                    </Button>
                  </div>
                  <div className="p-4 md:p-6 bg-brand-black/90 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 text-center md:text-left">
                      <p className="text-sm text-white/90 italic font-display">{previewImage.title || "Imagem sem título"}</p>
                      <div className="flex flex-wrap justify-center md:justify-start gap-1 mt-2">
                        {previewImage.tags?.map(tag => (
                          <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded border border-white/10 text-white/40 uppercase tracking-widest">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setPreviewImage(null)}
                        className="flex-1 md:flex-none text-[10px] uppercase tracking-widest border-white/10 text-white/50 hover:text-white h-10 px-4"
                      >
                        Fechar
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          onSelect(previewImage.url);
                          setPreviewImage(null);
                          setIsOpen(false);
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
       </DialogContent>
     </Dialog>
   );
 }