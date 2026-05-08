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
 import { Search, Library, Loader2, X } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Badge } from "@/components/ui/badge";
 
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
       <DialogContent className="max-w-4xl max-h-[90vh] bg-brand-black border-brand-gold/20 text-white flex flex-col p-0 overflow-hidden">
         <DialogHeader className="p-6 pb-2">
           <DialogTitle className="text-xl font-display italic text-brand-gold">Banco de Imagens Premium</DialogTitle>
           <div className="pt-4 flex flex-col md:flex-row gap-4">
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
         </DialogHeader>
 
         <ScrollArea className="flex-1 p-6 pt-2">
           {loading ? (
             <div className="flex flex-col items-center justify-center py-20 gap-3">
               <Loader2 className="size-8 text-brand-gold animate-spin" />
               <p className="text-xs text-brand-text-muted uppercase tracking-widest">Carregando acervo...</p>
             </div>
           ) : images.length > 0 ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
               {images.map((img) => (
                 <div 
                   key={img.id}
                   className="group relative aspect-square rounded-lg border border-white/5 bg-white/5 overflow-hidden cursor-pointer hover:border-brand-gold/50 transition-all shadow-xl"
                   onClick={() => {
                     onSelect(img.url);
                     setIsOpen(false);
                   }}
                 >
                   <img 
                     src={img.url} 
                     alt={img.title || ""} 
                     className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                     loading="lazy"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-brand-black/90 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                     <p className="text-[10px] font-bold text-white truncate">{img.title}</p>
                     <p className="text-[8px] text-brand-gold uppercase tracking-tighter">{img.category}</p>
                   </div>
                   {img.category && (
                     <Badge className="absolute top-2 right-2 bg-brand-gold/80 text-brand-bg text-[8px] h-4 hover:bg-brand-gold px-1.5 uppercase font-bold border-none">
                       {img.category}
                     </Badge>
                   )}
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
             {images.length} imagens disponíveis no acervo premium
           </p>
           <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white">
             Fechar
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 }